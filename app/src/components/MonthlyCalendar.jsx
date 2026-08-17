import React, { useMemo } from 'react';
import { getFirstDayOfWeek, getDaysInMonth, formatDateStr } from '../utils/dateUtils';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * MonthlyCalendar — Calendar grid for a month.
 *
 * Props:
 *   year: number
 *   month: number (0-indexed)
 *   checkinDates: Set<string>  — dates with daily check-ins
 *   onSelectDate: (dateStr) => void
 *   selectedDate?: string
 */
export default function MonthlyCalendar({ year, month, checkinDates = new Set(), onSelectDate, selectedDate }) {
  const today = formatDateStr(new Date());
  const firstDow = getFirstDayOfWeek(year, month);
  const daysInMonth = getDaysInMonth(year, month);

  // Build grid: leading blanks + days
  const cells = useMemo(() => {
    const arr = [];
    for (let i = 0; i < firstDow; i++) arr.push(null); // blank cells
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      arr.push(dateStr);
    }
    return arr;
  }, [year, month, daysInMonth, firstDow]);

  return (
    <div>
      {/* Weekday headers */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
        marginBottom: 'var(--space-2)',
      }}>
        {WEEKDAYS.map(d => (
          <div key={d} style={{
            textAlign: 'center',
            fontSize: 'var(--font-size-xs)',
            fontWeight: 600,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            padding: '4px 0',
          }}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '3px',
      }}>
        {cells.map((dateStr, i) => {
          if (!dateStr) {
            return <div key={`blank-${i}`} />;
          }

          const isDateToday = dateStr === today;
          const isSelected = dateStr === selectedDate;
          const hasChekin = checkinDates.has(dateStr);
          const isFutureDate = dateStr > today;

          return (
            <button
              key={dateStr}
              onClick={() => !isFutureDate && onSelectDate(dateStr)}
              disabled={isFutureDate}
              aria-label={`${dateStr}${hasChekin ? ' — check-in recorded' : ''}`}
              style={{
                position: 'relative',
                aspectRatio: '1',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 'var(--radius-sm)',
                border: isSelected
                  ? '2px solid var(--accent-primary)'
                  : isDateToday
                  ? '1.5px solid var(--accent-primary)'
                  : '1.5px solid transparent',
                backgroundColor: isSelected
                  ? 'var(--accent-primary-muted)'
                  : isDateToday
                  ? 'var(--bg-subtle)'
                  : 'transparent',
                cursor: isFutureDate ? 'default' : 'pointer',
                transition: 'all var(--dur-fast) var(--ease-standard)',
                padding: '2px',
                minWidth: 0,
              }}
              onMouseEnter={e => {
                if (!isFutureDate && !isSelected && !isDateToday) {
                  e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                }
              }}
              onMouseLeave={e => {
                if (!isFutureDate && !isSelected && !isDateToday) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              {/* Day number */}
              <span style={{
                fontSize: 'var(--font-size-xs)',
                fontWeight: isDateToday || isSelected ? 700 : 500,
                color: isFutureDate
                  ? 'var(--text-muted)'
                  : isSelected
                  ? 'var(--accent-primary)'
                  : isDateToday
                  ? 'var(--accent-primary)'
                  : 'var(--text-primary)',
                lineHeight: 1,
              }}>
                {parseInt(dateStr.split('-')[2])}
              </span>

              {/* Check-in dot indicator */}
              <div style={{
                width: '4px', height: '4px',
                borderRadius: '50%',
                marginTop: '2px',
                backgroundColor: hasChekin
                  ? (isSelected ? 'var(--accent-primary)' : 'var(--color-success)')
                  : 'transparent',
                transition: 'background-color var(--dur-fast) var(--ease-standard)',
              }} />
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
        marginTop: 'var(--space-4)', justifyContent: 'flex-end',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-success)' }} />
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', fontWeight: 500 }}>Check-in</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '14px', height: '14px', borderRadius: '3px', border: '1.5px solid var(--accent-primary)' }} />
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', fontWeight: 500 }}>Today</span>
        </div>
      </div>
    </div>
  );
}
