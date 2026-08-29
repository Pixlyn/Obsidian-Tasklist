import { App, MarkdownSectionInformation, TFile } from "obsidian";
import { t } from "../i18n";
import { BoardConfig, CODE_BLOCK, serializeBoardConfig } from "../model/board-config";

function fenceMark(line: string): string | null {
  const trimmed = line.trimStart();
  if (trimmed.startsWith("```")) return "```";
  if (trimmed.startsWith("~~~")) return "~~~";
  return null;
}

function isOpening(line: string): boolean {
  const mark = fenceMark(line);
  return mark !== null && line.trimStart().slice(mark.length).trim() === CODE_BLOCK;
}

function atSection(lines: string[], start: number, end: number): [number, number] | null {
  if (start < 0 || end >= lines.length || start >= end) return null;
  if (!isOpening(lines[start]) || fenceMark(lines[end]) === null) return null;
  return [start, end];
}

function onlyBlock(lines: string[]): [number, number] | null {
  let start = -1;
  let end = -1;

  for (let index = 0; index < lines.length; index += 1) {
    if (start < 0) {
      if (isOpening(lines[index])) start = index;
      continue;
    }
    if (end < 0 && fenceMark(lines[index]) !== null) {
      end = index;
      continue;
    }
    if (isOpening(lines[index])) return null;
  }

  return start >= 0 && end > start ? [start, end] : null;
}

export async function writeBoardConfig(
  app: App,
  path: string,
  section: MarkdownSectionInformation | null,
  config: BoardConfig,
  expected: string | null = null
): Promise<string> {
  const file = app.vault.getAbstractFileByPath(path);
  if (!(file instanceof TFile)) throw new Error(t("BLOCK_MISSING", { file: path }));

  const body = serializeBoardConfig(config).replace(/\n$/, "");

  return app.vault.process(file, (data) => {
    const lines = data.split("\n");
    const range = section === null ? null : atSection(lines, section.lineStart, section.lineEnd);
    const target = range ?? onlyBlock(lines);
    if (target === null) throw new Error(t("BLOCK_MISSING", { file: path }));

    const [start, end] = target;

    // The write replaces the whole block, so a moved-on block would lose the other edit.
    if (
      expected !== null &&
      lines
        .slice(start + 1, end)
        .join("\n")
        .trim() !== expected.trim()
    ) {
      throw new Error(t("CONFLICT"));
    }

    lines.splice(start + 1, end - start - 1, ...body.split("\n"));
    return lines.join("\n");
  });
}
