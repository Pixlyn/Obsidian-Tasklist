import { t } from "../i18n";
import { TranslationKey } from "../i18n/en";
import { findPriority } from "./priority";
import { TaskGroup, TaskItem } from "./task";

export type SearchField = "name" | "tags" | "status" | "priority" | "due";

export const SEARCH_FIELDS: SearchField[] = ["name", "tags", "status", "priority", "due"];

export const SEARCH_LABELS: Record<SearchField, TranslationKey> = {
  name: "COLUMN_NAME",
  tags: "TAGS",
  status: "COLUMN_STATUS",
  priority: "PRIORITY",
  due: "DUE_DATE"
};

export interface SearchState {
  query: string;
  fields: SearchField[];
}

export function defaultSearch(): SearchState {
  return { query: "", fields: ["name"] };
}

export function isSearching(state: SearchState): boolean {
  return state.query.trim().length > 0 && state.fields.length > 0;
}

function valueOf(task: TaskItem, field: SearchField): string {
  if (field === "name") return task.title;
  if (field === "tags") return task.tags.join(" ");
  if (field === "status") return task.status;
  if (field === "due") return task.due;

  const priority = task.priority === null ? null : findPriority(task.priority);
  return priority === null ? "" : `${priority.key} ${t(priority.label)}`;
}

export function matchesSearch(task: TaskItem, state: SearchState): boolean {
  const query = state.query.trim().toLowerCase();
  if (query.length === 0) return true;

  return state.fields.some((field) => valueOf(task, field).toLowerCase().includes(query));
}

export function filterGroups(groups: TaskGroup[], state: SearchState): TaskGroup[] {
  if (!isSearching(state)) return groups;

  return groups.map((group) => ({
    ...group,
    tasks: group.tasks.filter((task) => matchesSearch(task, state))
  }));
}
