import { parseYaml } from "obsidian";
import {
  ColumnKey,
  DEFAULT_COLUMNS,
  DEFAULT_HIDDEN,
  isColumnKey,
  normalizeColumns
} from "./columns";
import { BoardField, fieldKeyFor, isFieldType } from "./field";
import {
  DEFAULT_ARCHIVE,
  DEFAULT_ARCHIVE_FOLDER,
  DEFAULT_STATUSES,
  DEFAULT_UNASSIGNED,
  DEFAULT_UNASSIGNED_FOLDER,
  FALLBACK_COLOR,
  Status
} from "./status";
import { sanitizeTag, Tag, TAG_FALLBACK_COLOR } from "./tag";

export const CODE_BLOCK = "tasklist";

export interface BoardConfig {
  folder: string;
  archive: Status;
  archiveFolder: string;
  unassigned: Status;
  unassignedFolder: string;
  unassignedIndex: number;
  moveFiles: boolean;
  note: string;
  statuses: Status[];
  tags: Tag[];
  columns: ColumnKey[];
  hidden: ColumnKey[];
  fields: BoardField[];
}

export function visibleColumns(config: BoardConfig): ColumnKey[] {
  return normalizeColumns(config.columns, config.fields).filter(
    (key) => key === "name" || key === "status" || !config.hidden.includes(key)
  );
}

export function allStatuses(config: BoardConfig): Status[] {
  const statuses = [...config.statuses];
  statuses.splice(unassignedIndex(config), 0, config.unassigned);
  statuses.push(config.archive);
  return statuses;
}

export function unassignedIndex(config: BoardConfig): number {
  return Math.min(Math.max(config.unassignedIndex, 0), config.statuses.length);
}

export interface ParseResult {
  config: BoardConfig;
  error: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(source: Record<string, unknown>, key: string): string | null {
  const value = source[key];
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readStatuses(value: unknown): Status[] | null {
  if (!Array.isArray(value)) return null;

  const statuses: Status[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) continue;
    const name = readString(entry, "name");
    if (name === null) continue;
    const color = readString(entry, "color");
    statuses.push({ name, color: color ?? FALLBACK_COLOR });
  }
  return statuses.length > 0 ? statuses : null;
}

function readColumns(value: unknown): ColumnKey[] | null {
  if (!Array.isArray(value)) return null;

  const keys: ColumnKey[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") continue;
    const key = entry.trim();
    if (isColumnKey(key) && !keys.includes(key)) keys.push(key);
  }
  return keys.length > 0 ? keys : null;
}

function readFields(value: unknown): BoardField[] {
  if (!Array.isArray(value)) return [];

  const fields: BoardField[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) continue;

    const name = readString(entry, "name");
    if (name === null) continue;

    const key = fieldKeyFor(readString(entry, "key") ?? name);
    if (key.length === 0 || fields.some((field) => field.key === key)) continue;

    const type = readString(entry, "type") ?? "text";
    fields.push({ key, name, type: isFieldType(type) ? type : "text" });
  }
  return fields;
}

function readTags(value: unknown): Tag[] {
  if (!Array.isArray(value)) return [];

  const tags: Tag[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) continue;
    const raw = readString(entry, "name");
    if (raw === null) continue;

    const name = sanitizeTag(raw);
    if (name.length === 0 || tags.some((tag) => tag.name === name)) continue;

    const color = readString(entry, "color");
    tags.push({ name, color: color ?? TAG_FALLBACK_COLOR });
  }
  return tags;
}

export function defaultBoardConfig(): BoardConfig {
  return {
    folder: "",
    archive: { ...DEFAULT_ARCHIVE },
    archiveFolder: DEFAULT_ARCHIVE_FOLDER,
    unassigned: { ...DEFAULT_UNASSIGNED },
    unassignedFolder: DEFAULT_UNASSIGNED_FOLDER,
    unassignedIndex: 0,
    moveFiles: true,
    note: "",
    statuses: DEFAULT_STATUSES.map((status) => ({ ...status })),
    tags: [],
    columns: [...DEFAULT_COLUMNS],
    hidden: [...DEFAULT_HIDDEN],
    fields: []
  };
}

