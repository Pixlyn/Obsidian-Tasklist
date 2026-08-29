import { STATUS_PALETTE } from "../model/status";
import { openPopover, placePopover } from "./popover";

const HEX = /^#[0-9a-fA-F]{6}$/;

export function openColorPopover(
  anchor: HTMLElement,
  color: string,
  onPick: (color: string) => void,
  palette: string[] = STATUS_PALETTE
): void {
  const { el } = openPopover("tl-color-pop");

  const grid = el.createDiv({ cls: "tl-swatch-grid" });
  const picker = el.createDiv({ cls: "tl-color-row" });

  const native = picker.createEl("input", { cls: "tl-swatch", value: color });
  native.type = "color";

  const hex = picker.createEl("input", { cls: "tl-hex", value: color });
  hex.type = "text";
  hex.spellcheck = false;

  const apply = (next: string): void => {
    native.value = next;
    hex.value = next;
    onPick(next);
  };

  for (const preset of palette) {
    const cell = grid.createDiv({ cls: "tl-swatch-cell" });
    cell.style.background = preset;
    cell.addEventListener("click", () => apply(preset));
  }

  native.addEventListener("input", () => apply(native.value));
  hex.addEventListener("input", () => {
    const value = hex.value.trim();
    if (HEX.test(value)) apply(value);
  });

  placePopover(el, anchor);
}
