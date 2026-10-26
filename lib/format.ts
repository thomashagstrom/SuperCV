// "ADDED 12.05.2026" — day.month.year in UTC, so server and client agree.
export function addedLabel(createdAt: string) {
  const d = new Date(createdAt);
  const part = (n: number) => String(n).padStart(2, "0");
  return `ADDED ${part(d.getUTCDate())}.${part(d.getUTCMonth() + 1)}.${d.getUTCFullYear()}`;
}
