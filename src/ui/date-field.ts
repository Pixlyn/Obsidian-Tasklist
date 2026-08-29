import { setIcon } from "obsidian";
import { isIsoDate, today } from "../model/due-date";
import { t } from "../i18n";
import { openPopover, placePopover } from "./popover";

export function openDueEditor(
  anchor: HTMLElement,
  due: string,
  onPick: (due: string) => void
): void {
  let staged = due;
  let cancelled = false;

  const commit = (): void => {
    document.removeEventListener("keydown", onKey, true);
    if (!cancelled && staged !== due) onPick(staged);
  };

  const { el, close } = openPopover("tl-date-pop", commit);

  function onKey(event: KeyboardEvent): void {
    if (event.key === "Escape") cancelled = true;
    else if (event.key === "Enter") close();
  }
  document.addEventListener("keydown", onKey, true);

  const field = el.createDiv({ cls: "tl-date-field" });

  const input = field.createEl("input", { cls: "tl-date-input", value: due });
  input.type = "date";

  input.addEventListener("change", () => {
    const value = input.value.trim();
    if (value.length === 0 || isIsoDate(value)) staged = value;
  });

  const confirm = field.createEl("button", { cls: "tl-icon-btn tl-confirm" });
  confirm.type = "button";
  setIcon(confirm, "check");
  confirm.addEventListener("click", () => close());

  const pick = (value: string): void => {
    staged = value;
    close();
  };

  const row = el.createDiv({ cls: "tl-date-row" });

  const now = row.createEl("button", { cls: "tl-btn", text: t("DUE_TODAY") });
  now.type = "button";
  now.addEventListener("click", () => pick(today()));

  const clear = row.createEl("button", { cls: "tl-btn", text: t("DUE_CLEAR") });
  clear.type = "button";
  clear.disabled = due.length === 0;
  clear.addEventListener("click", () => pick(""));

  placePopover(el, anchor);
  input.focus();
}
