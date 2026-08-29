import { App, setIcon } from "obsidian";
import { t } from "../i18n";
import { visibleColumns } from "../model/board-config";
import {
  BUILTIN_COLUMNS,
  COLUMN_LABELS,
  ColumnKey,
  fieldColumn,
  fieldOf,
  FIXED_COLUMNS,
  isBuiltinColumn,
  normalizeColumns,
  RowEditResult
} from "../model/columns";
import { BoardField, FIELD_TYPE_ICONS, FIELD_TYPE_LABELS, findField } from "../model/field";
import { BoardHost } from "../view/board-host";
import { ConfirmModal } from "./confirm-modal";
import { FieldModal } from "./field-modal";
import { openPopover, placePopover } from "./popover";

export class RowPanel {
  private movable: ColumnKey[];
  private hidden: ColumnKey[];
  private fields: BoardField[];
  private readonly removed: string[] = [];
  private dragIndex: number | null = null;
  private container: HTMLElement | null = null;

  constructor(
    private readonly app: App,
    host: BoardHost
  ) {
    this.fields = host.config.fields.map((field) => ({ ...field }));
    this.movable = normalizeColumns(host.config.columns, this.fields).filter(
      (key) => !FIXED_COLUMNS.includes(key)
    );
    this.hidden = host.config.hidden.filter((key) => !FIXED_COLUMNS.includes(key));
  }

  mount(container: HTMLElement): void {
    this.container = container;
    this.draw();
  }

  private draw(): void {
    const content = this.container;
    if (content === null) return;
    content.empty();

    const head = content.createDiv({ cls: "tl-modal-head" });
    head.createEl("p", { cls: "tl-modal-hint", text: t("ROW_HINT") });

    const add = head.createEl("button", { cls: "tl-btn tl-add-status" });
    add.type = "button";
    setIcon(add.createSpan(), "plus");
    add.createSpan({ text: t("ADD_ROW") });
    add.addEventListener("click", () => {
      this.openPicker(add);
    });

    const list = content.createDiv({ cls: "tl-status-list" });
    this.movable.forEach((key, index) => {
      this.drawRow(list, key, index);
    });
  }

  private labelOf(key: ColumnKey): string {
    if (isBuiltinColumn(key)) return t(COLUMN_LABELS[key]);
    const field = this.fieldFor(key);
    return field === null ? key : field.name;
  }

  private fieldFor(key: ColumnKey): BoardField | null {
    const fieldKey = fieldOf(key);
    return fieldKey === null ? null : findField(this.fields, fieldKey);
  }

  private drawRow(list: HTMLElement, key: ColumnKey, index: number): void {
    const off = this.hidden.includes(key);
    const field = this.fieldFor(key);

    const row = list.createDiv({ cls: "tl-status-row tl-row-column" });
    if (off) row.addClass("is-off");

    setIcon(row.createDiv({ cls: "tl-grip" }), "grip-vertical");
    this.attachDrag(row, index);

    if (field !== null) {
      setIcon(row.createDiv({ cls: "tl-field-icon" }), FIELD_TYPE_ICONS[field.type]);
    }

    row.createDiv({ cls: "tl-row-column-label", text: this.labelOf(key) });

    if (field !== null) {
      row.createSpan({ cls: "tl-archive-tag", text: t(FIELD_TYPE_LABELS[field.type]) });
    }

    const actions = row.createDiv({ cls: "tl-row-actions" });

    const toggle = actions.createEl("button", { cls: "tl-icon-btn" });
    toggle.type = "button";
    setIcon(toggle, off ? "eye-off" : "eye");
    toggle.setAttribute("aria-label", t(off ? "COLUMN_SHOW" : "COLUMN_HIDE"));
    toggle.addEventListener("click", () => {
      const at = this.hidden.indexOf(key);
      if (at >= 0) this.hidden.splice(at, 1);
      else this.hidden.push(key);
      this.draw();
    });

    if (field === null) return;

    const rename = actions.createEl("button", {
      cls: "tl-icon-btn",
      attr: { title: t("RENAME") }
    });
    rename.type = "button";
    setIcon(rename, "pencil");
    rename.addEventListener("click", () => {
      const taken = this.fields
        .filter((other) => other.key !== field.key)
        .map((other) => other.key);

      new FieldModal(
        this.app,
        taken,
        (next) => {
          field.name = next.name;
          this.draw();
        },
        field
      ).open();
    });

    const remove = actions.createEl("button", {
      cls: "tl-icon-btn tl-remove",
      attr: { title: t("REMOVE") }
    });
    remove.type = "button";
    setIcon(remove, "trash-2");
    remove.addEventListener("click", () => {
      this.removeField(field, key);
    });
  }

