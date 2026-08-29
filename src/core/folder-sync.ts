import { TFolder, Vault } from "obsidian";
import { allStatuses, BoardConfig } from "../model/board-config";

const ILLEGAL = /[\\/:*?"<>|#^[\]]/g;

export function sanitizeName(name: string): string {
  return name.replace(ILLEGAL, " ").replace(/\s+/g, " ").trim();
}

export function folderForStatus(config: BoardConfig, statusName: string): string {
  let name = statusName;
  if (statusName === config.archive.name) name = config.archiveFolder;
  else if (statusName === config.unassigned.name) name = config.unassignedFolder;

  const leaf = sanitizeName(name);
  if (leaf.length === 0) return config.folder;
  return config.folder.length === 0 ? leaf : `${config.folder}/${leaf}`;
}

export async function ensureFolder(vault: Vault, path: string): Promise<void> {
  if (path.length === 0) return;

  const segments = path.split("/");
  let current = "";
  for (const segment of segments) {
    current = current.length === 0 ? segment : `${current}/${segment}`;
    if (vault.getAbstractFileByPath(current) instanceof TFolder) continue;
    await vault.createFolder(current);
  }
}

export function boardFolders(config: BoardConfig): string[] {
  const paths: string[] = [];
  if (config.folder.length > 0) paths.push(config.folder);

  for (const status of allStatuses(config)) {
    const path = folderForStatus(config, status.name);
    if (path.length > 0 && !paths.includes(path)) paths.push(path);
  }
  return paths;
}

export async function ensureBoardFolders(vault: Vault, config: BoardConfig): Promise<void> {
  for (const path of boardFolders(config)) {
    await ensureFolder(vault, path);
  }
}

export function freePath(vault: Vault, folder: string, basename: string): string {
  const prefix = folder.length === 0 ? "" : `${folder}/`;

  let path = `${prefix}${basename}.md`;
  let index = 1;
  while (vault.getAbstractFileByPath(path) !== null) {
    index += 1;
    path = `${prefix}${basename} ${index}.md`;
  }
  return path;
}
