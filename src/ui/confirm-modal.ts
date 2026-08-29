import { App, Modal, Setting } from "obsidian";
import { t } from "../i18n";

export class ConfirmModal extends Modal {
  private confirmed = false;

  constructor(
    app: App,
    private readonly title: string,
    private readonly body: string,
    private readonly onConfirm: () => void
  ) {
    super(app);
  }

  onOpen(): void {
    this.titleEl.setText(this.title);
    this.contentEl.createEl("p", { text: this.body });

    new Setting(this.contentEl)
      .addButton((button) =>
        button.setButtonText(t("CANCEL")).onClick(() => {
          this.close();
        })
      )
      .addButton((button) =>
        button
          .setButtonText(t("DELETE"))
          .setDestructive()
          .onClick(() => {
            this.confirmed = true;
            this.close();
          })
      );
  }

  onClose(): void {
    this.contentEl.empty();
    if (this.confirmed) this.onConfirm();
  }
}
