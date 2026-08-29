import { setIcon } from "obsidian";
import { t } from "../i18n";
import { BoardField, isFieldValue } from "../model/field";
import { openPopover, placePopover } from "./popover";

const INPUT_TYPES: Record<string, string> = {
  text: "text",
  number: "number",
  date: "date",
  time: "time"
};

export function openFieldEditor(
  anchor: HTMLElement,
  field: BoardField,
  value: string,
  onPick: (value: string) => void
): void {
  let staged = value;
  let cancelled = false;

  const commit = (): void => {
    document.removeEventListener("keydown", onKey, true);
    if (!cancelled && staged !== value) onPick(staged);
  };

  const { el, close } = openPopover("tl-date-pop tl-field-pop", commit);

  function onKey(event: KeyboardEvent): void {
    if (event.key === "Escape") cancelled = true;
    else if (event.key === "Enter") close();
  }
  document.addEventListener("keydown", onKey, true);

  const box = el.createDiv({ cls: "tl-date-field" });

  const input = box.createEl("input", { cls: "tl-date-input", value });
  input.type = INPUT_TYPES[field.type] ?? "text";
  input.placeholder = field.name;

  const read = (): void => {
    const next = input.value.trim();
    if (isFieldValue(next, field.type)) staged = next;
  };
  input.addEventListener("input", read);
  input.addEventListener("change", read);

  const confirm = box.createEl("button", { cls: "tl-icon-btn tl-confirm" });
  confirm.type = "button";
  setIcon(confirm, "check");
  confirm.addEventListener("click", () => close());

  const row = el.createDiv({ cls: "tl-date-row" });

  const clear = row.createEl("button", { cls: "tl-btn", text: t("FIELD_CLEAR") });
  clear.type = "button";
  clear.disabled = value.length === 0;
  clear.addEventListener("click", () => {
    staged = "";
    close();
  });

  placePopover(el, anchor);
  input.focus();
  input.select();
}
