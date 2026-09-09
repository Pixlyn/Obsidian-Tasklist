import { App, FuzzySuggestModal, TFolder } from "obsidian";
import { t } from "../i18n";

export class FolderPicker extends FuzzySuggestModal<string> {
  constructor(
    app: App,
    private readonly onPick: (folder: string) => void
  ) {
    super(app);
    this.setPlaceholder(t("SELECT_FOLDER"));
  }

  getItems(): string[] {
    const folders: string[] = [];

    for (const file of this.app.vault.getAllLoadedFiles()) {
      if (file instanceof TFolder && !file.isRoot()) folders.push(file.path);
    }
    return folders.sort();
  }

  getItemText(folder: string): string {
    return folder;
  }

  onChooseItem(folder: string): void {
    this.onPick(folder);
  }
}
