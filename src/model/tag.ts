export interface Tag {
  name: string;
  color: string;
}

export const TAG_PALETTE: string[] = [
  "#b5483d",
  "#d98c3b",
  "#3f9d5a",
  "#2f9e9e",
  "#3b7dd8",
  "#8b5cd6",
  "#c2508f",
  "#6b7280"
];

export const TAG_FALLBACK_COLOR = "#565b63";

export function findTag(tags: Tag[], name: string): Tag | null {
  for (const tag of tags) {
    if (tag.name === name) return tag;
  }
  return null;
}

export function sanitizeTag(name: string): string {
  return name
    .trim()
    .replace(/[#\s]+/g, "-")
    .replace(/[^\p{L}\p{N}_\-/]/gu, "")
    .replace(/^-+|-+$/g, "");
}

// Obsidian refuses a tag made only of digits, "-", "_" or "/".
export function isValidTag(name: string): boolean {
  return name.length > 0 && !/^[\p{N}_\-/]+$/u.test(name);
}
