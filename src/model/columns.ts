import { TranslationKey } from "../i18n/en";
import { BoardField } from "./field";

export type BuiltinColumn = "name" | "status" | "tags" | "priority" | "created" | "due";

export type FieldColumn = `field:${string}`;

export type ColumnKey = BuiltinColumn | FieldColumn;

export const BUILTIN_COLUMNS: BuiltinColumn[] = [
  "name",
  "status",
  "tags",
  "priority",
  "created",
  "due"
];

export const DEFAULT_COLUMNS: ColumnKey[] = [
  "status",
  "name",
  "tags",
  "priority",
  "created",
  "due"
];

export const DEFAULT_HIDDEN: ColumnKey[] = ["created"];

export const FIXED_COLUMNS: ColumnKey[] = ["status", "name"];

export const COLUMN_LABELS: Record<BuiltinColumn, TranslationKey> = {
  name: "COLUMN_NAME",
  status: "COLUMN_STATUS",
  tags: "TAGS",
  priority: "PRIORITY",
  created: "COLUMN_CREATED",
  due: "DUE_DATE"
};

export const COLUMN_VARIABLE = "--tl-col";

export const MIN_COLUMN_WIDTH = 100;
export const MAX_COLUMN_WIDTH = 480;

export const DEFAULT_COLUMN_WIDTH = 130;

export const NAME_SHARE = 0.5;

export interface RowEditResult {
  columns: ColumnKey[];
  hidden: ColumnKey[];
  fields: BoardField[];
  // Deleting a field strips its property from the notes too.
  removed: string[];
}

export function fieldColumn(key: string): FieldColumn {
  return `field:${key}`;
}

export function fieldOf(column: ColumnKey): string | null {
  return column.startsWith("field:") ? column.slice("field:".length) : null;
}

export function isBuiltinColumn(value: string): value is BuiltinColumn {
  return BUILTIN_COLUMNS.some((key) => key === value);
}

export function isColumnKey(value: string): value is ColumnKey {
  if (isBuiltinColumn(value)) return true;
  return value.startsWith("field:") && value.length > "field:".length;
}

export function isSizable(key: ColumnKey): boolean {
  return !FIXED_COLUMNS.includes(key);
}

export function clampColumnWidth(width: number): number {
  if (!Number.isFinite(width)) return MIN_COLUMN_WIDTH;
  return Math.round(Math.min(Math.max(width, MIN_COLUMN_WIDTH), MAX_COLUMN_WIDTH));
}

// More columns, lower ceiling: the name column always keeps its share.
export function fitColumnWidth(width: number, count: number, available: number): number {
  const room = count > 0 ? (available * NAME_SHARE) / count : MAX_COLUMN_WIDTH;
  const limit = Math.max(MIN_COLUMN_WIDTH, Math.min(MAX_COLUMN_WIDTH, room));
  return clampColumnWidth(Math.min(width, limit));
}

// Rescues a stored order after fields come and go.
export function normalizeColumns(order: ColumnKey[], fields: BoardField[]): ColumnKey[] {
  const known = fields.map((field) => fieldColumn(field.key));

  const seen: ColumnKey[] = [];
  for (const key of order) {
    if (seen.includes(key)) continue;
    if (isBuiltinColumn(key) || known.includes(key)) seen.push(key);
  }
  for (const key of DEFAULT_COLUMNS) {
    if (!seen.includes(key)) seen.push(key);
  }
  for (const key of known) {
    if (!seen.includes(key)) seen.push(key);
  }
  if (!seen.includes("name")) seen.unshift("name");
  return seen;
}
