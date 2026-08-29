import { clampColumnWidth, DEFAULT_COLUMN_WIDTH } from "./model/columns";

export interface TaskListSettings {
  version: number;
  collapsed: Record<string, string[]>;
  openOnCreate: boolean;
  confirmDelete: boolean;
  keepAdding: boolean;
  columnWidth: number;
  tasksFolder: string;
  moveFiles: boolean;
}

export const DEFAULT_TASKS_FOLDER = "Tasks";

export const DEFAULT_SETTINGS: TaskListSettings = {
  version: 1,
  collapsed: {},
  openOnCreate: false,
  confirmDelete: true,
  keepAdding: false,
  columnWidth: DEFAULT_COLUMN_WIDTH,
  tasksFolder: DEFAULT_TASKS_FOLDER,
  moveFiles: true
};

export function normalizeTasksFolder(name: string): string {
  const clean = name
    .replace(/[\\/:*?"<>|#^[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return clean.length === 0 ? DEFAULT_TASKS_FOLDER : clean;
}

export interface SettingsStore {
  settings: TaskListSettings;
  saveSettings(): Promise<void>;
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

  const folder = record["tasksFolder"];
  if (typeof folder === "string") settings.tasksFolder = normalizeTasksFolder(folder);

  const width = record["columnWidth"];
  if (typeof width === "number") settings.columnWidth = clampColumnWidth(width);

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
