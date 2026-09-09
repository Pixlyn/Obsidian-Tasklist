import { Modal, Setting } from "obsidian";
import { t } from "../i18n";
import { BoardHost } from "../view/board-host";
import { FolderPicker } from "./folder-picker";
import { renderSettings } from "./settings-view";

export class BoardSettingsModal extends Modal {
  constructor(private readonly host: BoardHost) {
    super(host.app);
  }

  onOpen(): void {
    this.titleEl.setText(t("BOARD_SETTINGS"));
    this.modalEl.addClass("tl-settings-modal");

    this.contentEl.createEl("h4", { cls: "tl-modal-section", text: t("BOARD_SECTION") });

    const folder = new Setting(this.contentEl)
      .setName(t("BOARD_FOLDER"))
      .setDesc(t("BOARD_FOLDER_DESC"));

    const value = folder.controlEl.createDiv({
      cls: "tl-folder-value",
      text: this.host.config.folder
    });

    folder.addButton((button) =>
      button.setButtonText(t("BROWSE")).onClick(() => {
        new FolderPicker(this.app, (picked) => {
          value.setText(picked);
          this.host.changeFolder(picked);
        }).open();
      })
    );

    this.contentEl.createEl("h4", { cls: "tl-modal-section", text: t("GLOBAL_SECTION") });
    this.contentEl.createEl("p", {
      cls: "tl-modal-hint",
      text: t("BOARD_SETTINGS_INTRO")
    });

    renderSettings(this.contentEl.createDiv(), this.host.store, this.app);
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
