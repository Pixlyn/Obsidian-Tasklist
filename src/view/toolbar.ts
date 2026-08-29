import { t } from "../i18n";
import { allStatuses } from "../model/board-config";
import { openStatusMenu } from "../ui/status-menu";
import { BoardHost } from "./board-host";

export function renderToolbar(parent: HTMLElement, host: BoardHost): void {
  const selected = host.selectedTasks();
  if (selected.length === 0) return;

  const bar = parent.createDiv({ cls: "tl-toolbar" });
  bar.createDiv({ cls: "tl-toolbar-label", text: t("SELECTED", { count: selected.length }) });

  const change = bar.createEl("button", { cls: "tl-btn", text: t("CHANGE_STATUS") });
  change.addEventListener("click", () => {
    openStatusMenu(
      change,
      allStatuses(host.config),
      selected[0].status,
      (status) => host.changeStatus(selected, status),
      host.config.unassigned.name
    );
  });

  const remove = bar.createEl("button", { cls: "tl-btn tl-btn-danger", text: t("DELETE") });
  remove.addEventListener("click", () => {
    host.removeTasks(selected);
  });

  const clear = bar.createEl("button", { cls: "tl-btn", text: t("CLEAR") });
  clear.addEventListener("click", () => {
    host.clearSelection();
  });
}
