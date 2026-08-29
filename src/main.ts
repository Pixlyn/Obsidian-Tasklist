import {
  MarkdownPostProcessorContext,
  MarkdownView,
  Menu,
  Notice,
  Plugin,
  TAbstractFile,
  TFile,
  TFolder,
  ViewState,
  WorkspaceLeaf
} from "obsidian";
import { ensureBoardFolders } from "./core/folder-sync";
import { t } from "./i18n";
import {
  BoardConfig,
  CODE_BLOCK,
  defaultBoardConfig,
  parseBoardConfig,
  serializeBoardConfig
} from "./model/board-config";
import { DEFAULT_SETTINGS, mergeSettings, SettingsStore, TaskListSettings } from "./settings";
import { closeAllPopovers } from "./ui/popover";
import { BoardRenderer } from "./view/board-renderer";
import {
  BOARD_FLAG,
  BOARD_ICON,
  BOARD_VIEW,
  BoardView,
  isBoardNote,
  markdownOverrides
} from "./view/board-view";

const TASKS_FOLDER = "Tasks";

export default class TaskListPlugin extends Plugin implements SettingsStore {
  settings: TaskListSettings = { ...DEFAULT_SETTINGS, collapsed: {} };

  async onload(): Promise<void> {
    this.settings = mergeSettings(await this.loadData());

    this.registerView(BOARD_VIEW, (leaf) => new BoardView(leaf, this));

    this.registerMarkdownCodeBlockProcessor(CODE_BLOCK, (source, element, context) => {
      this.renderBoard(source, element, context);
    });

    this.addCommand({
      id: "create-task-list",
      name: t("NEW_BOARD"),
      callback: () => {
        void this.createBoard(this.app.fileManager.getNewFileParent(""));
      }
    });

    this.addCommand({
      id: "create-task",
      name: t("NEW_TASK"),
      checkCallback: (checking) => {
        const view = this.app.workspace.getActiveViewOfType(BoardView);
        if (view === null) return false;
        if (!checking) view.quickAdd();
        return true;
      }
    });

    this.registerEvent(
      this.app.workspace.on("file-menu", (menu: Menu, file: TAbstractFile) => {
        if (file instanceof TFolder) {
          menu.addItem((item) => {
            item
              .setTitle(t("NEW_BOARD"))
              .setIcon(BOARD_ICON)
              .onClick(() => {
                void this.createBoard(file);
              });
          });
          return;
        }

        if (!(file instanceof TFile) || !isBoardNote(this.app, file.path)) return;
        menu.addItem((item) => {
          item
            .setTitle(t("OPEN_AS_BOARD"))
            .setIcon(BOARD_ICON)
            .onClick(() => {
              void this.openAsBoard(this.app.workspace.getLeaf(false), file);
            });
        });
      })
    );

    this.patchViewState();

    this.registerEvent(this.app.workspace.on("file-open", () => this.claimLeaves()));
    this.registerEvent(this.app.workspace.on("active-leaf-change", () => this.claimLeaves()));
    this.registerEvent(this.app.workspace.on("layout-change", () => this.claimLeaves()));

    this.app.workspace.onLayoutReady(() => this.claimLeaves());

    this.register(closeAllPopovers);
  }

  private patchViewState(): void {
    const proto = WorkspaceLeaf.prototype;
    const original: (state: ViewState, eState?: unknown) => Promise<void> = proto.setViewState;
    const redirect = (state: ViewState): ViewState => this.boardState(state);

    proto.setViewState = function (
      this: WorkspaceLeaf,
      state: ViewState,
      eState?: unknown
    ): Promise<void> {
      return original.call(this, redirect(state), eState);
    };

    this.register(() => {
      proto.setViewState = original;
    });
  }

  private boardState(state: ViewState): ViewState {
    if (state.type !== "markdown") return state;

    const path: unknown = state.state?.["file"];
    if (typeof path !== "string" || path.length === 0) return state;
    if (markdownOverrides.has(path) || !isBoardNote(this.app, path)) return state;

    return { ...state, type: BOARD_VIEW };
  }

  private claimLeaves(): void {
    for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
      const view = leaf.view;
      if (!(view instanceof MarkdownView)) continue;

      const file = view.file;
      if (file === null || !isBoardNote(this.app, file.path)) continue;
      if (markdownOverrides.has(file.path)) continue;

      void this.openAsBoard(leaf, file);
    }
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  private async openAsBoard(leaf: WorkspaceLeaf, file: TFile): Promise<void> {
    markdownOverrides.delete(file.path);
    await leaf.setViewState({ type: BOARD_VIEW, state: { file: file.path } });
  }

  private renderBoard(
    source: string,
    element: HTMLElement,
    context: MarkdownPostProcessorContext
  ): void {
    const { config, error } = parseBoardConfig(source);

    if (error !== null) {
      element.createDiv({ cls: "tl-board" }).createDiv({
        cls: "tl-error",
        text: t("FAILED", { message: error })
      });
      return;
    }

    context.addChild(
      new BoardRenderer(element, this.app, this, config, context.sourcePath, () =>
        context.getSectionInfo(element)
      )
    );
  }

  private async createBoard(folder: TFolder): Promise<TFile | null> {
    const base = "TaskList";
    const parent = folder.isRoot() ? "" : `${folder.path}/`;

    let suffix = "";
    let index = 1;
    while (
      this.app.vault.getAbstractFileByPath(`${parent}${base}${suffix}.md`) !== null ||
      this.app.vault.getAbstractFileByPath(`${parent}${TASKS_FOLDER}${suffix}`) !== null
    ) {
      index += 1;
      suffix = ` ${index}`;
    }

    const path = `${parent}${base}${suffix}.md`;

    const config: BoardConfig = defaultBoardConfig();
    config.folder = `${parent}${TASKS_FOLDER}${suffix}`;

    const body = [
      "---",
      `${BOARD_FLAG}: true`,
      "---",
      "",
      `\`\`\`${CODE_BLOCK}`,
      serializeBoardConfig(config).replace(/\n$/, ""),
      "```",
      ""
    ].join("\n");

    try {
      await ensureBoardFolders(this.app.vault, config);
      const file = await this.app.vault.create(path, body);

      const leaf = this.app.workspace.getLeaf(false);
      await this.openAsBoard(leaf, file);
      return file;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      new Notice(t("FAILED", { message }));
      return null;
    }
  }
}
