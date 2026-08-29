import { t } from "../i18n";
import { visibleColumns } from "../model/board-config";
import {
  COLUMN_LABELS,
  COLUMN_VARIABLE,
  ColumnKey,
  fieldOf,
  fitColumnWidth,
  isBuiltinColumn,
  isSizable
} from "../model/columns";
import { findField } from "../model/field";
import { BoardHost } from "./board-host";

interface Column {
  cell: HTMLElement;
  label: string;
  key: ColumnKey;
}

function describe(column: Column, width: number): void {
  column.cell.setAttribute("aria-label", `${column.label} · ${width}px`);
}

function attachResize(
  column: Column,
  host: BoardHost,
  grip: HTMLElement,
  side: 1 | -1,
  // How many columns sit between this edge and the end of the row: they all
  // move with it, so the shared width must grow that much slower to keep the
  // divider under the pointer.
  weight: number
): void {
  grip.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();

    const root = grip.closest(".tl-board");
    if (!(root instanceof HTMLElement)) return;

    const startX = event.clientX;
    const startWidth = host.columnWidth();
    grip.addClass("is-active");

    const count = visibleColumns(host.config).filter(isSizable).length;

    const widthAt = (moved: PointerEvent): number => {
      const delta = ((moved.clientX - startX) * side) / Math.max(weight, 1);
      return fitColumnWidth(startWidth + delta, count, root.clientWidth);
    };

    const move = (moved: PointerEvent): void => {
      const width = widthAt(moved);
      root.style.setProperty(COLUMN_VARIABLE, `${width}px`);
      describe(column, width);
    };

    const up = (moved: PointerEvent): void => {
      move(moved);
      grip.removeClass("is-active");
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);
      host.setColumnWidth(widthAt(moved));
    };

    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up);
  });
}

function renderColumn(
  head: HTMLElement,
  host: BoardHost,
  key: ColumnKey,
  weight: number,
  last: boolean
): void {
  const field = fieldOf(key);
  const cell = head.createDiv({
    cls: field === null ? `tl-col tl-col-${key}` : "tl-col tl-col-field"
  });

  const label =
    field === null && isBuiltinColumn(key)
      ? t(COLUMN_LABELS[key])
      : (findField(host.config.fields, field ?? "")?.name ?? "");
  const column: Column = { cell, key, label };

  // The status dot needs no heading; it just holds the column's place.
  if (key !== "status") cell.createSpan({ cls: "tl-col-label", text: column.label });
  if (!isSizable(key)) return;

  describe(column, host.columnWidth());

  attachResize(column, host, cell.createDiv({ cls: "tl-col-grip is-start" }), -1, weight);
  if (last) attachResize(column, host, cell.createDiv({ cls: "tl-col-grip is-end" }), 1, 1);
}

export function renderColumnHead(parent: HTMLElement, host: BoardHost): void {
  const head = parent.createDiv({ cls: "tl-columns" });
  head.createSpan({ cls: "tl-col-lead" });

  const columns = visibleColumns(host.config);
  const sized = columns.filter(isSizable);
  const lastSizable = sized.length === 0 ? null : sized[sized.length - 1];

  for (const key of columns) {
    const index = sized.indexOf(key);
    const weight = index < 0 ? 1 : sized.length - index;
    renderColumn(head, host, key, weight, key === lastSizable);
  }

  head.createSpan({ cls: "tl-col-trail" });
}
