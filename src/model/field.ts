import { TranslationKey } from "../i18n/en";

export type FieldType = "text" | "number" | "date" | "time" | "toggle";

export const FIELD_TYPES: FieldType[] = ["text", "number", "date", "time", "toggle"];

export const FIELD_TYPE_LABELS: Record<FieldType, TranslationKey> = {
  text: "FIELD_TEXT",
  number: "FIELD_NUMBER",
  date: "FIELD_DATE",
  time: "FIELD_TIME",
  toggle: "FIELD_TOGGLE"
};

export const FIELD_TYPE_ICONS: Record<FieldType, string> = {
  text: "type",
  number: "hash",
  date: "calendar",
  time: "clock",
  toggle: "toggle-left"
};

export interface BoardField {
  key: string;
  name: string;
  type: FieldType;
}

export function isFieldType(value: string): value is FieldType {
  return FIELD_TYPES.some((type) => type === value);
}

// The key becomes a frontmatter property, so it stays plain and stable.
export function fieldKeyFor(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}_-]/gu, "")
    .replace(/^-+|-+$/g, "");
}

export function findField(fields: BoardField[], key: string): BoardField | null {
  for (const field of fields) {
    if (field.key === key) return field;
  }
  return null;
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isFieldValue(value: string, type: FieldType): boolean {
  if (value.length === 0) return true;
  if (type === "number") return Number.isFinite(Number(value));
  if (type === "time") return TIME.test(value);
  if (type === "toggle") return value === "true" || value === "false";
  return true;
}
