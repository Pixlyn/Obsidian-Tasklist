export interface Popover {
  el: HTMLElement;
  close: () => void;
}

// Open popovers live on document.body, so the plugin closes them on unload.
const open = new Set<() => void>();

export function closeAllPopovers(): void {
  for (const close of [...open]) close();
}

export function openPopover(cls: string, onClose: () => void = () => undefined): Popover {
  const el = document.body.createDiv({ cls });
  let closed = false;

  const close = (): void => {
    if (closed) return;
    closed = true;
    open.delete(close);

    el.detach();
    document.removeEventListener("pointerdown", onOutside, true);
    document.removeEventListener("keydown", onKey, true);
    window.removeEventListener("resize", close);
    onClose();
  };

  function onOutside(event: PointerEvent): void {
    if (event.target instanceof Node && el.contains(event.target)) return;
    close();
  }

  function onKey(event: KeyboardEvent): void {
    if (event.key === "Escape") close();
  }

  open.add(close);

  window.setTimeout(() => {
    document.addEventListener("pointerdown", onOutside, true);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", close);
  }, 0);

  return { el, close };
}

export function placePopover(el: HTMLElement, anchor: HTMLElement): void {
  placePopoverAt(el, anchor.getBoundingClientRect());
}

// A redrawing panel reuses its opening rect: a detached anchor reports 0, 0.
export function placePopoverAt(el: HTMLElement, rect: DOMRect): void {
  const width = el.offsetWidth;
  const height = el.offsetHeight;

  const left = Math.min(rect.left, window.innerWidth - width - 8);
  const below = rect.bottom + 4;
  const top = below + height > window.innerHeight ? rect.top - height - 4 : below;

  el.style.left = `${Math.max(8, left)}px`;
  el.style.top = `${Math.max(8, top)}px`;
}
