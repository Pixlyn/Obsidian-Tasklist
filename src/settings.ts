import { isLanguage, SYSTEM_LANGUAGE } from "./i18n";
import { clampColumnWidth, DEFAULT_COLUMN_WIDTH } from "./model/columns";

export type SearchMode = "type" | "enter";

export type StatusDot = "outline" | "filled";

export interface TaskListSettings {
  version: number;
  collapsed: Record<string, string[]>;
  openOnCreate: boolean;
  confirmDelete: boolean;
  keepAdding: boolean;
  columnWidth: number;
  moveFiles: boolean;
  language: string;
  searchMode: SearchMode;
  searchDelay: number;
  statusDot: StatusDot;
}

export const DEFAULT_TASKS_FOLDER = "Tasks";

export const MIN_SEARCH_DELAY = 0;
export const MAX_SEARCH_DELAY = 3000;
export const DEFAULT_SEARCH_DELAY = 1000;

export const DEFAULT_SETTINGS: TaskListSettings = {
  version: 1,
  collapsed: {},
  openOnCreate: false,
  confirmDelete: true,
  keepAdding: false,
  columnWidth: DEFAULT_COLUMN_WIDTH,
  moveFiles: true,
  language: SYSTEM_LANGUAGE,
  searchMode: "type",
  searchDelay: DEFAULT_SEARCH_DELAY,
  statusDot: "outline"
};

export function clampSearchDelay(delay: number): number {
  if (!Number.isFinite(delay)) return DEFAULT_SEARCH_DELAY;
  return Math.round(Math.min(Math.max(delay, MIN_SEARCH_DELAY), MAX_SEARCH_DELAY));
}

export function isSearchMode(value: string): value is SearchMode {
  return value === "type" || value === "enter";
}

export function isStatusDot(value: string): value is StatusDot {
  return value === "outline" || value === "filled";
}

export interface SettingsStore {
  settings: TaskListSettings;
  saveSettings(): Promise<void>;
  onSettingsChange(listener: () => void): () => void;
}

export function mergeSettings(loaded: unknown): TaskListSettings {
  const settings: TaskListSettings = { ...DEFAULT_SETTINGS, collapsed: {} };
  if (typeof loaded !== "object" || loaded === null || Array.isArray(loaded)) return settings;

  const record: Record<string, unknown> = { ...loaded };

  if (typeof record["openOnCreate"] === "boolean") settings.openOnCreate = record["openOnCreate"];
  if (typeof record["confirmDelete"] === "boolean")
    settings.confirmDelete = record["confirmDelete"];
  if (typeof record["keepAdding"] === "boolean") settings.keepAdding = record["keepAdding"];
  if (typeof record["moveFiles"] === "boolean") settings.moveFiles = record["moveFiles"];

  const width = record["columnWidth"];
  if (typeof width === "number") settings.columnWidth = clampColumnWidth(width);

  const language = record["language"];
  if (typeof language === "string" && isLanguage(language)) settings.language = language;

  const mode = record["searchMode"];
  if (typeof mode === "string" && isSearchMode(mode)) settings.searchMode = mode;

  const delay = record["searchDelay"];
  if (typeof delay === "number") settings.searchDelay = clampSearchDelay(delay);

  const dot = record["statusDot"];
  if (typeof dot === "string" && isStatusDot(dot)) settings.statusDot = dot;

  const collapsed = record["collapsed"];
  if (typeof collapsed === "object" && collapsed !== null && !Array.isArray(collapsed)) {
    const source: Record<string, unknown> = { ...collapsed };
    for (const key of Object.keys(source)) {
      const value = source[key];
      if (!Array.isArray(value)) continue;
      settings.collapsed[key] = value.filter((entry): entry is string => typeof entry === "string");
    }
  }

  return settings;
}
