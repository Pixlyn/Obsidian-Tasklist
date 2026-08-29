import { TranslationKey } from "../i18n/en";

export type PriorityKey = "urgent" | "high" | "normal" | "low";

export interface Priority {
  key: PriorityKey;
  color: string;
  label: TranslationKey;
}

export const PRIORITIES: Priority[] = [
  { key: "urgent", color: "#d64a3f", label: "PRIORITY_URGENT" },
  { key: "high", color: "#d9a33b", label: "PRIORITY_HIGH" },
  { key: "normal", color: "#3b7dd8", label: "PRIORITY_NORMAL" },
  { key: "low", color: "#8a8f98", label: "PRIORITY_LOW" }
];

export function findPriority(key: string): Priority | null {
  for (const priority of PRIORITIES) {
    if (priority.key === key) return priority;
  }
  return null;
}
