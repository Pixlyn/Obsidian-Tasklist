import { setIcon } from "obsidian";
import { t } from "../i18n";
import { visibleColumns } from "../model/board-config";
import { TaskGroup, TaskItem } from "../model/task";
import { BoardHost } from "./board-host";
import { renderCell } from "./cells";
import { DragController } from "./drag-controller";

export function renderRow(
  parent: HTMLElement,
  host: BoardHost,
  drag: DragController,
  group: TaskGroup,
  task: TaskItem,
  index: number
): void {
  const row = parent.createDiv({ cls: "tl-row" });
  if (host.isSelected(task)) row.addClass("is-selected");

  setIcon(row.createDiv({ cls: "tl-grip" }), "grip-vertical");

  const check = row.createEl("input", { cls: "tl-check", type: "checkbox" });
  check.checked = host.isSelected(task);
  check.addEventListener("click", (event) => {
    event.stopPropagation();
    if (event.shiftKey) host.selectRange(task);
    else host.setSelected(task, check.checked);
  });

  if (task.unknown) {
    const warning = row.createDiv({ cls: "tl-warning" });
    warning.setAttribute("aria-label", t("UNKNOWN_STATUS", { status: task.rawStatus }));
    setIcon(warning, "alert-triangle");
  }

  for (const key of visibleColumns(host.config)) renderCell(row, host, task, key);

  const actions = row.createDiv({ cls: "tl-actions" });

  const remove = actions.createEl("button", { cls: "tl-icon-btn" });
  remove.setAttribute("aria-label", t("DELETE"));
  setIcon(remove, "trash-2");
  remove.addEventListener("click", (event) => {
    event.stopPropagation();
    host.removeTasks([task]);
  });

  drag.attachRow(row, group, index, task);
}
