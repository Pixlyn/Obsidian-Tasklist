import { App, TFile } from "obsidian";
import { BoardConfig } from "../model/board-config";
import { today } from "../model/due-date";
import { BoardField } from "../model/field";
import { PriorityKey } from "../model/priority";
import { ensureFolder, folderForStatus, freePath, sanitizeName } from "./folder-sync";

// One unreadable note must not hold back the rest of the batch.
async function eachFile(files: TFile[], work: (file: TFile) => Promise<void>): Promise<void> {
  let failure: unknown = null;

  for (const file of files) {
    try {
      await work(file);
    } catch (error) {
      failure ??= error;
    }
  }

  if (failure !== null) throw failure;
}

function projectOf(config: BoardConfig): string {
  const segments = config.folder.split("/").filter((segment) => segment.length > 0);
  return segments.length === 0 ? "" : segments[segments.length - 1];
}

export async function setStatus(
  app: App,
  config: BoardConfig,
  file: TFile,
  statusName: string
): Promise<void> {
  await app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
    frontmatter["status"] = statusName;
  });

  if (!config.moveFiles) return;

  const folder = folderForStatus(config, statusName);
  if (file.parent !== null && file.parent.path === folder) return;

  await ensureFolder(app.vault, folder);
  await app.fileManager.renameFile(file, freePath(app.vault, folder, file.basename));
}

export async function setStatusBatch(
  app: App,
  config: BoardConfig,
  files: TFile[],
  statusName: string
): Promise<void> {
  await eachFile(files, (file) => setStatus(app, config, file, statusName));
}

export async function setPriority(
  app: App,
  file: TFile,
  priority: PriorityKey | null
): Promise<void> {
  await app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
    if (priority === null) delete frontmatter["priority"];
    else frontmatter["priority"] = priority;
  });
}

export async function setDue(app: App, file: TFile, due: string): Promise<void> {
  await app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
    if (due.length === 0) delete frontmatter["due"];
    else frontmatter["due"] = due;
  });
}

export async function setTags(app: App, file: TFile, tags: string[]): Promise<void> {
  await app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
    if (tags.length === 0) delete frontmatter["tags"];
    else frontmatter["tags"] = [...tags];
  });
}

export async function setField(
  app: App,
  file: TFile,
  field: BoardField,
  value: string
): Promise<void> {
  await app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
    if (value.length === 0) {
      delete frontmatter[field.key];
      return;
    }
    if (field.type === "toggle") frontmatter[field.key] = value === "true";
    else if (field.type === "number") frontmatter[field.key] = Number(value);
    else frontmatter[field.key] = value;
  });
}

export async function clearFields(app: App, files: TFile[], keys: string[]): Promise<void> {
  if (keys.length === 0) return;

  await eachFile(files, (file) =>
    app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
      for (const key of keys) delete frontmatter[key];
    })
  );
}

export async function writeOrder(app: App, files: TFile[]): Promise<void> {
  const order = new Map(files.map((file, index) => [file.path, index]));

  await eachFile(files, (file) =>
    app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
      frontmatter["order"] = order.get(file.path) ?? 0;
    })
  );
}

export async function createTask(
  app: App,
  config: BoardConfig,
  statusName: string,
  title: string,
  order: number
): Promise<TFile | null> {
  const name = sanitizeName(title);
  if (name.length === 0) return null;

  const folder = folderForStatus(config, statusName);
  await ensureFolder(app.vault, folder);

  const lines = ["---", `status: ${JSON.stringify(statusName)}`, `order: ${order}`];
  const project = projectOf(config);
  if (project.length > 0) lines.push(`project: ${JSON.stringify(project)}`);
  lines.push(`created: ${JSON.stringify(today())}`, "---", "");

  return app.vault.create(freePath(app.vault, folder, name), lines.join("\n"));
}

export async function trashTasks(app: App, files: TFile[]): Promise<void> {
  await eachFile(files, (file) => app.fileManager.trashFile(file));
}
