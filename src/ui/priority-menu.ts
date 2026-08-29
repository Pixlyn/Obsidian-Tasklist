import { setIcon } from "obsidian";
import { t } from "../i18n";
import { PRIORITIES, PriorityKey } from "../model/priority";
import { openPopover, placePopover } from "./popover";

export function openPriorityMenu(
  anchor: HTMLElement,
  current: PriorityKey | null,
  onPick: (priority: PriorityKey | null) => void
): void {
  const { el, close } = openPopover("tl-menu");

  const addItem = (label: string, color: string | null, value: PriorityKey | null): void => {
    const item = el.createDiv({ cls: "tl-menu-item" });
    if (value === current) item.addClass("is-current");

    const icon = item.createSpan({ cls: "tl-menu-flag" });
    setIcon(icon, color === null ? "flag-off" : "flag");
    icon.style.color = color ?? "var(--text-faint)";

    item.createSpan({ text: label });

    if (value === current) setIcon(item.createSpan({ cls: "tl-menu-mark" }), "check");

    item.addEventListener("click", (event) => {
      event.stopPropagation();
      close();
      onPick(value);
    });
  };

  for (const priority of PRIORITIES) {
    addItem(t(priority.label), priority.color, priority.key);
  }
  addItem(t("PRIORITY_CLEAR"), null, null);

  placePopover(el, anchor);
}