  private removeField(field: BoardField, key: ColumnKey): void {
    new ConfirmModal(
      this.app,
      t("REMOVE_FIELD_TITLE"),
      t("REMOVE_FIELD_BODY", { name: field.name }),
      () => {
        this.fields = this.fields.filter((other) => other.key !== field.key);
        this.movable = this.movable.filter((other) => other !== key);
        this.hidden = this.hidden.filter((other) => other !== key);
        this.removed.push(field.key);
        this.draw();
      }
    ).open();
  }

  private openPicker(anchor: HTMLElement): void {
    const missing = BUILTIN_COLUMNS.filter(
      (key) => !FIXED_COLUMNS.includes(key) && this.hidden.includes(key)
    );
    const { el, close } = openPopover("tl-menu tl-row-picker");

    const fresh = el.createDiv({ cls: "tl-menu-item" });
    setIcon(fresh.createSpan({ cls: "tl-menu-flag" }), "plus");
    fresh.createSpan({ text: t("NEW_FIELD") });
    fresh.addEventListener("click", (event) => {
      event.stopPropagation();
      close();
      this.addField();
    });

    for (const key of missing) {
      const item = el.createDiv({ cls: "tl-menu-item" });
      setIcon(item.createSpan({ cls: "tl-menu-flag" }), "eye");
      item.createSpan({ text: this.labelOf(key) });
      item.addEventListener("click", (event) => {
        event.stopPropagation();
        this.hidden = this.hidden.filter((hiddenKey) => hiddenKey !== key);
        close();
        this.draw();
      });
    }

    placePopover(el, anchor);
  }

  private addField(): void {
    const taken = this.fields.map((field) => field.key);

    new FieldModal(this.app, taken, (field) => {
      this.fields.push(field);
      this.movable.push(fieldColumn(field.key));
      this.draw();
    }).open();
  }

  private attachDrag(row: HTMLElement, index: number): void {
    row.draggable = true;

    const clear = (): void => {
      row.removeClass("drop-before");
      row.removeClass("drop-after");
    };

    row.addEventListener("dragstart", () => {
      this.dragIndex = index;
      row.addClass("is-dragging");
    });
    row.addEventListener("dragend", () => {
      this.dragIndex = null;
      row.removeClass("is-dragging");
      clear();
    });

    row.addEventListener("dragover", (event) => {
      event.preventDefault();
      if (this.dragIndex === null || this.dragIndex === index) return;

      const box = row.getBoundingClientRect();
      const after = event.clientY > box.top + box.height / 2;
      row.toggleClass("drop-before", !after);
      row.toggleClass("drop-after", after);
    });
    row.addEventListener("dragleave", clear);

    row.addEventListener("drop", (event) => {
      event.preventDefault();
      const box = row.getBoundingClientRect();
      const after = event.clientY > box.top + box.height / 2;
      clear();
      this.move(after ? index + 1 : index);
    });
  }

  private move(target: number): void {
    const from = this.dragIndex;
    if (from === null) return;

    const [moved] = this.movable.splice(from, 1);
    this.movable.splice(target > from ? target - 1 : target, 0, moved);
    this.dragIndex = null;
    this.draw();
  }

  private order(): ColumnKey[] {
    return [...FIXED_COLUMNS, ...this.movable];
  }

  collect(): RowEditResult {
    return {
      columns: this.order(),
      hidden: [...this.hidden],
      fields: this.fields.map((field) => ({ ...field })),
      removed: [...this.removed]
    };
  }

  changed(host: BoardHost): boolean {
    if (this.removed.length > 0) return true;

    const fieldsBefore = host.config.fields.map((field) => `${field.key}:${field.name}`).join(",");
    const fieldsAfter = this.fields.map((field) => `${field.key}:${field.name}`).join(",");
    if (fieldsBefore !== fieldsAfter) return true;

    const before = visibleColumns(host.config).join(",");
    const after = this.order()
      .filter((key) => !this.hidden.includes(key))
      .join(",");
    return before !== after;
  }
}
