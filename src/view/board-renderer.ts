import {
  App,
  debounce,
  MarkdownRenderChild,
  MarkdownSectionInformation,
  Notice,
  TAbstractFile,
  TFile
} from "obsidian";
import { writeBoardConfig } from "../core/board-writer";
import { collectTasks, resolveFolder } from "../core/task-repository";
import {
  clearFields,
  createTask,
  setDue,
  setField,
  setPriority,
  setStatus,
  setStatusBatch,
  setTags,
  trashTasks,
  writeOrder
} from "../core/task-mutations";
import {
  ensureBoardFolders,
  ensureFolder,
  folderForStatus,
  sanitizeName
} from "../core/folder-sync";
import { migrateStatuses } from "../core/status-migration";
import { migrateTags } from "../core/tag-migration";
import { t } from "../i18n";
import {
  allStatuses,
  BoardConfig,
  serializeBoardConfig,
  visibleColumns
} from "../model/board-config";
import {
  clampColumnWidth,
  COLUMN_VARIABLE,
  fitColumnWidth,
  isSizable,
  normalizeColumns,
  RowEditResult
} from "../model/columns";
import { BoardField } from "../model/field";
import { PriorityKey } from "../model/priority";
import { defaultSearch, filterGroups, SearchState } from "../model/search";
import { findStatus, Status } from "../model/status";
import { TAG_PALETTE } from "../model/tag";
import { TaskGroup, TaskItem } from "../model/task";
import { SettingsStore } from "../settings";
import { ConfirmModal } from "../ui/confirm-modal";
import { StatusEditResult } from "../ui/status-panel";
import { TagEditResult } from "../ui/tag-panel";
import { BoardHost } from "./board-host";
import { renderColumnHead } from "./column-head";
import { DragController } from "./drag-controller";
import { renderArchive, renderGroup } from "./group";
import { renderNote, renderTitleBar } from "./title-bar";
import { renderToolbar } from "./toolbar";

export class BoardRenderer extends MarkdownRenderChild implements BoardHost {
  groups: TaskGroup[] = [];
  pendingAdd: string | null = null;

  private readonly drag = new DragController(this);
  private readonly selection = new Set<string>();
  private anchor: string | null = null;
  private searchState: SearchState = defaultSearch();
  private queue: Promise<void> = Promise.resolve();

  private readonly scheduleRender = debounce(() => this.render(), 50, true);

  boardPath: string;

  constructor(
    container: HTMLElement,
    readonly app: App,
    readonly store: SettingsStore,
    readonly config: BoardConfig,
    private baseline: string,
    boardPath: string,
    private readonly locate: () => MarkdownSectionInformation | null,
    private readonly onWrite: (data: string) => void = () => undefined
  ) {
    super(container);
    this.boardPath = boardPath;
  }

  private async write(): Promise<void> {
    const data = await writeBoardConfig(
      this.app,
      this.boardPath,
      this.locate(),
      this.config,
      this.baseline
    );
    this.baseline = serializeBoardConfig(this.config).replace(/\n$/, "");
    this.onWrite(data);
  }

  updateConfig(change: (config: BoardConfig) => void): void {
    change(this.config);
    this.run(() => this.write());
  }

  changeFolder(folder: string): void {
    const next = folder.replace(/^\/+|\/+$/g, "");
    if (next === this.config.folder) return;

    this.config.folder = next;
    this.run(async () => {
      await ensureBoardFolders(this.app.vault, this.config);
      await this.write();
    });
    this.scheduleRender();
  }

  private followRename(file: TAbstractFile, oldPath: string): boolean {
    if (oldPath === this.boardPath) {
      this.boardPath = file.path;
      return true;
    }

    const folder = this.config.folder;
    if (folder.length === 0) return false;
    if (oldPath !== folder && !folder.startsWith(`${oldPath}/`)) return false;

    this.config.folder = `${file.path}${folder.slice(oldPath.length)}`;
    this.run(() => this.write());
    return true;
  }

