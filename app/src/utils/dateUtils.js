/**
 * SOUVIK OS — Date Utilities
 * Centralized, timezone-safe date handling.
 * All dates use local time (no UTC conversion bugs for daily tracking).
 */

/**
 * Get today's date as YYYY-MM-DD string in LOCAL time.
 */
export function getTodayStr() {
  const now = new Date();
  return formatDateStr(now);
}

/**
 * Format a Date object to YYYY-MM-DD string in LOCAL time.
 */
export function formatDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parse a YYYY-MM-DD string as a local Date (not UTC).
 * Avoids the "date shifts by one day" timezone bug.
 */
export function parseDateStr(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Get first day of a month as YYYY-MM-DD.
 */
export function getMonthStart(year, month) {
  return `${year}-${String(month + 1).padStart(2, '0')}-01`;
}

/**
 * Get last day of a month as YYYY-MM-DD.
 */
export function getMonthEnd(year, month) {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
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
  const d = parseDateStr(dateStr);
  if (!d) return dateStr;
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

/**
 * Format a date string short.
 * e.g. "2026-08-10" → "Mon, Aug 10"
 */
export function formatDateShort(dateStr) {
  const d = parseDateStr(dateStr);
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
  const monthsRemaining = 12 - now.getMonth() - (now.getDate() > 1 ? 0 : 0);

  // More precise months remaining
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
    // No deadline — use year progress as proxy
    const { pct: yearPct } = getYearProgress();
    const expected = yearPct;
    if (progressPct >= 100) return 'completed';
    if (progressPct >= expected * 0.85) return 'on_track';
    return 'at_risk';
  }

  const now = new Date();
  const deadline = parseDateStr(deadlineStr);

  if (!deadline) return 'on_track';

  if (now > deadline) {
    return progressPct >= 100 ? 'completed' : 'overdue';
  }

  // Calculate: what % of time from creation has elapsed?
  // Use Jan 1 of current year as start proxy if no created_at
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const totalDuration = deadline - startOfYear;
  const elapsed = now - startOfYear;
  const timeElapsedPct = (elapsed / totalDuration) * 100;

  if (progressPct >= 100) return 'completed';

  // If progress >= 90% of expected: on_track. If < 70%: at_risk.
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
 * Returns null if no deadline and no meaningful context.
 */
export function getDaysRemaining(deadlineStr) {
  const target = deadlineStr ? parseDateStr(deadlineStr) : new Date(new Date().getFullYear(), 11, 31);
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

/**
 * Check if a date string is today.
 */
export function isToday(dateStr) {
  return dateStr === getTodayStr();
}

/**
 * Check if a date string is in the future.
 */
export function isFuture(dateStr) {
  return dateStr > getTodayStr();
}
