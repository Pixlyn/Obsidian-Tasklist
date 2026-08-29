import { App, FrontMatterCache, TFile, TFolder } from "obsidian";
import { allStatuses, BoardConfig } from "../model/board-config";
import { isIsoDate } from "../model/due-date";
import { BoardField, isFieldValue } from "../model/field";
import { findPriority, PriorityKey } from "../model/priority";
import { sanitizeTag } from "../model/tag";
import { TaskGroup } from "../model/task";

function readText(frontmatter: FrontMatterCache | undefined, key: string): string | null {
  if (frontmatter === undefined) return null;
  const value: unknown = frontmatter[key];
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readNumber(frontmatter: FrontMatterCache | undefined, key: string): number | null {
  if (frontmatter === undefined) return null;
  const value: unknown = frontmatter[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function readTags(frontmatter: FrontMatterCache | undefined): string[] {
  if (frontmatter === undefined) return [];
  const value: unknown = frontmatter["tags"];

  const raw: unknown[] = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];

  const tags: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== "string") continue;
    const name = sanitizeTag(entry);
    if (name.length > 0 && !tags.includes(name)) tags.push(name);
  }
  return tags;
}

function readPriority(frontmatter: FrontMatterCache | undefined): PriorityKey | null {
  const value = readText(frontmatter, "priority");
  return value === null ? null : (findPriority(value.toLowerCase())?.key ?? null);
}

function readFields(
  frontmatter: FrontMatterCache | undefined,
  fields: BoardField[]
): Record<string, string> {
  const values: Record<string, string> = {};
  if (frontmatter === undefined) return values;

  for (const field of fields) {
    const raw: unknown = frontmatter[field.key];
    const value =
      typeof raw === "boolean"
        ? String(raw)
        : typeof raw === "number" && Number.isFinite(raw)
          ? String(raw)
          : typeof raw === "string"
            ? raw.trim()
            : "";

    values[field.key] = isFieldValue(value, field.type) ? value : "";
  }
  return values;
}

function collectFiles(folder: TFolder, into: TFile[]): void {
  for (const child of folder.children) {
    if (child instanceof TFolder) {
      collectFiles(child, into);
    } else if (child instanceof TFile && child.extension === "md") {
      into.push(child);
    }
  }
}

export function resolveFolder(app: App, path: string): TFolder | null {
  if (path.length === 0) return app.vault.getRoot();
  const folder = app.vault.getAbstractFileByPath(path);
  return folder instanceof TFolder ? folder : null;
}

function emptyGroups(config: BoardConfig): TaskGroup[] {
  return allStatuses(config).map((status) => ({
    status,
    tasks: [],
    isArchive: status.name === config.archive.name,
    isUnassigned: status.name === config.unassigned.name
  }));
}

export function collectTasks(app: App, config: BoardConfig, boardPath: string): TaskGroup[] {
  const groups = emptyGroups(config);
  const folder = resolveFolder(app, config.folder);
  if (folder === null) return groups;

  const files: TFile[] = [];
  collectFiles(folder, files);

  const byName = new Map<string, TaskGroup>();
  for (const group of groups) byName.set(group.status.name, group);

  const unassignedGroup = byName.get(config.unassigned.name) ?? groups[0];

  for (const file of files) {
    if (file.path === boardPath) continue;

    const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
    const name = readText(frontmatter, "status");
    const order = readNumber(frontmatter, "order");
    const due = readText(frontmatter, "due");

    let group = unassignedGroup;
    let unknown = false;

    if (name !== null) {
      const match = byName.get(name);
      if (match !== undefined) group = match;
      else unknown = true;
    }

    group.tasks.push({
      file,
      title: file.basename,
      status: group.status.name,
      rawStatus: name ?? group.status.name,
      order: order ?? Number.MAX_SAFE_INTEGER,
      unknown,
      priority: readPriority(frontmatter),
      due: due !== null && isIsoDate(due) ? due : "",
      tags: readTags(frontmatter),
      created: readText(frontmatter, "created") ?? "",
      fields: readFields(frontmatter, config.fields)
    });
  }

  for (const group of groups) {
    group.tasks.sort((left, right) => {
      if (left.order !== right.order) return left.order - right.order;
      return left.title.localeCompare(right.title);
    });
  }

  return groups;
}
