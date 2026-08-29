import { App, Modal, Notice, setIcon, Setting } from "obsidian";
import { t } from "../i18n";
import {
  BoardField,
  FIELD_TYPE_ICONS,
  FIELD_TYPE_LABELS,
  FIELD_TYPES,
  FieldType,
  fieldKeyFor
} from "../model/field";

export class FieldModal extends Modal {
  private name: string;
  private type: FieldType;

  constructor(
    app: App,
    private readonly taken: string[],
    private readonly onSave: (field: BoardField) => void,
    private readonly edited: BoardField | null = null
  ) {
    super(app);
    this.name = edited?.name ?? "";
    this.type = edited?.type ?? "text";
  }

  onOpen(): void {
    this.titleEl.setText(t(this.edited === null ? "NEW_FIELD" : "RENAME_FIELD"));
    this.modalEl.addClass("tl-status-modal");
    this.modalEl.addClass("tl-field-modal");

    const content = this.contentEl;
    content.createEl("p", { cls: "tl-modal-hint", text: t("FIELD_HINT") });

    const input = content.createEl("input", { cls: "tl-status-input tl-field-name" });
    input.type = "text";
    input.placeholder = t("FIELD_NAME_PLACEHOLDER");
    input.value = this.name;
    input.addEventListener("input", () => {
      this.name = input.value;
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") this.save();
    });

    // The type is fixed once values exist.
    if (this.edited === null) {
      const list = content.createDiv({ cls: "tl-field-types" });
      const draw = (): void => {
        list.empty();
        for (const type of FIELD_TYPES) {
          const item = list.createDiv({ cls: "tl-menu-item" });
          setIcon(item.createSpan({ cls: "tl-menu-flag" }), FIELD_TYPE_ICONS[type]);
          item.createSpan({ text: t(FIELD_TYPE_LABELS[type]) });

          if (type === this.type) {
            item.addClass("is-current");
            setIcon(item.createSpan({ cls: "tl-menu-mark" }), "check");
          }

          item.addEventListener("click", () => {
            this.type = type;
            draw();
          });
        }
      };
      draw();
    }

    new Setting(content)
      .addButton((button) =>
        button.setButtonText(t("CANCEL")).onClick(() => {
          this.close();
        })
      )
      .addButton((button) =>
        button
          .setButtonText(t("SAVE"))
          .setCta()
          .onClick(() => this.save())
      );

    input.focus();
    input.select();
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private save(): void {
    const name = this.name.trim();
    const key = this.edited === null ? fieldKeyFor(name) : this.edited.key;

    if (name.length === 0 || key.length === 0) {
      new Notice(t("FIELD_NAME_REQUIRED"));
      return;
    }
    if (this.taken.includes(key)) {
      new Notice(t("DUPLICATE_FIELD", { name }));
      return;
    }

    this.onSave({ key, name, type: this.type });
    this.close();
  }
}
