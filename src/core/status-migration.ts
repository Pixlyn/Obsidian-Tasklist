import { App, TFile, TFolder } from "obsidian";
import { BoardConfig } from "../model/board-config";
import { folderForStatus } from "./folder-sync";
import { setStatus } from "./task-mutations";

export interface StatusRename {
  from: string;
  to: string;
}

export interface StatusRemoval {
  from: string;
  to: string;
}

export interface StatusMigration {
  renames: StatusRename[];
  removals: StatusRemoval[];
}

export function emptyMigration(): StatusMigration {
  return { renames: [], removals: [] };
}

async function renameFolder(
  app: App,
  before: BoardConfig,
  after: BoardConfig,
  rename: StatusRename
): Promise<void> {
  if (!after.moveFiles) return;

  const source = folderForStatus(before, rename.from);
  const target = folderForStatus(after, rename.to);
  if (source.length === 0 || source === target) return;

  const folder = app.vault.getAbstractFileByPath(source);
  if (!(folder instanceof TFolder)) return;
  if (app.vault.getAbstractFileByPath(target) !== null) return;

  await app.fileManager.renameFile(folder, target);
}

export async function migrateStatuses(
  app: App,
  before: BoardConfig,
  after: BoardConfig,
  migration: StatusMigration,
  filesOf: (statusName: string) => TFile[]
): Promise<void> {
  for (const removal of migration.removals) {
    for (const file of filesOf(removal.from)) {
      await setStatus(app, after, file, removal.to);
    }
  }

  for (const rename of migration.renames) {
    const files = filesOf(rename.from);
    await renameFolder(app, before, after, rename);
    for (const file of files) {
      await setStatus(app, after, file, rename.to);
    }
  }
}
