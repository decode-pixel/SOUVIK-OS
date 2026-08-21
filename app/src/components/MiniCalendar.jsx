import React, { useMemo } from 'react';
import DailyDetailDrawer from './DailyDetailDrawer';

/**
 * MiniCalendar — Compact month calendar showing check-in coverage.
 * Dots: green = check-in logged, grey = no data, faded = future.
 * Clicking any past day opens DailyDetailDrawer.
 *
 * Props:
 *   year:         number
 *   month:        number (0-indexed)
 *   checkinDates: Set<string> — YYYY-MM-DD strings with logged check-ins
 *   todayStr:     string (YYYY-MM-DD)
 *   onDayClick:   (dateStr) => void  — called when a past day is clicked
 *   selectedDate: string | null — currently open date
 *   onCloseDrawer: () => void
 */
export default function MiniCalendar({
  year,
  month,
  checkinDates = new Set(),
  todayStr,
  onDayClick,
  selectedDate,
  onCloseDrawer,
}) {
  const { days, firstDow, daysInMonth } = useMemo(() => {
    const d = new Date(year, month, 1);
    const firstDow = d.getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push(ds);
    }
    return { days, firstDow, daysInMonth };
  }, [year, month]);

  const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <>
      <div style={{ userSelect: 'none' }}>
        {/* Day-of-week headers */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '2px',
          marginBottom: '4px',
        }}>
          {DAY_LABELS.map(d => (
            <div key={d} style={{
              textAlign: 'center',
              fontSize: '10px',
              fontWeight: 600,
              color: 'var(--text-muted)',
              letterSpacing: '0.04em',
              padding: '2px 0',
            }}>
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '2px',
        }}>
          {/* Empty cells before month start */}
          {Array.from({ length: firstDow }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}

          {/* Day cells */}
          {days.map(ds => {
            const isFuture = ds > todayStr;
            const isToday = ds === todayStr;
            const hasCheckin = checkinDates.has(ds);
            const isPast = !isFuture && !isToday;
            const isSelected = ds === selectedDate;

            return (
              <button
                key={ds}
                onClick={() => !isFuture && onDayClick && onDayClick(ds)}
                disabled={isFuture}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px 2px',
                  gap: '3px',
                  borderRadius: 'var(--radius-sm)',
                  border: isSelected ? '1.5px solid var(--accent-primary)' : '1px solid transparent',
                  background: isToday
                    ? 'var(--accent-primary-muted)'
                    : isSelected
                      ? 'var(--accent-primary-subtle)'
                      : 'transparent',
                  cursor: isFuture ? 'default' : 'pointer',
                  opacity: isFuture ? 0.3 : 1,
                  transition: 'all var(--transition-fast)',
                  outline: 'none',
                  fontFamily: 'inherit',
                  minHeight: '40px',
                }}
                onMouseEnter={e => {
                  if (!isFuture) e.currentTarget.style.background = 'var(--bg-hover)';
                }}
                onMouseLeave={e => {
                  if (!isFuture) {
                    if (isToday) e.currentTarget.style.background = 'var(--accent-primary-muted)';
                    else if (isSelected) e.currentTarget.style.background = 'var(--accent-primary-subtle)';
                    else e.currentTarget.style.background = 'transparent';
                  }
                }}
                aria-label={ds}
              >
                {/* Day number */}
                <span style={{
                  fontSize: '11px',
                  fontWeight: isToday || isSelected ? 700 : 500,
                  color: isToday ? 'var(--accent-primary)' : 'var(--text-primary)',
                  lineHeight: 1,
                }}>
                  {Number(ds.slice(8))}
                </span>

                {/* Dot indicator */}
                <div style={{
                  width: '5px',
                  height: '5px',
                  borderRadius: '50%',
                  background: hasCheckin
                    ? 'var(--color-success)'
                    : isPast
                      ? 'var(--border-default)'
                      : 'transparent',
                  flexShrink: 0,
                }} />
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{
          display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-3)',
          fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-success)' }} />
            Logged
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--border-default)' }} />
            No data
          </div>
        </div>
      </div>

      {/* Daily Detail Drawer */}
      {selectedDate && onCloseDrawer && (
        <DailyDetailDrawer dateStr={selectedDate} onClose={onCloseDrawer} />
      )}
    </>
  );
}
