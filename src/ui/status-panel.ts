import { App, Notice, setIcon } from "obsidian";
import { StatusMigration, StatusRemoval, StatusRename } from "../core/status-migration";
import { t } from "../i18n";
import { Status, STATUS_PALETTE, textOn } from "../model/status";
import { openColorPopover } from "./color-popover";
import { StatusRemoveModal } from "./status-remove-modal";

interface Entry {
  status: Status;
  unassigned: boolean;
  origin: string | null;
}

export interface StatusEdit {
  statuses: Status[];
  archive: Status;
  unassigned: Status;
  unassignedIndex: number;
}

export interface StatusEditResult extends StatusEdit {
  migration: StatusMigration;
}

export class StatusPanel {
  private readonly entries: Entry[];
  private readonly archive: Entry;
  private readonly pendingRemovals: StatusRemoval[] = [];
  private dragIndex: number | null = null;
  private container: HTMLElement | null = null;

  constructor(
    private readonly app: App,
    edit: StatusEdit,
    private readonly counts: Record<string, number>
  ) {
    this.entries = edit.statuses.map((status) => ({
      status: { ...status },
      unassigned: false,
      origin: status.name
    }));
    const index = Math.min(Math.max(edit.unassignedIndex, 0), this.entries.length);
    this.entries.splice(index, 0, {
      status: { ...edit.unassigned },
      unassigned: true,
      origin: edit.unassigned.name
    });

    this.archive = { status: { ...edit.archive }, unassigned: false, origin: edit.archive.name };
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
    head.createEl("p", { cls: "tl-modal-hint", text: t("STATUS_ORDER_HINT") });

    const add = head.createEl("button", { cls: "tl-btn tl-add-status" });
    add.type = "button";
    setIcon(add.createSpan(), "plus");
    add.createSpan({ text: t("ADD_STATUS") });
    add.addEventListener("click", () => {
      const color = STATUS_PALETTE[this.entries.length % STATUS_PALETTE.length];
      this.entries.push({
        status: { name: this.freeName(), color },
        unassigned: false,
        origin: null
      });
      this.draw();
    });

    const list = content.createDiv({ cls: "tl-status-list" });
    this.entries.forEach((entry, index) => {
      this.drawRow(list, entry, index);
    });
    this.drawRow(list, this.archive, null);
  }

  private drawRow(list: HTMLElement, entry: Entry, index: number | null): void {
    const status = entry.status;
    const row = list.createDiv({
      cls: index === null ? "tl-status-row is-archive" : "tl-status-row"
    });

    const grip = row.createDiv({ cls: "tl-grip" });
    setIcon(grip, "grip-vertical");
    if (index === null) grip.hide();
    else this.attachDrag(row, index);

    const swatch = row.createDiv({ cls: "tl-swatch-btn" });
    const chip = row.createDiv({ cls: "tl-chip", text: status.name.toUpperCase() });
    if (entry.unassigned) chip.addClass("is-unassigned");

    const paint = (color: string): void => {
      status.color = color;
      swatch.style.background = color;

      if (entry.unassigned) {
        chip.style.borderColor = color;
        chip.style.color = color;
        return;
      }
      chip.style.background = color;
      chip.style.color = textOn(color);
    };
    paint(status.color);

    swatch.addEventListener("click", () => {
      openColorPopover(swatch, status.color, paint);
    });

    const actions = row.createDiv({ cls: "tl-row-actions" });
    const rename = (): void => this.editName(entry, chip, actions, index);
    chip.addEventListener("click", rename);

    this.drawActions(entry, actions, rename, index);

    if (index === null) row.createSpan({ cls: "tl-archive-tag", text: t("ARCHIVE_LABEL") });
  }

  private drawActions(
    entry: Entry,
    actions: HTMLElement,
    rename: () => void,
    index: number | null
  ): void {
    actions.empty();

    const edit = actions.createEl("button", { cls: "tl-icon-btn", attr: { title: t("RENAME") } });
    edit.type = "button";
    setIcon(edit, "pencil");
    edit.addEventListener("click", rename);

    if (index === null || entry.unassigned) return;

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

    if (count === 0 || origin === null) {
      this.entries.splice(index, 1);
      this.draw();
      return;
    }

    const targets = this.entries
      .filter((other) => other !== entry)
      .map((other) => other.status)
      .concat(this.archive.status);

    new StatusRemoveModal(this.app, entry.status, count, targets, (target) => {
      this.pendingRemovals.push({ from: origin, to: target });
      this.entries.splice(index, 1);
      this.draw();
    }).open();
  }

  private editName(
    entry: Entry,
    chip: HTMLElement,
    actions: HTMLElement,
    index: number | null
  ): void {
    const status = entry.status;
    const input = createEl("input", { cls: "tl-status-input", value: status.name });
    input.type = "text";

    let done = false;
    const finish = (save: boolean): void => {
      if (done) return;
      done = true;

      const next = input.value.trim();
      input.replaceWith(chip);
      this.drawActions(entry, actions, () => this.editName(entry, chip, actions, index), index);

      if (!save || next.length === 0) return;
      status.name = next;
      chip.setText(next.toUpperCase());
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
    const base = t("NEW_STATUS");
    let name = base;
    let index = 1;
    while (this.taken(name)) {
      index += 1;
      name = `${base} ${index}`;
    }
    return name;
  }

  private taken(name: string): boolean {
    if (this.archive.status.name === name) return true;
    return this.entries.some((entry) => entry.status.name === name);
  }

  private renames(): StatusRename[] {
    const renames: StatusRename[] = [];
    for (const entry of [...this.entries, this.archive]) {
      const origin = entry.origin;
      if (origin === null || origin === entry.status.name) continue;
      renames.push({ from: origin, to: entry.status.name });
    }
    return renames;
  }

  private resolveTarget(name: string, seen: Set<string>): string {
    const entry = [...this.entries, this.archive].find(
      (candidate) => candidate.origin === name || candidate.status.name === name
    );
    if (entry !== undefined) return entry.status.name;

    const next = this.pendingRemovals.find((removal) => removal.from === name);
    if (next === undefined || seen.has(name)) return this.archive.status.name;

    seen.add(name);
    return this.resolveTarget(next.to, seen);
  }

  private removals(): StatusRemoval[] {
    return this.pendingRemovals.map((removal) => ({
      from: removal.from,
      to: this.resolveTarget(removal.to, new Set([removal.from]))
    }));
  }

  collect(): StatusEditResult | null {
    const statuses = this.entries.filter((entry) => !entry.unassigned).map((entry) => entry.status);

    if (statuses.length === 0) {
      new Notice(t("STATUS_REQUIRED"));
      return null;
    }

    const seen = new Set<string>();
    for (const entry of [...this.entries, this.archive]) {
      if (seen.has(entry.status.name)) {
        new Notice(t("DUPLICATE_STATUS", { name: entry.status.name }));
        return null;
      }
      seen.add(entry.status.name);
    }

    const position = this.entries.findIndex((entry) => entry.unassigned);

    return {
      statuses,
      archive: this.archive.status,
      unassigned: this.entries[position].status,
      unassignedIndex: position,
      migration: { renames: this.renames(), removals: this.removals() }
    };
  }
}
