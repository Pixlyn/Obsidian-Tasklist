import { App, Modal, Setting } from "obsidian";
import { t } from "../i18n";
import { BoardHost } from "../view/board-host";

export class BoardSettingsModal extends Modal {
  constructor(
    app: App,
    private readonly host: BoardHost
  ) {
    super(app);
  }

  onOpen(): void {
    this.titleEl.setText(t("BOARD_SETTINGS"));
    this.modalEl.addClass("tl-settings-modal");

    this.contentEl.createEl("p", {
      cls: "tl-modal-hint",
      text: t("BOARD_SETTINGS_INTRO")
    });

    new Setting(this.contentEl)
      .setName(t("KEEP_ADDING"))
      .setDesc(t("KEEP_ADDING_DESC"))
      .addToggle((toggle) =>
        toggle.setValue(this.host.keepAdding()).onChange((value) => {
          this.host.setKeepAdding(value);
        })
      );
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