  applyStatuses(result: StatusEditResult): void {
    const before: BoardConfig = {
      ...this.config,
      statuses: this.config.statuses.map((status) => ({ ...status })),
      archive: { ...this.config.archive },
      unassigned: { ...this.config.unassigned }
    };

    const files = new Map<string, TFile[]>();
    for (const group of this.groups) {
      files.set(
        group.status.name,
        group.tasks.filter((task) => !task.unknown).map((task) => task.file)
      );
    }

    this.config.statuses = result.statuses.map((status) => ({ ...status }));
    this.config.archive = { ...result.archive };
    this.config.unassigned = { ...result.unassigned };
    this.config.unassignedIndex = result.unassignedIndex;

    this.run(async () => {
      await migrateStatuses(this.app, before, this.config, result.migration, (statusName) => [
        ...(files.get(statusName) ?? [])
      ]);
      await ensureBoardFolders(this.app.vault, this.config);
      await this.write();
    });
  }

  boardTitle(): string {
    const file = this.app.vault.getAbstractFileByPath(this.boardPath);
    return file instanceof TFile ? file.basename : this.boardPath;
  }

  renameBoard(name: string): void {
    const next = sanitizeName(name);
    const file = this.app.vault.getAbstractFileByPath(this.boardPath);
    if (next.length === 0 || !(file instanceof TFile) || next === file.basename) return;

    const parent = file.parent === null || file.parent.isRoot() ? "" : `${file.parent.path}/`;
    this.run(() => this.app.fileManager.renameFile(file, `${parent}${next}.md`));
  }

  addStatus(name: string, color: string): void {
    const trimmed = name.trim();
    if (trimmed.length === 0) return;

    if (findStatus(allStatuses(this.config), trimmed) !== null) {
      new Notice(t("DUPLICATE_STATUS", { name: trimmed }));
      return;
    }

    this.config.statuses.push({ name: trimmed, color });

    this.run(async () => {
      await ensureFolder(this.app.vault, folderForStatus(this.config, trimmed));
      await this.write();
    });
  }

