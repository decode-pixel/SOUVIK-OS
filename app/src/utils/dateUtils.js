/**
 * SOUVIK OS — Date Utilities
 * Centralized date handling, re-exporting core pure functions from src/lib/date.ts.
 */

import {
  toLocalDate,
  today,
  parseLocalDate,
  startOfMonth as _startOfMonth,
  endOfMonth as _endOfMonth,
  addDays,
  isToday,
  isFuture,
} from '../lib/date';

// Re-export core timezone-safe utilities
export {
  toLocalDate,
  today,
  parseLocalDate,
  addDays,
  isToday,
  isFuture,
};

// Aliases for backwards compatibility
export const formatDateStr = toLocalDate;
export const getTodayStr = today;
export const parseDateStr = parseLocalDate;

/**
 * Get first day of a month as YYYY-MM-DD.
 */
export function getMonthStart(year, month) {
  return _startOfMonth(new Date(year, month, 1));
}

/**
 * Get last day of a month as YYYY-MM-DD.
 */
export function getMonthEnd(year, month) {
  return _endOfMonth(new Date(year, month, 1));
}

/**
 * Get the number of days in a month.
 */
export function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Format a month/year for display.
 * e.g. formatMonthLabel(2026, 7) → "August 2026"
 */
export function formatMonthLabel(year, month) {
  return new Date(year, month, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Format a date string for display.
 * e.g. "2026-08-10" → "August 10, 2026"
 */
export function formatDateFull(dateStr) {
  const d = parseLocalDate(dateStr);
  if (!d) return dateStr;
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

/**
 * Format a date string short.
 * e.g. "2026-08-10" → "Mon, Aug 10"
 */
export function formatDateShort(dateStr) {
  const d = parseLocalDate(dateStr);
  if (!d) return dateStr;
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

/**
 * Navigate month forward/backward.
 * Returns { year, month } (month is 0-indexed).
 */
export function shiftMonth(year, month, delta) {
  let newMonth = month + delta;
  let newYear = year;
  while (newMonth > 11) { newMonth -= 12; newYear++; }
  while (newMonth < 0) { newMonth += 12; newYear--; }
  return { year: newYear, month: newMonth };
}

/**
 * Calculate year progress metrics for the CURRENT year.
 * Returns an object with dayOfYear, totalDays, daysRemaining, pct, weeksRemaining.
 */
export function getYearProgress() {
  const now = new Date();
  const year = now.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const startOfNextYear = new Date(year + 1, 0, 1);
  const totalDays = Math.round((startOfNextYear - startOfYear) / 86400000);

  // Day of year (1-indexed)
  const dayOfYear = Math.floor((now - startOfYear) / 86400000) + 1;
  const daysRemaining = totalDays - dayOfYear + 1; // include today

  const pct = ((dayOfYear - 1) / totalDays) * 100;

  const weeksRemaining = Math.ceil(daysRemaining / 7);
  const endOfYear = new Date(year, 11, 31);
  const msRemaining = endOfYear - now;
  const monthsRemainingDecimal = msRemaining / (30.44 * 24 * 3600 * 1000);

  return {
    year,
    totalDays,
    dayOfYear,
    daysRemaining,
    weeksRemaining,
    monthsRemaining: Math.floor(monthsRemainingDecimal),
    pct: Math.min(100, Math.max(0, pct)),
    pctDisplay: pct.toFixed(1),
  };
}

/**
 * Calculate goal health status based on time elapsed vs progress.
 * Returns: 'completed' | 'on_track' | 'at_risk' | 'overdue'
 */
export function getGoalHealth(progressPct, status, deadlineStr) {
  if (status === 'completed') return 'completed';

  if (!deadlineStr) {
    const { pct: yearPct } = getYearProgress();
    const expected = yearPct;
    if (progressPct >= 100) return 'completed';
    if (progressPct >= expected * 0.85) return 'on_track';
    return 'at_risk';
  }

  const now = new Date();
  const deadline = parseLocalDate(deadlineStr);

  if (!deadline) return 'on_track';

  if (now > deadline) {
    return progressPct >= 100 ? 'completed' : 'overdue';
  }

  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const totalDuration = deadline - startOfYear;
  const elapsed = now - startOfYear;
  const timeElapsedPct = (elapsed / totalDuration) * 100;

  if (progressPct >= 100) return 'completed';

  const expected = timeElapsedPct;
  if (progressPct >= expected * 0.90) return 'on_track';
  return 'at_risk';
}

/**
 * Get goal health label and color.
 */
export function getGoalHealthDisplay(health) {
  switch (health) {
    case 'completed': return { label: 'Completed', color: 'var(--color-success)', badgeClass: 'badge-success' };
    case 'on_track':  return { label: 'On Track',  color: 'var(--mod-finance)',    badgeClass: 'badge-finance' };
    case 'at_risk':   return { label: 'At Risk',   color: 'var(--color-warning)',  badgeClass: 'badge-warning' };
    case 'overdue':   return { label: 'Overdue',   color: 'var(--color-error)',    badgeClass: 'badge-error' };
    default:          return { label: 'Active',    color: 'var(--text-muted)',     badgeClass: 'badge-neutral' };
  }
}

/**
 * Get days remaining until a deadline (or year end if no deadline).
 */
export function getDaysRemaining(deadlineStr) {
  const target = deadlineStr ? parseLocalDate(deadlineStr) : new Date(new Date().getFullYear(), 11, 31);
  const now = new Date();
  const diff = Math.ceil((target - now) / 86400000);
  return Math.max(0, diff);
}

/**
 * Generate all days in a month as an array of YYYY-MM-DD strings.
 */
export function getMonthDays(year, month) {
  const days = [];
  const count = getDaysInMonth(year, month);
  for (let d = 1; d <= count; d++) {
    days.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  return days;
}

/**
 * Get weekday (0=Sun … 6=Sat) of first day of month.
 */
export function getFirstDayOfWeek(year, month) {
  return new Date(year, month, 1).getDay();
}
