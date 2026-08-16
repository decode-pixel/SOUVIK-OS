/**
 * SOUVIK OS — Year & Progress Utilities
 * Single source of truth for all year progress, countdown, and day-of-year calculations.
 */

export interface YearProgress {
  year: number;
  totalDays: number;
  dayOfYear: number;
  daysRemaining: number;
  weeksRemaining: number;
  monthsRemaining: number;
  pct: number;
  pctDisplay: string;
}

/**
 * Computes year progress metrics for a given date (defaults to today).
 *
 * Semantics:
 * - totalDays: Calendar days between Jan 1 this year and Jan 1 next year (leap-year safe).
 * - dayOfYear: 1-indexed calendar day of the year (Jan 1 is 1).
 * - daysRemaining: Calendar days remaining including today (Dec 31 returns 1).
 * - pct: Percentage of the year that has elapsed before today ((dayOfYear - 1) / totalDays * 100).
 * - monthsRemaining: Whole calendar months remaining in the year after the current month.
 */
export function getYearProgress(d: Date = new Date()): YearProgress {
  const year = d.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const startOfNextYear = new Date(year + 1, 0, 1);

  // Total calendar days in the year (365 or 366)
  const totalDays = Math.round((startOfNextYear.getTime() - startOfYear.getTime()) / 86400000);

  // 1-indexed calendar day of the year (midnight to midnight)
  const startOfDay = new Date(year, d.getMonth(), d.getDate());
  const dayOfYear = Math.round((startOfDay.getTime() - startOfYear.getTime()) / 86400000) + 1;

  // Days remaining in the year (including today)
  const daysRemaining = totalDays - dayOfYear + 1;

  // Percentage elapsed
  const rawPct = ((dayOfYear - 1) / totalDays) * 100;
  const pct = Math.min(100, Math.max(0, rawPct));

  // Weeks remaining
  const weeksRemaining = Math.ceil(daysRemaining / 7);

  // Whole calendar months left after current month (0 to 11)
  const monthsRemaining = 11 - d.getMonth();

  return {
    year,
    totalDays,
    dayOfYear,
    daysRemaining,
    weeksRemaining,
    monthsRemaining,
    pct,
    pctDisplay: pct.toFixed(1),
  };
}
