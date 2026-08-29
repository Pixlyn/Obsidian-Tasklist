import { setIcon } from "obsidian";
import { Status } from "../model/status";
import { openPopover, placePopover } from "./popover";

export function openStatusMenu(
  anchor: HTMLElement,
  statuses: Status[],
  current: string,
  onPick: (status: Status) => void,
  dottedName?: string
): void {
  const { el, close } = openPopover("tl-menu");

  for (const status of statuses) {
    const item = el.createDiv({ cls: "tl-menu-item" });
    if (status.name === current) item.addClass("is-current");

    const dot = item.createDiv({ cls: "tl-menu-dot" });
    if (status.name === dottedName) {
      dot.addClass("is-unassigned");
      dot.style.borderColor = status.color;
    } else {
      dot.style.background = status.color;
    }
    item.createSpan({ text: status.name });

    if (status.name === current) {
      setIcon(item.createSpan({ cls: "tl-menu-mark" }), "check");
    }

    item.addEventListener("click", (event) => {
      event.stopPropagation();
      close();
      onPick(status);
    });
  }

  placePopover(el, anchor);
}
