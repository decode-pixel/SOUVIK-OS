import React, { useMemo } from 'react';

/**
 * MiniBarChart — Simple inline bar chart without external library.
 * Props:
 *   data: array of { label, value, color? }
 *   maxValue?: number (auto if not provided)
 *   height?: number (px)
 *   showLabels?: boolean
 *   showValues?: boolean
 *   unit?: string (appended to value)
 */
export function MiniBarChart({ data = [], maxValue, height = 80, showLabels = true, showValues = false, unit = '', barColor = 'var(--accent-primary)' }) {
  const max = maxValue || Math.max(...data.map(d => d.value || 0), 1);

  if (!data || data.length === 0) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>No data</span>
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      {/* Bars */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: `${height}px` }}>
        {data.map((item, i) => {
          const pct = max > 0 ? (item.value / max) * 100 : 0;
          const color = item.color || barColor;
          return (
            <div
              key={i}
              title={`${item.label}: ${item.value}${unit}`}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}
            >
              {showValues && item.value > 0 && (
                <span style={{ fontSize: '9px', color: 'var(--text-muted)', marginBottom: '2px', fontWeight: 600 }}>
                  {item.value}{unit}
                </span>
              )}
              <div style={{
                width: '100%',
                height: `${Math.max(pct, item.value > 0 ? 4 : 0)}%`,
                backgroundColor: color,
                borderRadius: '3px 3px 0 0',
                transition: 'height 600ms var(--ease-spring)',
                minHeight: item.value > 0 ? '4px' : '0',
                opacity: 0.85,
              }} />
            </div>
          );
        })}
      </div>

      {/* Labels */}
      {showLabels && (
        <div style={{ display: 'flex', gap: '3px', marginTop: '4px' }}>
          {data.map((item, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: '9px', color: 'var(--text-muted)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * SparkLine — Simple SVG line chart.
 * Props:
 *   data: number[]
 *   color?: string
 *   height?: number
 *   width?: number
 *   fill?: boolean
 */
export function SparkLine({ data = [], color = 'var(--accent-primary)', height = 40, fill = true }) {
  const points = useMemo(() => {
    if (!data || data.length < 2) return null;
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;
    const W = 100;
    const H = height;
    const step = W / (data.length - 1);

    const pts = data.map((v, i) => ({
      x: i * step,
      y: H - ((v - min) / range) * (H - 4) - 2,
    }));

    const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const fillPath = `${linePath} L ${pts[pts.length - 1].x} ${H} L 0 ${H} Z`;

    return { pts, linePath, fillPath };
  }, [data, height]);

  if (!points) return null;

  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" style={{ width: '100%', height: `${height}px` }}>
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {fill && <path d={points.fillPath} fill="url(#sparkFill)" />}
      <path d={points.linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * DonutRing — Simple SVG donut for a single percentage.
 */
export function DonutRing({ pct = 0, size = 64, strokeWidth = 8, color = 'var(--accent-primary)', bg = 'var(--bg-muted)', children }) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={bg} strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 800ms var(--ease-spring)' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size < 60 ? '10px' : '13px',
        fontWeight: 700,
        color: 'var(--text-primary)',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>
        {children || `${Math.round(pct)}%`}
      </div>
    </div>
  );
}
