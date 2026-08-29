import { setIcon } from "obsidian";
import { locale, t } from "../i18n";
import { allStatuses } from "../model/board-config";
import { ColumnKey, fieldOf } from "../model/columns";
import { formatDue, isDueToday, isOverdue } from "../model/due-date";
import { BoardField, FIELD_TYPE_ICONS, findField } from "../model/field";
import { findPriority } from "../model/priority";
import { findStatus, Status, textOn } from "../model/status";
import { findTag } from "../model/tag";
import { TaskItem } from "../model/task";
import { openDueEditor } from "../ui/date-field";
import { openFieldEditor } from "../ui/field-editor";
import { openPriorityMenu } from "../ui/priority-menu";
import { openStatusMenu } from "../ui/status-menu";
import { openTagMenu } from "../ui/tag-menu";
import { BoardHost } from "./board-host";

function statusOf(host: BoardHost, task: TaskItem): Status {
  return findStatus(allStatuses(host.config), task.status) ?? host.config.unassigned;
}

function cell(row: HTMLElement, key: ColumnKey): HTMLElement {
  const field = fieldOf(key);
  return row.createDiv({
    cls: field === null ? `tl-cell tl-cell-${key}` : "tl-cell tl-cell-field"
  });
}

function renderName(row: HTMLElement, host: BoardHost, task: TaskItem): void {
  const name = cell(row, "name").createEl("a", { cls: "tl-name", text: task.title, href: "#" });
  name.addEventListener("click", (event) => {
    event.preventDefault();
    host.openTask(task, event.ctrlKey || event.metaKey);
  });
}

function renderStatus(row: HTMLElement, host: BoardHost, task: TaskItem): void {
  const status = statusOf(host, task);
  const dot = cell(row, "status").createEl("button", { cls: "tl-dot" });
  dot.type = "button";
  dot.style.borderColor = status.color;
  dot.setAttribute("aria-label", status.name);
  if (status.name === host.config.unassigned.name) dot.addClass("is-unassigned");

  dot.addEventListener("click", (event) => {
    event.stopPropagation();
    openStatusMenu(
      dot,
      allStatuses(host.config),
      task.status,
      (picked) => host.changeStatus([task], picked),
      host.config.unassigned.name
    );
  });
}

function renderPriority(row: HTMLElement, host: BoardHost, task: TaskItem): void {
  const priority = task.priority === null ? null : findPriority(task.priority);

  const button = cell(row, "priority").createEl("button", { cls: "tl-flag" });
  button.type = "button";
  if (priority === null) button.addClass("is-empty");

  setIcon(button, "flag");
  if (priority !== null) button.style.setProperty("--tl-flag-color", priority.color);
  button.setAttribute("aria-label", priority === null ? t("PRIORITY") : t(priority.label));

  button.addEventListener("click", (event) => {
    event.stopPropagation();
    openPriorityMenu(button, task.priority, (picked) => host.changePriority(task, picked));
  });
}

function renderTags(row: HTMLElement, host: BoardHost, task: TaskItem): void {
  const button = cell(row, "tags").createEl("button", { cls: "tl-tags" });
  button.type = "button";
  button.setAttribute("aria-label", t("TAGS"));

  if (task.tags.length === 0) {
    button.addClass("is-empty");
    setIcon(button, "tag");
  } else {
    // Only the first tag is spelled out; the rest live behind a counter.
    const [first, ...rest] = task.tags;
    const tag = findTag(host.config.tags, first);

    const chip = button.createSpan({ cls: "tl-tag-chip", text: first });
    if (tag !== null) {
      chip.style.background = tag.color;
      chip.style.color = textOn(tag.color);
    }

    if (rest.length > 0) {
      button.createSpan({ cls: "tl-tag-more", text: t("MORE_TAGS", { count: rest.length }) });
    }
    button.setAttribute("aria-label", task.tags.join(", "));
  }

  button.addEventListener("click", (event) => {
    event.stopPropagation();
    openTagMenu(button, host.config.tags, task.tags, (picked) => host.changeTags(task, picked));
  });
}

function renderDue(row: HTMLElement, host: BoardHost, task: TaskItem): void {
  const button = cell(row, "due").createEl("button", { cls: "tl-due" });
  button.type = "button";
  button.setAttribute("aria-label", t("DUE_DATE"));

  if (task.due.length === 0) {
    button.addClass("is-empty");
    setIcon(button, "calendar");
  } else {
    button.setText(formatDue(task.due, locale()));
    if (isOverdue(task.due)) button.addClass("is-overdue");
    else if (isDueToday(task.due)) button.addClass("is-today");
  }

  button.addEventListener("click", (event) => {
    event.stopPropagation();
    openDueEditor(button, task.due, (picked) => host.changeDue(task, picked));
  });
}

function renderCreated(row: HTMLElement, task: TaskItem): void {
  const box = cell(row, "created");
  const text = task.created.length === 0 ? "" : formatDue(task.created, locale());
  const value = box.createSpan({ cls: "tl-cell-text", text });
  if (text.length === 0) value.addClass("is-empty");
  box.setAttribute("aria-label", t("COLUMN_CREATED"));
}

function fieldText(field: BoardField, value: string): string {
  if (value.length === 0) return "";
  if (field.type === "date") return formatDue(value, locale());
  return value;
}

function renderField(
  row: HTMLElement,
  host: BoardHost,
  task: TaskItem,
  column: ColumnKey,
  field: BoardField
): void {
  const value = task.fields[field.key] ?? "";
  const box = cell(row, column);

  if (field.type === "toggle") {
    const on = value === "true";

    // Obsidian's own switch markup, so it matches the settings toggles.
    const toggle = box.createDiv({ cls: "checkbox-container tl-field-toggle" });
    if (on) toggle.addClass("is-enabled");
    toggle.setAttribute("aria-label", field.name);

    const check = toggle.createEl("input", { type: "checkbox" });
    check.checked = on;
    check.tabIndex = -1;

    toggle.addEventListener("click", (event) => {
      event.stopPropagation();
      event.preventDefault();
      host.changeField(task, field, on ? "false" : "true");
    });
    return;
  }

  const button = box.createEl("button", { cls: "tl-field" });
  button.type = "button";
  button.setAttribute("aria-label", field.name);

  const text = fieldText(field, value);
  if (text.length === 0) {
    button.addClass("is-empty");
    setIcon(button, FIELD_TYPE_ICONS[field.type]);
  } else {
    button.setText(text);
  }

  button.addEventListener("click", (event) => {
    event.stopPropagation();
    openFieldEditor(button, field, value, (picked) => host.changeField(task, field, picked));
  });
}

export function renderCell(
  row: HTMLElement,
  host: BoardHost,
  task: TaskItem,
  key: ColumnKey
): void {
  const fieldKey = fieldOf(key);
  if (fieldKey !== null) {
    const field = findField(host.config.fields, fieldKey);
    if (field !== null) renderField(row, host, task, key, field);
    return;
  }

  if (key === "name") renderName(row, host, task);
  else if (key === "status") renderStatus(row, host, task);
  else if (key === "priority") renderPriority(row, host, task);
  else if (key === "tags") renderTags(row, host, task);
  else if (key === "due") renderDue(row, host, task);
  else renderCreated(row, task);
}
