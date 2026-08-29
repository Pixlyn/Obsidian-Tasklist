export interface Status {
  name: string;
  color: string;
}

export const DEFAULT_STATUSES: Status[] = [
  { name: "Todo", color: "#3b7dd8" },
  { name: "Completed", color: "#3f9d5a" }
];

export const DEFAULT_ARCHIVE: Status = { name: "Archive", color: "#6b7280" };

export const DEFAULT_ARCHIVE_FOLDER = "Archive";

export const DEFAULT_UNASSIGNED: Status = { name: "Unassigned", color: "#6b7280" };

export const DEFAULT_UNASSIGNED_FOLDER = "Unassigned";

export const FALLBACK_COLOR = "#565b63";

export const STATUS_PALETTE: string[] = [
  "#3b7dd8",
  "#3f9d5a",
  "#d98c3b",
  "#b5483d",
  "#8b5cd6",
  "#2f9e9e",
  "#c2508f",
  "#6b7280"
];

export function textOn(hex: string): string {
  const value = hex.replace("#", "");
  if (value.length !== 6) return "#f2f2f2";

  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.6 ? "#0b0b0b" : "#f2f2f2";
}

export function findStatus(statuses: Status[], name: string): Status | null {
  for (const status of statuses) {
    if (status.name === name) return status;
  }
  return null;
}
