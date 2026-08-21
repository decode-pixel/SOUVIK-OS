import React, { useMemo, useState } from 'react';
import { AlertTriangle, TrendingDown, Zap, CalendarX, Target, X } from 'lucide-react';

/**
 * SmartInsights — Computes and renders up to 3 evidence-based insight cards.
 *
 * Props:
 *   checkins:        last 14+ days of daily_checkin rows
 *   prevMonthCheckins: previous month's checkins (for sleep comparison)
 *   goals:           active goals[]
 *   monthExpense:    current month total expense (number)
 *   prevMonthExpense: previous month total expense (number)
 *   todayStr:        YYYY-MM-DD string for today
 */
export default function SmartInsights({
  checkins = [],
  prevMonthCheckins = [],
  goals = [],
  monthExpense = 0,
  prevMonthExpense = 0,
  todayStr,
}) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('souvik_dismissed_insights') || '[]');
    } catch {
      return [];
    }
  });

  const dismiss = (key) => {
    const next = [...dismissed, key];
    setDismissed(next);
    try { sessionStorage.setItem('souvik_dismissed_insights', JSON.stringify(next)); } catch {}
  };

  const insights = useMemo(() => {
    const result = [];

    // ── 1. Check-in gap ─────────────────────────────────────────────────────
    if (todayStr && checkins.length >= 0) {
      const checkinDates = new Set(checkins.map(c => c.date));
      let gap = 0;
      const today = new Date(todayStr);
      for (let i = 1; i <= 7; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const ds = d.toISOString().slice(0, 10);
        if (!checkinDates.has(ds)) gap++;
        else break;
      }
      if (gap >= 2) {
        result.push({
          key: `checkin_gap_${gap}`,
          severity: gap >= 4 ? 'error' : 'warning',
          icon: CalendarX,
          title: 'Check-in gap',
          message: `You haven't logged a check-in for ${gap} consecutive day${gap !== 1 ? 's' : ''}. Your data will have gaps.`,
        });
      }
    }

    // ── 2. Sleep declining ───────────────────────────────────────────────────
    if (checkins.length >= 4) {
      const sorted = [...checkins].sort((a, b) => a.date.localeCompare(b.date));
      const recent7 = sorted.slice(-7);
      const prev7 = sorted.slice(-14, -7);
      if (recent7.length >= 3 && prev7.length >= 3) {
        const avgRecent = recent7.reduce((s, c) => s + Number(c.sleep_hours || 0), 0) / recent7.length;
        const avgPrev = prev7.reduce((s, c) => s + Number(c.sleep_hours || 0), 0) / prev7.length;
        if (avgPrev > 0 && avgRecent < avgPrev - 0.4) {
          result.push({
            key: `sleep_decline_${Math.round(avgRecent * 10)}`,
            severity: 'warning',
            icon: TrendingDown,
            title: 'Sleep declining',
            message: `Avg sleep this week is ${avgRecent.toFixed(1)}h vs ${avgPrev.toFixed(1)}h last week. Consider an earlier bedtime.`,
          });
        }
      }
    }

    // ── 3. Exercise streak broken ────────────────────────────────────────────
    if (checkins.length >= 1 && todayStr) {
      const checkinMap = Object.fromEntries(checkins.map(c => [c.date, c]));
      let noExerciseDays = 0;
      const today = new Date(todayStr);
      for (let i = 1; i <= 7; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const ds = d.toISOString().slice(0, 10);
        const row = checkinMap[ds];
        if (row && !row.exercise) noExerciseDays++;
        else if (row && row.exercise) break;
        else if (!row) continue; // no data that day, skip
      }
      if (noExerciseDays >= 3) {
        result.push({
          key: `exercise_gap_${noExerciseDays}`,
          severity: noExerciseDays >= 5 ? 'error' : 'warning',
          icon: Zap,
          title: 'Exercise streak broken',
          message: `No exercise logged for ${noExerciseDays} day${noExerciseDays !== 1 ? 's' : ''}. Even a 20-min walk counts.`,
        });
      }
    }

    // ── 4. Spending spike ────────────────────────────────────────────────────
    if (prevMonthExpense > 0 && monthExpense > 0) {
      const pctChange = ((monthExpense - prevMonthExpense) / prevMonthExpense) * 100;
      // Only flag if current month > 80% elapsed (to avoid false positives early in month)
      const now = new Date();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const dayOfMonth = now.getDate();
      const monthProgress = dayOfMonth / daysInMonth;
      if (monthProgress > 0.5 && pctChange > 20) {
        result.push({
          key: `spending_spike_${Math.round(pctChange)}`,
          severity: pctChange > 40 ? 'error' : 'warning',
          icon: AlertTriangle,
          title: 'Spending spike',
          message: `Month-to-date spending is ${Math.round(pctChange)}% higher than last month's total. Check your Finance page.`,
        });
      }
    }

    // ── 5. Goal at risk ──────────────────────────────────────────────────────
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear(), 11, 31);
    const yearElapsed = (now - startOfYear) / (endOfYear - startOfYear);

    const atRiskGoals = goals.filter(g => {
      if (g.status === 'completed') return false;
      const pct = Number(g.progress_pct || 0);
      // A goal is "at risk" if progress is significantly behind year elapsed
      return pct < yearElapsed * 100 * 0.75; // more than 25% behind expected pace
    });

    if (atRiskGoals.length > 0) {
      const worst = atRiskGoals[0];
      result.push({
        key: `goal_risk_${worst.id}`,
        severity: 'warning',
        icon: Target,
        title: 'Goal at risk',
        message: `"${worst.title || worst.name}" is at ${Math.round(worst.progress_pct || 0)}% but ${Math.round(yearElapsed * 100)}% of the year has passed.`,
      });
    }

    return result;
  }, [checkins, goals, monthExpense, prevMonthExpense, todayStr]);

  const visible = insights.filter(i => !dismissed.includes(i.key)).slice(0, 3);

  if (visible.length === 0) return null;

  const severityStyles = {
    error:   { bg: 'var(--color-error-muted)',   color: 'var(--color-error)',   border: 'var(--color-error)' },
    warning: { bg: 'var(--color-warning-muted)', color: 'var(--color-warning)', border: 'var(--color-warning)' },
    info:    { bg: 'var(--accent-primary-muted)', color: 'var(--accent-primary)', border: 'var(--accent-primary)' },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <div className="label-caps" style={{ marginBottom: 'var(--space-1)' }}>
        Needs Attention · {visible.length}
      </div>
      {visible.map(insight => {
        const s = severityStyles[insight.severity] || severityStyles.info;
        const Icon = insight.icon;
        return (
          <div
            key={insight.key}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)',
              padding: 'var(--space-3) var(--space-4)',
              borderRadius: 'var(--radius-md)',
              background: s.bg,
              border: `1px solid ${s.color}22`,
              borderLeft: `3px solid ${s.color}`,
            }}
          >
            <Icon size={15} color={s.color} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 'var(--font-size-xs)', color: s.color, marginBottom: '2px' }}>
                {insight.title}
              </div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {insight.message}
              </div>
            </div>
            <button
              onClick={() => dismiss(insight.key)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted)', padding: '2px', flexShrink: 0,
                display: 'flex', alignItems: 'center',
              }}
              aria-label="Dismiss insight"
            >
              <X size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