export function parseBoardConfig(source: string): ParseResult {
  const config = defaultBoardConfig();

  if (source.trim().length === 0) {
    return { config, error: null };
  }

  let parsed: unknown;
  try {
    parsed = parseYaml(source);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { config, error: message };
  }

  if (!isRecord(parsed)) {
    return { config, error: "Block content must be a mapping." };
  }

  const folder = readString(parsed, "folder");
  if (folder === null) {
    return { config, error: "`folder` is required." };
  }
  config.folder = folder.replace(/^\/+|\/+$/g, "");

  const archiveFolder = readString(parsed, "archiveFolder");
  if (archiveFolder !== null) config.archiveFolder = archiveFolder;

  const archive = readString(parsed, "archive");
  if (archive !== null) config.archive.name = archive;

  const archiveColor = readString(parsed, "archiveColor");
  if (archiveColor !== null) config.archive.color = archiveColor;

  const unassignedFolder = readString(parsed, "unassignedFolder");
  if (unassignedFolder !== null) config.unassignedFolder = unassignedFolder;

  const unassigned = readString(parsed, "unassigned");
  if (unassigned !== null) config.unassigned.name = unassigned;

  const unassignedColor = readString(parsed, "unassignedColor");
  if (unassignedColor !== null) config.unassigned.color = unassignedColor;

  const index = parsed["unassignedIndex"];
  if (typeof index === "number" && Number.isInteger(index) && index >= 0) {
    config.unassignedIndex = index;
  }

  if (typeof parsed["moveFiles"] === "boolean") config.moveFiles = parsed["moveFiles"];

  const note = readString(parsed, "note");
  if (note !== null) config.note = note;

  const statuses = readStatuses(parsed["statuses"]);
  if (statuses !== null) config.statuses = statuses;

  config.tags = readTags(parsed["tags"]);

  config.fields = readFields(parsed["fields"]);

  const columns = readColumns(parsed["columns"]);
  if (columns !== null) {
    config.columns = normalizeColumns(columns, config.fields);
    // Anything the block leaves out is a column the user turned off.
    config.hidden = config.columns.filter((key) => key !== "name" && !columns.includes(key));
  }

  if (Array.isArray(parsed["hidden"])) {
    config.hidden = (readColumns(parsed["hidden"]) ?? []).filter((key) => key !== "name");
  }

  return { config, error: null };
}

function quote(value: string): string {
  return JSON.stringify(value);
}

export function serializeBoardConfig(config: BoardConfig): string {
  const lines: string[] = [`folder: ${quote(config.folder.length === 0 ? "/" : config.folder)}`];

  if (config.archive.name !== DEFAULT_ARCHIVE.name) {
    lines.push(`archive: ${quote(config.archive.name)}`);
  }
  if (config.archive.color !== DEFAULT_ARCHIVE.color) {
    lines.push(`archiveColor: ${quote(config.archive.color)}`);
  }
  if (config.archiveFolder !== DEFAULT_ARCHIVE_FOLDER) {
    lines.push(`archiveFolder: ${quote(config.archiveFolder)}`);
  }
  if (config.unassigned.name !== DEFAULT_UNASSIGNED.name) {
    lines.push(`unassigned: ${quote(config.unassigned.name)}`);
  }
  if (config.unassigned.color !== DEFAULT_UNASSIGNED.color) {
    lines.push(`unassignedColor: ${quote(config.unassigned.color)}`);
  }
  if (config.unassignedFolder !== DEFAULT_UNASSIGNED_FOLDER) {
    lines.push(`unassignedFolder: ${quote(config.unassignedFolder)}`);
  }
  if (unassignedIndex(config) !== 0) lines.push(`unassignedIndex: ${unassignedIndex(config)}`);
  if (!config.moveFiles) lines.push("moveFiles: false");
  if (config.note.length > 0) lines.push(`note: ${JSON.stringify(config.note)}`);

  lines.push("statuses:");
  for (const status of config.statuses) {
    lines.push(`  - name: ${quote(status.name)}`);
    lines.push(`    color: ${quote(status.color)}`);
  }

  if (config.tags.length > 0) {
    lines.push("tags:");
    for (const tag of config.tags) {
      lines.push(`  - name: ${quote(tag.name)}`);
      lines.push(`    color: ${quote(tag.color)}`);
    }
  }

  if (config.fields.length > 0) {
    lines.push("fields:");
    for (const field of config.fields) {
      lines.push(`  - key: ${quote(field.key)}`);
      lines.push(`    name: ${quote(field.name)}`);
      lines.push(`    type: ${quote(field.type)}`);
    }
  }

  const columns = normalizeColumns(config.columns, config.fields);
  if (columns.join(",") !== DEFAULT_COLUMNS.join(",")) {
    lines.push("columns:");
    for (const key of columns) lines.push(`  - ${key}`);
  }

  const hidden = columns.filter((key) => key !== "name" && config.hidden.includes(key));
  if (hidden.join(",") !== DEFAULT_HIDDEN.join(",")) {
    if (hidden.length === 0) {
      lines.push("hidden: []");
    } else {
      lines.push("hidden:");
      for (const key of hidden) lines.push(`  - ${key}`);
    }
  }

  return lines.join("\n") + "\n";
}
