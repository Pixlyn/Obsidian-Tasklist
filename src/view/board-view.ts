import { App, TextFileView, WorkspaceLeaf } from "obsidian";
import { t } from "../i18n";
import { parseBoardConfig } from "../model/board-config";
import { SettingsStore } from "../settings";
import { BoardRenderer } from "./board-renderer";

export const BOARD_VIEW = "tasklist-board";
export const BOARD_ICON = "list-todo";

export const BOARD_FLAG = "taskboard";

export const markdownOverrides = new Set<string>();

export function blockSource(data: string): string | null {
  const lines = data.split("\n");

  let start = -1;
  for (let index = 0; index < lines.length; index += 1) {
    const trimmed = lines[index].trimStart();
    const fence = trimmed.startsWith("```") ? "```" : trimmed.startsWith("~~~") ? "~~~" : null;
    if (fence === null) continue;

    if (start < 0) {
      if (trimmed.slice(fence.length).trim() === "tasklist") start = index;
      continue;
    }
    return lines.slice(start + 1, index).join("\n");
  }
  return null;
}

export class BoardView extends TextFileView {
  private renderer: BoardRenderer | null = null;

  constructor(
    leaf: WorkspaceLeaf,
    private readonly store: SettingsStore
  ) {
    super(leaf);
  }

  getViewType(): string {
    return BOARD_VIEW;
  }

  getIcon(): string {
    return BOARD_ICON;
  }

  getDisplayText(): string {
    return this.file === null ? "TaskList" : this.file.basename;
  }

  getViewData(): string {
    return this.data;
  }

  setViewData(data: string, clear: boolean): void {
    const same = data === this.data;
    this.data = data;
    if (clear) this.clear();
    else if (same && this.renderer !== null) return;
    this.draw();
  }

  quickAdd(): boolean {
    if (this.renderer === null) return false;
    this.renderer.quickAdd();
    return true;
  }

  clear(): void {
    if (this.renderer === null) return;
    this.removeChild(this.renderer);
    this.renderer = null;
  }

  private draw(): void {
    const path = this.file === null ? "" : this.file.path;
    if (path.length === 0) return;

    this.clear();
    this.contentEl.empty();
    this.contentEl.addClass("tl-view");

    const source = blockSource(this.data);
    if (source === null) {
      this.contentEl.createDiv({ cls: "tl-board" }).createDiv({
        cls: "tl-error",
        text: t("BLOCK_MISSING", { file: path })
      });
      return;
    }

    const { config, error } = parseBoardConfig(source);
    if (error !== null) {
      this.contentEl.createDiv({ cls: "tl-board" }).createDiv({
        cls: "tl-error",
        text: t("FAILED", { message: error })
      });
      return;
    }

    this.renderer = new BoardRenderer(
      this.contentEl,
      this.app,
      this.store,
      config,
      path,
      () => null,
      (data) => {
        this.data = data;
      }
    );
    this.addChild(this.renderer);
  }

  onPaneMenu(menu: Parameters<TextFileView["onPaneMenu"]>[0], source: string): void {
    menu.addItem((item) => {
      item
        .setTitle(t("OPEN_AS_MARKDOWN"))
        .setIcon("file-text")
        .onClick(() => {
          const path = this.file === null ? "" : this.file.path;
          if (path.length > 0) markdownOverrides.add(path);
          void this.leaf.setViewState({ type: "markdown", state: { file: path } });
        });
    });
    super.onPaneMenu(menu, source);
  }
}

export function isBoardNote(app: App, path: string): boolean {
  const flag: unknown = app.metadataCache.getCache(path)?.frontmatter?.[BOARD_FLAG];
  return flag === true;
}
