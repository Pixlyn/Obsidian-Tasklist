import { setIcon } from "obsidian";
import { t } from "../i18n";
import { STATUS_PALETTE } from "../model/status";
import { BoardSettingsModal } from "../ui/board-settings-modal";
import { openColorPopover } from "../ui/color-popover";
import { ManagerModal, ManagerTab } from "../ui/manager-modal";
import { BoardHost } from "./board-host";
import { renderSearch } from "./search-bar";

function editInline(
  label: HTMLElement,
  value: string,
  placeholder: string,
  cls: string,
  commit: (next: string) => void
): void {
  const input = createEl("input", { cls, value });
  input.type = "text";
  input.placeholder = placeholder;

  let done = false;
  const finish = (save: boolean): void => {
    if (done) return;
    done = true;

    const next = input.value.trim();
    input.replaceWith(label);
    if (save && next !== value) commit(next);
  };

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") finish(true);
    else if (event.key === "Escape") finish(false);
  });
  input.addEventListener("blur", () => finish(true));

  label.replaceWith(input);
  input.focus();
  input.select();
}

function openStatusForm(bar: HTMLElement, host: BoardHost, restore: () => void): void {
  const form = bar.createDiv({ cls: "tl-status-form" });

  const name = form.createEl("input", { cls: "tl-status-input" });
  name.type = "text";
  name.placeholder = t("NEW_STATUS_PLACEHOLDER");

  let color = STATUS_PALETTE[host.config.statuses.length % STATUS_PALETTE.length];

  const swatch = form.createDiv({ cls: "tl-swatch-btn" });
  swatch.style.background = color;
  swatch.addEventListener("click", () => {
    openColorPopover(swatch, color, (next) => {
      color = next;
      swatch.style.background = next;
    });
  });

  const close = (): void => {
    form.remove();
    restore();
  };

  const confirm = form.createEl("button", { cls: "tl-icon-btn tl-confirm" });
  confirm.type = "button";
  setIcon(confirm, "check");

  const submit = (): void => {
    const value = name.value.trim();
    if (value.length === 0) {
      name.focus();
      return;
    }
    close();
    host.addStatus(value, color);
  };

  confirm.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    submit();
  });

  const cancel = form.createEl("button", { cls: "tl-icon-btn tl-cancel" });
  cancel.type = "button";
  setIcon(cancel, "x");
  cancel.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    close();
  });

  name.addEventListener("keydown", (event) => {
    if (event.key === "Enter") submit();
    else if (event.key === "Escape") close();
  });

  name.focus();
}

export function renderTitleBar(parent: HTMLElement, host: BoardHost): void {
  const bar = parent.createDiv({ cls: "tl-title-bar" });

  const name = host.boardTitle();
  const title = bar.createDiv({ cls: "tl-title", text: name });
  title.addEventListener("click", () => {
    editInline(title, name, "", "tl-title-input", (next) => {
      host.renameBoard(next);
    });
  });

  const actions = bar.createDiv({ cls: "tl-title-actions" });

  const search = actions.createDiv({ cls: "tl-search-slot" });
  renderSearch(search, host);

  const quick = actions.createEl("button", { cls: "tl-btn" });
  setIcon(quick.createSpan(), "plus");
  quick.createSpan({ text: t("TASK") });
  quick.addEventListener("click", () => {
    host.quickAdd();
  });

  const add = actions.createEl("button", { cls: "tl-btn" });
  setIcon(add.createSpan(), "plus");
  add.createSpan({ text: t("ADD_STATUS") });
  add.addEventListener("click", () => {
    search.hide();
    quick.hide();
    add.hide();
    settings.hide();
    manage.hide();

    openStatusForm(actions, host, () => {
      search.show();
      quick.show();
      add.show();
      settings.show();
      manage.show();
    });
  });

  const openManager = (tab: ManagerTab): void => {
    new ManagerModal(host, tab).open();
  };

  const manage = actions.createEl("button", {
    cls: "tl-btn tl-icon-only",
    attr: { title: t("MANAGE_BOARD") }
  });
  setIcon(manage, "pencil");
  manage.addEventListener("click", () => {
    openManager("statuses");
  });

  const settings = actions.createEl("button", {
    cls: "tl-btn tl-icon-only",
    attr: { title: t("BOARD_SETTINGS") }
  });
  setIcon(settings, "settings");
  settings.addEventListener("click", () => {
    new BoardSettingsModal(host).open();
  });
}

export function renderNote(parent: HTMLElement, host: BoardHost): void {
  const row = parent.createDiv({ cls: "tl-note" });
  const value = host.config.note;

  const label = row.createDiv({
    cls: value.length === 0 ? "tl-note-text is-empty" : "tl-note-text",
    text: value.length === 0 ? t("ADD_NOTE") : value
  });

  label.addEventListener("click", () => {
    editInline(label, value, t("NOTE_PLACEHOLDER"), "tl-note-input", (next) => {
      host.updateConfig((config) => {
        config.note = next;
      });
    });
  });
}
