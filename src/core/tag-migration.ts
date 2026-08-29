import { App, TFile } from "obsidian";
import { TaskItem } from "../model/task";
import { setTags } from "./task-mutations";

export interface TagRename {
  from: string;
  to: string;
}

export interface TagMigration {
  renames: TagRename[];
  removals: string[];
}

export function isEmptyTagMigration(migration: TagMigration): boolean {
  return migration.renames.length === 0 && migration.removals.length === 0;
}

function nextTags(tags: string[], renames: Map<string, string>, removals: Set<string>): string[] {
  const next: string[] = [];
  for (const tag of tags) {
    if (removals.has(tag)) continue;

    const renamed = renames.get(tag) ?? tag;
    if (!next.includes(renamed)) next.push(renamed);
  }
  return next;
}

function same(before: string[], after: string[]): boolean {
  return before.length === after.length && before.every((tag, index) => tag === after[index]);
}

export async function migrateTags(
  app: App,
  tasks: TaskItem[],
  migration: TagMigration
): Promise<void> {
  if (isEmptyTagMigration(migration)) return;

  const renames = new Map(migration.renames.map((rename) => [rename.from, rename.to]));
  const removals = new Set(migration.removals);

  const seen = new Set<string>();
  for (const task of tasks) {
    if (seen.has(task.file.path)) continue;
    seen.add(task.file.path);

    const next = nextTags(task.tags, renames, removals);
    if (same(task.tags, next)) continue;

    const file: TFile = task.file;
    await setTags(app, file, next);
  }
}
