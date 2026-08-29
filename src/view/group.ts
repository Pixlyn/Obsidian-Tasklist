import { setIcon } from "obsidian";
import { t } from "../i18n";
import { readable, textOn } from "../model/status";
import { TaskGroup } from "../model/task";
import { BoardHost } from "./board-host";
import { DragController } from "./drag-controller";
import { renderRow } from "./row";

function renderAddLine(parent: HTMLElement, host: BoardHost, group: TaskGroup): HTMLElement {
  const line = parent.createDiv({ cls: "tl-add" });

  if (host.pendingAdd !== group.status.name) {
    const button = line.createDiv({ cls: "tl-add-btn", text: t("ADD_TASK") });
    button.addEventListener("click", () => {
      host.setPendingAdd(group.status.name);
    });
    return line;
  }

  const form = line.createDiv({ cls: "tl-add-form" });

  const input = form.createEl("input", {
    cls: "tl-add-input",
    type: "text",
    placeholder: t("NEW_TASK_PLACEHOLDER")
  });

  const submit = (): void => {
    const title = input.value.trim();
    input.value = "";
    if (title.length === 0) {
      input.focus();
      return;
    }

    // Only stays open when the settings menu asked for it.
    if (!host.keepAdding()) host.pendingAdd = null;
    host.addTask(group, title);
  };

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submit();
    } else if (event.key === "Escape") {
      event.preventDefault();
      host.setPendingAdd(null);
    }
  });

  const confirm = form.createEl("button", { cls: "tl-icon-btn tl-confirm" });
  confirm.type = "button";
  setIcon(confirm, "check");
  confirm.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    submit();
  });

  const cancel = form.createEl("button", { cls: "tl-icon-btn tl-cancel" });
  cancel.type = "button";
  setIcon(cancel, "x");
  cancel.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    host.setPendingAdd(null);
  });

  window.setTimeout(() => input.focus(), 0);
  return line;
}

function renderRows(
  parent: HTMLElement,
  host: BoardHost,
  drag: DragController,
  group: TaskGroup
): void {
  for (let index = 0; index < group.tasks.length; index += 1) {
    renderRow(parent, host, drag, group, group.tasks[index], index);
  }
}

export function renderGroup(
  parent: HTMLElement,
  host: BoardHost,
  drag: DragController,
  group: TaskGroup
): void {
  const collapsed = host.isCollapsed(group.status.name);

  const head = parent.createDiv({ cls: "tl-head" });
  const arrow = head.createDiv({ cls: "tl-arrow" });
  setIcon(arrow, "chevron-down");
  if (collapsed) arrow.addClass("is-collapsed");

  const chip = head.createDiv({ cls: "tl-chip", text: group.status.name.toUpperCase() });
  if (group.isUnassigned) {
    chip.addClass("is-unassigned");
    chip.style.borderColor = group.status.color;
    chip.style.color = readable(group.status.color);
  } else {
    chip.style.background = group.status.color;
    chip.style.color = textOn(group.status.color);
  }

  head.createDiv({ cls: "tl-count", text: String(group.tasks.length) });

  const checkAll = head.createEl("input", { cls: "tl-check-all", type: "checkbox" });
  checkAll.checked = group.tasks.length > 0 && group.tasks.every((task) => host.isSelected(task));
  checkAll.addEventListener("click", (event) => {
    event.stopPropagation();
    host.selectGroup(group, checkAll.checked);
  });
  if (collapsed) checkAll.hide();

  const toggle = (): void => {
    host.setCollapsed(group.status.name, !collapsed);
  };
  arrow.addEventListener("click", toggle);
  chip.addEventListener("click", toggle);

  drag.attachGroup(head, group, 0);

  if (collapsed) return;

  const body = parent.createDiv({ cls: "tl-group-body" });
  renderRows(body, host, drag, group);
  drag.attachGroup(renderAddLine(body, host, group), group, group.tasks.length);
}

export function renderArchive(
  parent: HTMLElement,
  host: BoardHost,
  drag: DragController,
  group: TaskGroup
): void {
  const details = parent.createEl("details", { cls: "tl-archive" });
  details.open = !host.isCollapsed(group.status.name);

  const summary = details.createEl("summary", {
    text: t("ARCHIVE_SECTION", { name: group.status.name, count: group.tasks.length })
  });
  summary.addEventListener("click", () => {
    host.setCollapsed(group.status.name, details.open);
  });

  const body = details.createDiv({ cls: "tl-group-body" });
  renderRows(body, host, drag, group);
  drag.attachGroup(summary, group, group.tasks.length);
  drag.attachGroup(body, group, group.tasks.length);
}
