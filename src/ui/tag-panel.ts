import { App, Notice, setIcon } from "obsidian";
import { TagMigration, TagRename } from "../core/tag-migration";
import { t } from "../i18n";
import { textOn } from "../model/status";
import { isValidTag, sanitizeTag, Tag, TAG_PALETTE } from "../model/tag";
import { openColorPopover } from "./color-popover";
import { ConfirmModal } from "./confirm-modal";

interface Entry {
  tag: Tag;
  origin: string | null;
}

export interface TagEditResult {
  tags: Tag[];
  migration: TagMigration;
}

export class TagPanel {
  private readonly entries: Entry[];
  private readonly pendingRemovals: string[] = [];
  private dragIndex: number | null = null;
  private container: HTMLElement | null = null;

  constructor(
    private readonly app: App,
    tags: Tag[],
    private readonly counts: Record<string, number>
  ) {
    this.entries = tags.map((tag) => ({ tag: { ...tag }, origin: tag.name }));
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
    head.createEl("p", { cls: "tl-modal-hint", text: t("TAG_HINT") });

    const add = head.createEl("button", { cls: "tl-btn tl-add-status" });
    add.type = "button";
    setIcon(add.createSpan(), "plus");
    add.createSpan({ text: t("ADD_TAG") });
    add.addEventListener("click", () => {
      const color = TAG_PALETTE[this.entries.length % TAG_PALETTE.length];
      this.entries.push({ tag: { name: this.freeName(), color }, origin: null });
      this.draw();
    });

    const list = content.createDiv({ cls: "tl-status-list" });
    if (this.entries.length === 0) {
      list.createEl("p", { cls: "tl-modal-hint", text: t("NO_TAGS") });
    }
    this.entries.forEach((entry, index) => {
      this.drawRow(list, entry, index);
    });
  }

  private drawRow(list: HTMLElement, entry: Entry, index: number): void {
    const tag = entry.tag;
    const row = list.createDiv({ cls: "tl-status-row" });

    const grip = row.createDiv({ cls: "tl-grip" });
    setIcon(grip, "grip-vertical");
    this.attachDrag(row, index);

    const swatch = row.createDiv({ cls: "tl-swatch-btn" });
    const chip = row.createDiv({ cls: "tl-chip tl-tag-chip", text: tag.name });

    const paint = (color: string): void => {
      tag.color = color;
      swatch.style.background = color;
      chip.style.background = color;
      chip.style.color = textOn(color);
    };
    paint(tag.color);

    swatch.addEventListener("click", () => {
      openColorPopover(swatch, tag.color, paint, TAG_PALETTE);
    });

    const actions = row.createDiv({ cls: "tl-row-actions" });
    const rename = (): void => this.editName(entry, chip, actions, index);
    chip.addEventListener("click", rename);

    this.drawActions(entry, actions, rename, index);
  }

  private drawActions(entry: Entry, actions: HTMLElement, rename: () => void, index: number): void {
    actions.empty();

    const edit = actions.createEl("button", { cls: "tl-icon-btn", attr: { title: t("RENAME") } });
    edit.type = "button";
    setIcon(edit, "pencil");
    edit.addEventListener("click", rename);

    const remove = actions.createEl("button", {
      cls: "tl-icon-btn tl-remove",
      attr: { title: t("REMOVE") }
    });
    remove.type = "button";
    setIcon(remove, "trash-2");
    remove.addEventListener("click", () => {
      this.removeEntry(entry, index);
    });
  }

  private removeEntry(entry: Entry, index: number): void {
    const origin = entry.origin;
    const count = origin === null ? 0 : (this.counts[origin] ?? 0);

    if (origin === null || count === 0) {
      this.entries.splice(index, 1);
      this.draw();
      return;
    }

    new ConfirmModal(
      this.app,
      t("REMOVE_TAG_TITLE"),
      t("REMOVE_TAG_BODY", { name: origin, count }),
      () => {
        this.pendingRemovals.push(origin);
        this.entries.splice(index, 1);
        this.draw();
      }
    ).open();
  }

  private editName(entry: Entry, chip: HTMLElement, actions: HTMLElement, index: number): void {
    const tag = entry.tag;
    const input = createEl("input", { cls: "tl-status-input", value: tag.name });
    input.type = "text";

    let done = false;
    const finish = (save: boolean): void => {
      if (done) return;
      done = true;

      const next = sanitizeTag(input.value);
      input.replaceWith(chip);
      this.drawActions(entry, actions, () => this.editName(entry, chip, actions, index), index);

      if (!save || next.length === 0) return;
      if (!isValidTag(next)) {
        new Notice(t("INVALID_TAG"));
        return;
      }
      tag.name = next;
      chip.setText(next);
    };

    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") finish(true);
      else if (event.key === "Escape") finish(false);
    });

    actions.empty();

    const confirm = actions.createEl("button", { cls: "tl-icon-btn tl-confirm" });
    confirm.type = "button";
    setIcon(confirm, "check");
    confirm.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      finish(true);
    });

    const cancel = actions.createEl("button", { cls: "tl-icon-btn tl-cancel" });
    cancel.type = "button";
    setIcon(cancel, "x");
    cancel.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      finish(false);
    });

    chip.replaceWith(input);
    input.focus();
    input.select();
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

    const [moved] = this.entries.splice(from, 1);
    this.entries.splice(target > from ? target - 1 : target, 0, moved);
    this.dragIndex = null;
    this.draw();
  }

  private freeName(): string {
    const base = sanitizeTag(t("NEW_TAG"));
    let name = base;
    let index = 1;
    while (this.entries.some((entry) => entry.tag.name === name)) {
      index += 1;
      name = `${base}-${index}`;
    }
    return name;
  }

  private renames(): TagRename[] {
    const renames: TagRename[] = [];
    for (const entry of this.entries) {
      const origin = entry.origin;
      if (origin === null || origin === entry.tag.name) continue;
      renames.push({ from: origin, to: entry.tag.name });
    }
    return renames;
  }

  private removals(): string[] {
    const renamed = new Map(this.renames().map((rename) => [rename.from, rename.to]));
    return this.pendingRemovals.filter((name) => !renamed.has(name));
  }

  collect(): TagEditResult | null {
    const seen = new Set<string>();
    for (const entry of this.entries) {
      const name = entry.tag.name;
      if (seen.has(name)) {
        new Notice(t("DUPLICATE_TAG", { name }));
        return null;
      }
      seen.add(name);
    }

    return {
      tags: this.entries.map((entry) => ({ ...entry.tag })),
      migration: { renames: this.renames(), removals: this.removals() }
    };
  }
}
