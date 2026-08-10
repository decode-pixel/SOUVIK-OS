import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatMonthLabel, shiftMonth } from '../utils/dateUtils';

/**
 * MonthPicker — Reusable month/year navigation header.
 * Props:
 *   year: number
 *   month: number (0-indexed)
 *   onChange: ({ year, month }) => void
 *   maxDate?: { year, month } — don't go past this (default: current month)
 *   minDate?: { year, month } — don't go before this
 */
export default function MonthPicker({ year, month, onChange, maxDate, minDate, compact = false }) {
  const now = new Date();
  const defaultMax = { year: now.getFullYear(), month: now.getMonth() };
  const max = maxDate || defaultMax;

  const canGoNext = (year < max.year) || (year === max.year && month < max.month);
  const canGoPrev = minDate
    ? (year > minDate.year) || (year === minDate.year && month > minDate.month)
    : true;

  const handlePrev = () => {
    if (!canGoPrev) return;
    onChange(shiftMonth(year, month, -1));
  };

  const handleNext = () => {
    if (!canGoNext) return;
    onChange(shiftMonth(year, month, 1));
  };

  const goToToday = () => {
    onChange({ year: now.getFullYear(), month: now.getMonth() });
  };

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
      <button
        className="btn-icon"
        onClick={handlePrev}
        disabled={!canGoPrev}
        aria-label="Previous month"
        style={{ opacity: canGoPrev ? 1 : 0.3 }}
      >
        <ChevronLeft size={18} />
      </button>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
        minWidth: compact ? '120px' : '160px', justifyContent: 'center',
      }}>
        <span style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontWeight: 700,
          fontSize: compact ? 'var(--font-size-sm)' : 'var(--font-size-md)',
          color: 'var(--text-primary)',
          letterSpacing: '-0.02em',
          whiteSpace: 'nowrap',
        }}>
          {formatMonthLabel(year, month)}
        </span>
        {!isCurrentMonth && !compact && (
          <button
            onClick={goToToday}
            style={{
              fontSize: 'var(--font-size-xs)', color: 'var(--accent-primary)',
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', fontWeight: 600, padding: '0 4px',
              textDecoration: 'underline', textUnderlineOffset: '2px',
            }}
          >
            Today
          </button>
        )}
      </div>

      <button
        className="btn-icon"
        onClick={handleNext}
        disabled={!canGoNext}
        aria-label="Next month"
        style={{ opacity: canGoNext ? 1 : 0.3 }}
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
