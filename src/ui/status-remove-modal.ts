import { App, Modal, Setting } from "obsidian";
import { t } from "../i18n";
import { Status } from "../model/status";

export class StatusRemoveModal extends Modal {
  private target: string;

  constructor(
    app: App,
    private readonly status: Status,
    private readonly count: number,
    private readonly targets: Status[],
    private readonly onConfirm: (target: string) => void
  ) {
    super(app);
    this.target = targets[0].name;
  }

  onOpen(): void {
    this.titleEl.setText(t("REMOVE_STATUS_TITLE"));
    this.contentEl.createEl("p", {
      text: t("REMOVE_STATUS_BODY", { count: this.count, name: this.status.name })
    });

    new Setting(this.contentEl).addDropdown((dropdown) => {
      for (const status of this.targets) dropdown.addOption(status.name, status.name);
      dropdown.setValue(this.target);
      dropdown.onChange((value) => {
        this.target = value;
      });
    });

    new Setting(this.contentEl)
      .addButton((button) =>
        button.setButtonText(t("CANCEL")).onClick(() => {
          this.close();
        })
      )
      .addButton((button) =>
        button
          .setButtonText(t("MOVE"))
          .setCta()
          .onClick(() => {
            const target = this.target;
            this.close();
            this.onConfirm(target);
          })
      );
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
