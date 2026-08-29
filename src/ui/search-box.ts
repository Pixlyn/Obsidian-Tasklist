import { setIcon } from "obsidian";
import { t } from "../i18n";
import { SEARCH_FIELDS, SEARCH_LABELS, SearchField, SearchState } from "../model/search";
import { openPopover, placePopover } from "./popover";

export function openSearchBox(
  anchor: HTMLElement,
  state: SearchState,
  onChange: (next: SearchState) => void
): void {
  const fields = [...state.fields];
  const { el } = openPopover("tl-menu tl-search-box");

  const input = el.createEl("textarea", { cls: "tl-search-input" });
  input.rows = 2;
  input.placeholder = t("SEARCH_PLACEHOLDER");
  input.value = state.query;

  const emit = (): void => {
    onChange({ query: input.value, fields: [...fields] });
  };

  const options = el.createDiv({ cls: "tl-search-fields" });

  const draw = (): void => {
    options.empty();
    options.createDiv({ cls: "tl-search-title", text: t("SEARCH_IN") });

    for (const field of SEARCH_FIELDS) {
      const item = options.createDiv({ cls: "tl-menu-item" });
      item.createSpan({ text: t(SEARCH_LABELS[field]) });

      if (fields.includes(field)) {
        item.addClass("is-current");
        setIcon(item.createSpan({ cls: "tl-menu-mark" }), "check");
      }

      item.addEventListener("click", (event) => {
        event.stopPropagation();
        toggle(field);
      });
    }
  };

  const toggle = (field: SearchField): void => {
    const at = fields.indexOf(field);
    if (at >= 0) fields.splice(at, 1);
    else fields.push(field);
    draw();
    emit();
  };

  input.addEventListener("input", emit);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") event.stopPropagation();
  });

  draw();
  placePopover(el, anchor);
  input.focus();
  input.select();
}
