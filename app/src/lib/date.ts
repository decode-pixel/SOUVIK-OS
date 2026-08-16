/**
 * SOUVIK OS — Local Timezone-Safe Date Utilities
 * Pure, timezone-local date functions to prevent UTC-boundary bugs.
 */

/**
 * Returns 'YYYY-MM-DD' using local getFullYear, getMonth, and getDate.
 * Never uses toISOString().
 */
export function toLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Returns today's date as 'YYYY-MM-DD' in local timezone.
 */
export function today(): string {
  return toLocalDate(new Date());
}

/**
 * Parses 'YYYY-MM-DD' into a Date at LOCAL midnight.
 * Does NOT use `new Date(s)` which parses ISO strings as UTC midnight.
 */
export function parseLocalDate(s: string): Date {
  if (!s) return new Date();
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Returns the first day of the month as 'YYYY-MM-DD' in local timezone.
 */
export function startOfMonth(d: Date): string {
  return toLocalDate(new Date(d.getFullYear(), d.getMonth(), 1));
}

/**
 * Returns the last day of the month as 'YYYY-MM-DD' in local timezone.
 */
export function endOfMonth(d: Date): string {
  return toLocalDate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

/**
 * Adds (or subtracts) n calendar days from dateStr ('YYYY-MM-DD')
 * and returns the resulting 'YYYY-MM-DD' in local timezone.
 */
export function addDays(dateStr: string, n: number): string {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + n);
  return toLocalDate(d);
}

/**
 * Returns true if dateStr matches today in local timezone.
 */
export function isToday(dateStr: string): boolean {
  return dateStr === today();
}

/**
 * Returns true if dateStr is strictly in the future compared to today in local timezone.
 */
export function isFuture(dateStr: string): boolean {
  return dateStr > today();
}
