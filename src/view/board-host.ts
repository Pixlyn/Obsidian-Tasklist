import { App } from "obsidian";
import { BoardConfig } from "../model/board-config";
import { RowEditResult } from "../model/columns";
import { BoardField } from "../model/field";
import { PriorityKey } from "../model/priority";
import { SearchState } from "../model/search";
import { Status } from "../model/status";
import { TaskGroup, TaskItem } from "../model/task";
import { SettingsStore } from "../settings";
import { StatusEditResult } from "../ui/status-panel";
import { TagEditResult } from "../ui/tag-panel";

export interface BoardHost {
  readonly app: App;
  readonly config: BoardConfig;
  readonly boardPath: string;
  readonly groups: TaskGroup[];
  readonly store: SettingsStore;

  isCollapsed(statusName: string): boolean;
  setCollapsed(statusName: string, collapsed: boolean): void;

  isSelected(task: TaskItem): boolean;
  setSelected(task: TaskItem, selected: boolean): void;
  selectRange(task: TaskItem): void;
  selectGroup(group: TaskGroup, selected: boolean): void;
  selectedTasks(): TaskItem[];
  clearSelection(): void;

  updateConfig(change: (config: BoardConfig) => void): void;

  changeFolder(folder: string): void;

  addStatus(name: string, color: string): void;

  applyStatuses(result: StatusEditResult): void;

  boardTitle(): string;

  renameBoard(name: string): void;

  openTask(task: TaskItem, newLeaf: boolean): void;
  changeStatus(tasks: TaskItem[], status: Status): void;

  changePriority(task: TaskItem, priority: PriorityKey | null): void;

  changeDue(task: TaskItem, due: string): void;

  changeTags(task: TaskItem, tags: string[]): void;

  applyTags(result: TagEditResult): void;

  removeTasks(tasks: TaskItem[]): void;
  addTask(group: TaskGroup, title: string): void;
  moveTask(task: TaskItem, target: TaskGroup, index: number): void;

  pendingAdd: string | null;
  setPendingAdd(statusName: string | null): void;

  keepAdding(): boolean;
  setKeepAdding(value: boolean): void;

  changeField(task: TaskItem, field: BoardField, value: string): void;

  applyRow(result: RowEditResult): void;

  search(): SearchState;
  setSearch(state: SearchState): void;

  columnWidth(): number;
  setColumnWidth(width: number): void;

  quickAdd(): void;
}
