import React, { useMemo } from 'react';
import { getMonthDays, getTodayStr } from '../utils/dateUtils';

/**
 * HabitHeatmap — Shows a month grid for a single habit.
 * Props:
 *   habit: { id, name, type, category }
 *   logs: array of { habit_id, date, value_bool, value_count }
 *   year: number
 *   month: number (0-indexed)
 */
export default function HabitHeatmap({ habit, logs, year, month }) {
  const today = getTodayStr();
  const monthDays = useMemo(() => getMonthDays(year, month), [year, month]);

  // Build lookup: date → log
  const logByDate = useMemo(() => {
    const map = {};
    logs.forEach(l => { if (l.habit_id === habit.id) map[l.date] = l; });
    return map;
  }, [logs, habit.id]);

  const getStatus = (dateStr) => {
    if (dateStr > today) return 'future';
    const log = logByDate[dateStr];
    if (!log) return 'empty';
    if (habit.type === 'boolean') return log.value_bool ? 'done' : 'empty';
    if (habit.type === 'count') return (log.value_count || 0) > 0 ? 'done' : 'empty';
    return 'empty';
  };

  const getCount = (dateStr) => {
    const log = logByDate[dateStr];
    if (!log || habit.type !== 'count') return null;
    return log.value_count || 0;
  };

  const doneDays = monthDays.filter(d => getStatus(d) === 'done').length;
  const trackedDays = monthDays.filter(d => getStatus(d) !== 'future').length;
  const pct = trackedDays > 0 ? Math.round((doneDays / trackedDays) * 100) : 0;

  return (
    <div style={{ marginBottom: 'var(--space-5)' }}>
      {/* Habit name row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
          {habit.name}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
            {doneDays}/{trackedDays} days
          </span>
          <span style={{
            fontSize: 'var(--font-size-xs)', fontWeight: 700,
            color: pct >= 80 ? 'var(--color-success)' : pct >= 60 ? 'var(--color-warning)' : 'var(--color-error)',
          }}>
            {pct}%
          </span>
        </div>
      </div>

      {/* Day grid */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
        {monthDays.map(dateStr => {
          const status = getStatus(dateStr);
          const count = getCount(dateStr);
          const day = parseInt(dateStr.split('-')[2]);

          return (
            <div
              key={dateStr}
              title={`${dateStr}${count !== null ? ` — ${count}` : ''}`}
              style={{
                width: '26px', height: '26px',
                borderRadius: '5px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '10px', fontWeight: 600,
                transition: 'all var(--dur-fast) var(--ease-standard)',
                backgroundColor:
                  status === 'done' ? 'var(--color-success)' :
                  status === 'future' ? 'var(--bg-muted)' :
                  'var(--border-subtle)',
                color:
                  status === 'done' ? '#fff' :
                  status === 'future' ? 'var(--text-muted)' :
                  'var(--text-muted)',
                border: status === 'done' ? 'none' : '1px solid var(--border-subtle)',
                opacity: status === 'future' ? 0.4 : 1,
              }}
            >
              {day}
            </div>
          );
        })}
      </div>

      {/* Consistency bar */}
      <div className="progress-track" style={{ height: '3px', marginTop: 'var(--space-2)' }}>
        <div className="progress-fill" style={{
          width: `${pct}%`,
          backgroundColor: pct >= 80 ? 'var(--color-success)' : pct >= 60 ? 'var(--color-warning)' : 'var(--color-error)',
          transition: 'width 600ms var(--ease-spring)',
        }} />
      </div>
    </div>
  );
}
