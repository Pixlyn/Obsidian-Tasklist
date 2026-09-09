import { setIcon } from "obsidian";
import { t } from "../i18n";
import { allStatuses, BoardConfig } from "../model/board-config";
import { PRIORITIES } from "../model/priority";
import {
  isDateField,
  isTextField,
  SEARCH_FIELDS,
  SEARCH_ICONS,
  SEARCH_LABELS,
  SearchField,
  SearchState
} from "../model/search";
import { readable } from "../model/status";
import { TaskListSettings } from "../settings";
import { openPopover, placePopoverAt } from "./popover";

export interface SearchValue {
  value: string;
  label: string;
  color: string | null;
  icon: string | null;
}

export function searchValues(config: BoardConfig, field: SearchField): SearchValue[] {
  if (field === "status") {
    return allStatuses(config).map((status) => ({
      value: status.name,
      label: status.name,
      color: status.color,
      icon: null
    }));
  }

  if (field === "tags") {
    return config.tags.map((tag) => ({
      value: tag.name,
      label: tag.name,
      color: tag.color,
      icon: null
    }));
  }

  return PRIORITIES.map((priority) => ({
    value: priority.key,
    label: t(priority.label),
    color: priority.color,
    icon: "flag"
  }));
}

export function searchLabel(config: BoardConfig, state: SearchState): string {
  if (isTextField(state.field) || isDateField(state.field)) return state.query;

  const match = searchValues(config, state.field).find((entry) => entry.value === state.query);
  return match?.label ?? state.query;
}

export function openSearchPanel(
  anchor: HTMLElement,
  config: BoardConfig,
  settings: TaskListSettings,
  state: SearchState,
  onChange: (next: SearchState) => void
): void {
  const rect = anchor.getBoundingClientRect();
  let field = state.field;
  let query = state.query;
  let timer = 0;

  const { el, close } = openPopover("tl-menu tl-search-panel", () => window.clearTimeout(timer));

  const emit = (): void => {
    window.clearTimeout(timer);
    onChange({ query, field });
  };

  const draw = (): void => {
    el.empty();

    el.createDiv({ cls: "tl-search-title", text: t("SEARCH_IN") });
    const picker = el.createDiv({ cls: "tl-search-types" });

    for (const entry of SEARCH_FIELDS) {
      const item = picker.createDiv({ cls: "tl-search-type" });
      setIcon(item.createSpan({ cls: "tl-menu-icon" }), SEARCH_ICONS[entry]);
      item.createSpan({ text: t(SEARCH_LABELS[entry]) });

      if (entry === field) item.addClass("is-current");

      item.addEventListener("click", (event) => {
        event.stopPropagation();
        if (entry === field) return;

        field = entry;
        query = "";
        draw();
        emit();
      });
    }

    el.createDiv({ cls: "tl-search-divider" });

    if (isTextField(field) || isDateField(field)) {
      const input = el.createEl("input", { cls: "tl-search-input" });
      input.type = isDateField(field) ? "date" : "text";
      input.value = query;

      if (isTextField(field)) {
        input.placeholder =
          settings.searchMode === "enter" ? t("SEARCH_HINT_ENTER") : t("SEARCH_PLACEHOLDER");
      }

      input.addEventListener("input", () => {
        query = input.value;

        if (isDateField(field)) {
          emit();
          return;
        }
        if (settings.searchMode === "enter") return;

        window.clearTimeout(timer);
        timer = window.setTimeout(emit, settings.searchDelay);
      });

      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          emit();
          return;
        }
        if (event.key === "Escape") {
          event.stopPropagation();
          window.clearTimeout(timer);
          close();
        }
      });

      window.setTimeout(() => {
        input.focus();
        if (isTextField(field)) input.setSelectionRange(query.length, query.length);
      }, 0);
    } else {
      const values = searchValues(config, field);
      if (values.length === 0) el.createDiv({ cls: "tl-search-empty", text: t("NO_TAGS") });

      for (const entry of values) {
        const item = el.createDiv({ cls: "tl-menu-item" });

        if (entry.icon === null) {
          const dot = item.createSpan({ cls: "tl-menu-dot" });
          if (entry.color !== null) dot.style.background = entry.color;
        } else {
          const icon = item.createSpan({ cls: "tl-menu-icon" });
          setIcon(icon, entry.icon);
          if (entry.color !== null) icon.style.color = readable(entry.color);
        }

        item.createSpan({ text: entry.label });

        if (entry.value === query) {
          item.addClass("is-current");
          setIcon(item.createSpan({ cls: "tl-menu-mark" }), "check");
        }

        item.addEventListener("click", (event) => {
          event.stopPropagation();
          query = entry.value === query ? "" : entry.value;
          draw();
          emit();
        });
      }
    }

    placePopoverAt(el, rect);
  };

  draw();
}
