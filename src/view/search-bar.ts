import { setIcon } from "obsidian";
import { t } from "../i18n";
import { isSearching, SEARCH_ICONS, SEARCH_LABELS } from "../model/search";
import { openSearchPanel, searchLabel } from "../ui/search-box";
import { BoardHost } from "./board-host";

export function renderSearch(parent: HTMLElement, host: BoardHost): void {
  const state = host.search();
  const active = isSearching(state);

  const button = parent.createEl("button", {
    cls: active ? "tl-btn tl-search-btn is-active" : "tl-btn tl-icon-only",
    attr: { title: active ? t(SEARCH_LABELS[state.field]) : t("SEARCH") }
  });

  setIcon(
    button.createSpan({ cls: "tl-search-btn-icon" }),
    active ? SEARCH_ICONS[state.field] : "search"
  );

  button.addEventListener("click", () => {
    openSearchPanel(button, host.config, host.store.settings, state, (next) => {
      host.setSearch(next);
    });
  });

  if (!active) return;

  button.createSpan({ cls: "tl-search-btn-text", text: searchLabel(host.config, state) });

  const clear = button.createSpan({ cls: "tl-search-clear" });
  setIcon(clear, "x");
  clear.setAttribute("aria-label", t("SEARCH_CLEAR"));

  clear.addEventListener("click", (event) => {
    event.stopPropagation();
    host.setSearch({ query: "", field: state.field });
  });
}