  onload(): void {
    this.register(this.store.onSettingsChange(() => this.scheduleRender()));

    this.registerEvent(
      this.app.metadataCache.on("changed", (file) => {
        if (this.affects(file)) this.scheduleRender();
      })
    );
    this.registerEvent(
      this.app.vault.on("create", (file) => {
        if (this.affects(file)) this.scheduleRender();
      })
    );
    this.registerEvent(
      this.app.vault.on("delete", (file) => {
        if (this.affects(file)) this.scheduleRender();
      })
    );
    this.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => {
        if (this.followRename(file, oldPath)) this.scheduleRender();
        else if (this.affects(file) || this.isInside(oldPath)) this.scheduleRender();
      })
    );

    this.render();
  }

  onunload(): void {
    this.drag.destroy();
    this.containerEl.empty();
  }

  private isInside(path: string): boolean {
    if (this.config.folder.length === 0) return true;
    return path.startsWith(`${this.config.folder}/`);
  }

  // The list note usually sits beside its task folder, not inside it.
  private affects(file: TAbstractFile): boolean {
    return file.path === this.boardPath || this.isInside(file.path);
  }

  private render(): void {
    try {
      this.draw();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.containerEl.empty();
      this.containerEl.createDiv({ cls: "tl-board" }).createDiv({
        cls: "tl-error",
        text: t("FAILED", { message })
      });
    }
  }

  private draw(): void {
    this.containerEl.empty();
    const root = this.containerEl.createDiv({ cls: "tl-board" });
    // Re-fitted: a narrow pane must not squeeze out the name.
    const available = root.clientWidth;
    const count = visibleColumns(this.config).filter(isSizable).length;
    const saved = this.columnWidth();
    const width = available > 0 ? fitColumnWidth(saved, count, available) : saved;
    root.style.setProperty(COLUMN_VARIABLE, `${width}px`);

    this.groups = filterGroups(
      collectTasks(this.app, this.config, this.boardPath),
      this.searchState
    );
    this.pruneSelection();

    renderTitleBar(root, this);
    renderNote(root, this);
    renderToolbar(root, this);

    if (resolveFolder(this.app, this.config.folder) === null) {
      this.renderMissingFolder(root);
      return;
    }

    const visible = this.groups.reduce(
      (total, group) => (group.isArchive ? total : total + group.tasks.length),
      0
    );
    if (visible === 0) {
      const empty = root.createDiv({ cls: "tl-empty" });
      empty.createEl("h4", { text: t("EMPTY_TITLE") });
      empty.createEl("p", { text: t("EMPTY_BODY") });
    }

    const frame = root.createDiv({ cls: "tl-frame" });
    renderColumnHead(frame, this);
    for (const group of this.groups) {
      if (group.isArchive) continue;
      renderGroup(frame, this, this.drag, group);
    }

    const archive = this.groups[this.groups.length - 1];
    if (archive.isArchive) renderArchive(frame, this, this.drag, archive);
  }

  private renderMissingFolder(root: HTMLElement): void {
    const box = root.createDiv({ cls: "tl-empty" });
    box.createEl("p", { text: t("FOLDER_MISSING", { folder: this.config.folder }) });

    const button = box.createEl("button", { cls: "tl-btn", text: t("CREATE_FOLDER") });
    button.addEventListener("click", () => {
      this.run(() => ensureBoardFolders(this.app.vault, this.config));
    });
  }

  private run(work: () => Promise<void>): void {
    this.queue = this.queue
      .then(work)
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        new Notice(t("FAILED", { message }));
      })
      .then(() => {
        this.scheduleRender();
      });
  }

  private collapsedNames(): string[] {
    return this.store.settings.collapsed[this.boardPath] ?? [];
  }

  isCollapsed(statusName: string): boolean {
    return this.collapsedNames().includes(statusName);
  }

  setCollapsed(statusName: string, collapsed: boolean): void {
    const names = this.collapsedNames().filter((name) => name !== statusName);
    if (collapsed) names.push(statusName);

    if (names.length === 0) delete this.store.settings.collapsed[this.boardPath];
    else this.store.settings.collapsed[this.boardPath] = names;

    void this.store.saveSettings();
    this.render();
  }

  private visibleTasks(): TaskItem[] {
    const tasks: TaskItem[] = [];
    for (const group of this.groups) {
      if (this.isCollapsed(group.status.name)) continue;
      tasks.push(...group.tasks);
    }
    return tasks;
  }

  private pruneSelection(): void {
    const alive = new Set(this.visibleTasks().map((task) => task.file.path));
    for (const path of [...this.selection]) {
      if (!alive.has(path)) this.selection.delete(path);
    }
  }

  isSelected(task: TaskItem): boolean {
    return this.selection.has(task.file.path);
  }

  setSelected(task: TaskItem, selected: boolean): void {
    if (selected) this.selection.add(task.file.path);
    else this.selection.delete(task.file.path);
    this.anchor = task.file.path;
    this.render();
  }

  selectRange(task: TaskItem): void {
    const tasks = this.visibleTasks();
    const to = tasks.findIndex((entry) => entry.file.path === task.file.path);
    const from = this.anchor === null ? to : tasks.findIndex((e) => e.file.path === this.anchor);

    if (from < 0 || to < 0) {
      this.setSelected(task, true);
      return;
    }

    const start = Math.min(from, to);
    const end = Math.max(from, to);
    for (let index = start; index <= end; index += 1) {
      this.selection.add(tasks[index].file.path);
    }
    this.render();
  }

  selectGroup(group: TaskGroup, selected: boolean): void {
    for (const task of group.tasks) {
      if (selected) this.selection.add(task.file.path);
      else this.selection.delete(task.file.path);
    }
    this.render();
  }

  selectedTasks(): TaskItem[] {
    return this.visibleTasks().filter((task) => this.selection.has(task.file.path));
  }

  clearSelection(): void {
    this.selection.clear();
    this.render();
  }

  openTask(task: TaskItem, newLeaf: boolean): void {
    void this.app.workspace.getLeaf(newLeaf).openFile(task.file);
  }

  changeStatus(tasks: TaskItem[], status: Status): void {
    const files = tasks.map((task) => task.file);
    this.selection.clear();

    this.run(() => setStatusBatch(this.app, this.config, files, status.name));
  }

  changePriority(task: TaskItem, priority: PriorityKey | null): void {
    this.run(() => setPriority(this.app, task.file, priority));
  }

  changeDue(task: TaskItem, due: string): void {
    this.run(() => setDue(this.app, task.file, due));
  }

  changeTags(task: TaskItem, tags: string[]): void {
    task.tags = [...tags];

    // A tag typed into a row joins the list definition too.
    const fresh = tags.filter((name) => !this.config.tags.some((tag) => tag.name === name));
    for (const name of fresh) {
      const color = TAG_PALETTE[this.config.tags.length % TAG_PALETTE.length];
      this.config.tags.push({ name, color });
    }

    this.run(async () => {
      await setTags(this.app, task.file, tags);
      if (fresh.length > 0) await this.write();
    });
  }

  applyTags(result: TagEditResult): void {
    const tasks = this.groups.flatMap((group) => group.tasks);
    this.config.tags = result.tags.map((tag) => ({ ...tag }));

    this.run(async () => {
      await migrateTags(this.app, tasks, result.migration);
      await this.write();
    });
  }

  removeTasks(tasks: TaskItem[]): void {
    const files = tasks.map((task) => task.file);
    this.selection.clear();

    const trash = (): void => {
      this.run(async () => {
        await trashTasks(this.app, files);
        new Notice(t("DELETED", { count: files.length }));
      });
    };

    if (files.length > 1 && this.store.settings.confirmDelete) {
      new ConfirmModal(
        this.app,
        t("CONFIRM_DELETE_TITLE"),
        t("CONFIRM_DELETE_BODY", { count: files.length }),
        trash
      ).open();
      return;
    }
    trash();
  }

  setPendingAdd(statusName: string | null): void {
    this.pendingAdd = statusName;
    this.render();
  }

  keepAdding(): boolean {
    return this.store.settings.keepAdding;
  }

  setKeepAdding(value: boolean): void {
    this.store.settings.keepAdding = value;
    void this.store.saveSettings();
  }

  search(): SearchState {
    return this.searchState;
  }

  setSearch(state: SearchState): void {
    this.searchState = { query: state.query, field: state.field };
    this.scheduleRender();
  }

  changeField(task: TaskItem, field: BoardField, value: string): void {
    this.run(async () => {
      await setField(this.app, task.file, field, value);
    });
  }

  applyRow(result: RowEditResult): void {
    const files = this.groups.flatMap((group) => group.tasks.map((task) => task.file));

    this.config.fields = result.fields.map((field) => ({ ...field }));
    this.config.columns = normalizeColumns(result.columns, this.config.fields);
    this.config.hidden = result.hidden.filter((key) => key !== "name" && key !== "status");

    this.run(async () => {
      await clearFields(this.app, files, result.removed);
      await this.write();
    });
  }

  columnWidth(): number {
    return this.store.settings.columnWidth;
  }

  setColumnWidth(width: number): void {
    this.store.settings.columnWidth = clampColumnWidth(width);
    void this.store.saveSettings();
  }

  quickAdd(): void {
    const statusName = this.config.unassigned.name;
    if (this.isCollapsed(statusName)) this.setCollapsed(statusName, false);
    this.setPendingAdd(statusName);
  }

  addTask(group: TaskGroup, title: string): void {
    const statusName = group.status.name;
    const order = group.tasks.length;

    this.run(async () => {
      const file = await createTask(this.app, this.config, statusName, title, order);
      if (file !== null && this.store.settings.openOnCreate) {
        await this.app.workspace.getLeaf(false).openFile(file);
      }
    });
  }

  moveTask(task: TaskItem, target: TaskGroup, index: number): void {
    const source = this.groups.find((group) => group.status.name === task.status) ?? null;
    const sameGroup = source === target;

    const rest = target.tasks.filter((entry) => entry.file.path !== task.file.path);
    const original = target.tasks.findIndex((entry) => entry.file.path === task.file.path);

    let position = index;
    if (sameGroup && original >= 0 && original < index) position -= 1;
    position = Math.min(Math.max(position, 0), rest.length);

    const ordered: TFile[] = rest.map((entry) => entry.file);
    ordered.splice(position, 0, task.file);

    const leftover: TFile[] =
      source === null || sameGroup
        ? []
        : source.tasks
            .filter((entry) => entry.file.path !== task.file.path)
            .map((entry) => entry.file);

    this.run(async () => {
      if (!sameGroup) {
        await setStatus(this.app, this.config, task.file, target.status.name);
      }
      await writeOrder(this.app, ordered);
      if (leftover.length > 0) await writeOrder(this.app, leftover);
    });
  }
}
