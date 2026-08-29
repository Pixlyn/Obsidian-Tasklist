import { TFile } from "obsidian";
import { PriorityKey } from "./priority";
import { Status } from "./status";

export interface TaskItem {
  file: TFile;
  title: string;
  status: string;
  rawStatus: string;
  order: number;
  unknown: boolean;
  priority: PriorityKey | null;
  due: string;
  tags: string[];
  created: string;
  // Keyed by field key; "" means empty.
  fields: Record<string, string>;
}

export interface TaskGroup {
  status: Status;
  tasks: TaskItem[];
  isArchive: boolean;
  isUnassigned: boolean;
}
