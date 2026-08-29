const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function today(): string {
  return toIsoDate(new Date());
}

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  return !Number.isNaN(new Date(`${value}T00:00:00`).getTime());
}

export function isOverdue(due: string): boolean {
  return isIsoDate(due) && due < today();
}

export function isDueToday(due: string): boolean {
  return due === today();
}

export function formatDue(due: string, locale: string): string {
  if (!isIsoDate(due)) return due;

  const date = new Date(`${due}T00:00:00`);
  const sameYear = date.getFullYear() === new Date().getFullYear();

  return date.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: sameYear ? undefined : "numeric"
  });
}
