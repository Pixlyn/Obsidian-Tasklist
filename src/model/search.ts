import { TranslationKey } from "../i18n/en";
import { TaskGroup, TaskItem } from "./task";

export type SearchField = "name" | "tags" | "status" | "priority" | "due" | "created";

export const SEARCH_FIELDS: SearchField[] = [
  "name",
  "tags",
  "status",
  "priority",
  "due",
  "created"
];

export const SEARCH_LABELS: Record<SearchField, TranslationKey> = {
  name: "COLUMN_NAME",
  tags: "TAGS",
  status: "COLUMN_STATUS",
  priority: "PRIORITY",
  due: "DUE_DATE",
  created: "COLUMN_CREATED"
};

export const SEARCH_ICONS: Record<SearchField, string> = {
  name: "type",
  tags: "tag",
  status: "circle",
  priority: "flag",
  due: "calendar",
  created: "calendar-plus"
};

export interface SearchState {
  query: string;
  field: SearchField;
}

export function defaultSearch(): SearchState {
  return { query: "", field: "name" };
}

export function isSearching(state: SearchState): boolean {
  return state.query.trim().length > 0;
}

export function isTextField(field: SearchField): boolean {
  return field === "name";
}

export function isDateField(field: SearchField): boolean {
  return field === "due" || field === "created";
}

export function matchesSearch(task: TaskItem, state: SearchState): boolean {
  const query = state.query.trim().toLowerCase();
  if (query.length === 0) return true;

  if (state.field === "name") return task.title.toLowerCase().includes(query);
  if (state.field === "tags") return task.tags.some((tag) => tag.toLowerCase() === query);
  if (state.field === "status") return task.status.toLowerCase() === query;
  if (state.field === "due") return task.due === query;
  if (state.field === "created") return task.created === query;

  return task.priority !== null && task.priority === query;
}

export function filterGroups(groups: TaskGroup[], state: SearchState): TaskGroup[] {
  if (!isSearching(state)) return groups;

  return groups.map((group) => ({
    ...group,
    tasks: group.tasks.filter((task) => matchesSearch(task, state))
  }));
}
