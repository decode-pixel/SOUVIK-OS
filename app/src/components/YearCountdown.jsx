import React, { useMemo } from 'react';
import { getYearProgress } from '../utils/dateUtils';

/**
 * YearCountdown — Premium compact card showing year progress.
 * All values calculated dynamically from current date.
 */
export default function YearCountdown({ onViewYear }) {
  const yp = useMemo(() => getYearProgress(), []);

  return (
    <div className="card" style={{
      padding: 'var(--space-5)',
      position: 'relative',
      overflow: 'hidden',
      background: 'var(--bg-surface)',
    }}>
      {/* Background accent */}
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: '160px', height: '100%',
        background: 'radial-gradient(ellipse at top right, var(--accent-primary-subtle) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative' }}>
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
          <div>
            <div className="label-caps">Year Progress</div>
            <div style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 800, fontSize: 'var(--font-size-2xl)',
              color: 'var(--text-primary)', letterSpacing: '-0.04em',
              lineHeight: 1, marginTop: '2px',
            }}>
              {yp.year}
            </div>
          </div>
          <div style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 800, fontSize: '2rem',
            color: 'var(--accent-primary)', letterSpacing: '-0.04em',
            lineHeight: 1,
          }}>
            {yp.pctDisplay}%
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <div className="progress-track" style={{ height: '8px', borderRadius: 'var(--radius-full)' }}>
            <div
              className="progress-fill"
              style={{
                width: `${yp.pct}%`,
                background: `linear-gradient(90deg, var(--accent-primary) 0%, #9180f5 100%)`,
                height: '100%',
                borderRadius: 'var(--radius-full)',
                boxShadow: '0 0 8px var(--accent-glow)',
                transition: 'width 1s var(--ease-spring)',
              }}
            />
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
          <StatPill label="Days left" value={yp.daysRemaining} />
          <StatPill label="Weeks left" value={yp.weeksRemaining} />
          <StatPill label="Months left" value={yp.monthsRemaining} />
          {onViewYear && (
            <button
              onClick={onViewYear}
              style={{
                marginLeft: 'auto',
                fontSize: 'var(--font-size-xs)', color: 'var(--accent-primary)',
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', fontWeight: 600, padding: 0,
                display: 'flex', alignItems: 'center', gap: '3px',
                textDecoration: 'underline', textUnderlineOffset: '2px',
              }}
            >
              View year →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StatPill({ label, value }) {
  return (
    <div style={{ textAlign: 'left' }}>
      <div style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontWeight: 700, fontSize: 'var(--font-size-lg)',
        color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1,
      }}>
        {value}
      </div>
      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', fontWeight: 500, marginTop: '2px' }}>
        {label}
      </div>
    </div>
  );
}
