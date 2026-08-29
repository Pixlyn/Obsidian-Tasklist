import { Notice, setIcon } from "obsidian";
import { t } from "../i18n";
import { textOn } from "../model/status";
import { isValidTag, sanitizeTag, Tag } from "../model/tag";
import { openPopover, placePopover } from "./popover";

export function openTagMenu(
  anchor: HTMLElement,
  known: Tag[],
  current: string[],
  onChange: (tags: string[]) => void
): void {
  const picked = [...current];
  const { el, close } = openPopover("tl-menu tl-tag-menu");

  const search = el.createEl("input", { cls: "tl-tag-search" });
  search.type = "text";
  search.placeholder = t("TAG_SEARCH_PLACEHOLDER");

  const list = el.createDiv({ cls: "tl-tag-options" });

  const toggle = (name: string): void => {
    const index = picked.indexOf(name);
    if (index >= 0) picked.splice(index, 1);
    else picked.push(name);
    onChange([...picked]);
    draw();
  };

  const names = (): string[] => {
    const all = known.map((tag) => tag.name);
    for (const name of picked) {
      if (!all.includes(name)) all.push(name);
    }
    return all;
  };

  const colorOf = (name: string): string | null => {
    const tag = known.find((entry) => entry.name === name);
    return tag === undefined ? null : tag.color;
  };

  function draw(): void {
    list.empty();
    const query = sanitizeTag(search.value).toLowerCase();

    const matches = names().filter((name) => name.toLowerCase().includes(query));
    for (const name of matches) {
      const item = list.createDiv({ cls: "tl-menu-item" });
      const color = colorOf(name);

      const chip = item.createSpan({ cls: "tl-tag-chip", text: name });
      if (color !== null) {
        chip.style.background = color;
        chip.style.color = textOn(color);
      }

      if (picked.includes(name)) {
        item.addClass("is-current");
        setIcon(item.createSpan({ cls: "tl-menu-mark" }), "check");
      }

      item.addEventListener("click", (event) => {
        event.stopPropagation();
        toggle(name);
      });
    }

    const fresh = sanitizeTag(search.value);
    if (isValidTag(fresh) && !names().includes(fresh)) {
      const item = list.createDiv({ cls: "tl-menu-item" });
      setIcon(item.createSpan({ cls: "tl-menu-flag" }), "plus");
      item.createSpan({ text: t("CREATE_TAG", { name: fresh }) });
      item.addEventListener("click", (event) => {
        event.stopPropagation();
        search.value = "";
        toggle(fresh);
        search.focus();
      });
    }

    placePopover(el, anchor);
  }

  search.addEventListener("input", draw);
  search.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      close();
      return;
    }
    if (event.key !== "Enter") return;

    const value = sanitizeTag(search.value);
    if (!isValidTag(value)) {
      if (value.length > 0) new Notice(t("INVALID_TAG"));
      return;
    }
    search.value = "";
    toggle(value);
  });

  draw();
  search.focus();
}
