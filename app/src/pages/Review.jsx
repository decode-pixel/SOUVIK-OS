import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Calendar, Target, TrendingUp, CheckCircle2, AlertTriangle, BarChart2 } from 'lucide-react';
import MonthPicker from '../components/MonthPicker';
import MonthlyCalendar from '../components/MonthlyCalendar';
import DailyDetailDrawer from '../components/DailyDetailDrawer';
import YearCountdown from '../components/YearCountdown';
import {
  getMonthStart, getMonthEnd, getDaysInMonth,
  getYearProgress, getGoalHealth, getGoalHealthDisplay, getDaysRemaining,
  formatMonthLabel,
} from '../utils/dateUtils';

export default function Review() {
  const { user } = useAuth();
  const now = new Date();

  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear]   = useState(now.getFullYear());
  const [selectedDate, setSelectedDate]   = useState(null);
  const [showDrawer, setShowDrawer]       = useState(false);

  // Data
  const [loading, setLoading]             = useState(true);
  const [checkinDates, setCheckinDates]   = useState(new Set());
  const [monthStats, setMonthStats]       = useState(null);
  const [yearlyGoals, setYearlyGoals]     = useState([]);

  const monthStart = getMonthStart(selectedYear, selectedMonth);
  const monthEnd   = getMonthEnd(selectedYear, selectedMonth);
  const totalDays  = getDaysInMonth(selectedYear, selectedMonth);

  const loadMonthData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [
        { data: checkins },
        { data: habits },
        { data: logs },
        { data: tasks },
        { data: txData },
        { data: goals },
      ] = await Promise.all([
        supabase.from('daily_checkins').select('date, sleep_hours, exercise').eq('user_id', user.id).gte('date', monthStart).lte('date', monthEnd),
        supabase.from('habits').select('id, name, category, type').eq('user_id', user.id).eq('enabled', true),
        supabase.from('habit_logs').select('habit_id, date, value_bool, value_count').eq('user_id', user.id).gte('date', monthStart).lte('date', monthEnd),
        supabase.from('tasks').select('id, status, date').eq('user_id', user.id).gte('date', monthStart).lte('date', monthEnd),
        supabase.from('transactions').select('amount, type').eq('user_id', user.id).gte('date', monthStart).lte('date', monthEnd),
        supabase.from('goals').select('*').eq('user_id', user.id).neq('status', 'archived').order('created_at'),
      ]);

      // Checkin date set
      const checkinSet = new Set((checkins || []).map(c => c.date));
      setCheckinDates(checkinSet);

      // Yearly goals
      const yearGoals = (goals || []).filter(g => g.timeframe === 'Yearly' || g.timeframe === 'Long-term');
      setYearlyGoals(yearGoals);

      // Month stats
      const daysTracked = checkins?.length || 0;
      const avgSleep = daysTracked > 0
        ? ((checkins || []).reduce((s, c) => s + Number(c.sleep_hours || 0), 0) / daysTracked).toFixed(1)
        : null;
      const exerciseDays = (checkins || []).filter(c => c.exercise).length;

      // Habit consistency
      const goodHabits = (habits || []).filter(h => h.category === 'good_habit');
      let habitCompletions = 0, habitPossible = 0;
      goodHabits.forEach(habit => {
        daysTracked > 0 && (habitPossible += daysTracked);
        (logs || []).forEach(log => {
          if (log.habit_id === habit.id) {
            const done = habit.type === 'boolean' ? Boolean(log.value_bool) : (log.value_count || 0) > 0;
            if (done) habitCompletions++;
          }
        });
      });
      const habitConsistencyPct = habitPossible > 0 ? Math.round((habitCompletions / habitPossible) * 100) : null;

      // Task completion
      const allTasks = tasks || [];
      const completedTasks = allTasks.filter(t => t.status === 'done').length;
      const taskPct = allTasks.length > 0 ? Math.round((completedTasks / allTasks.length) * 100) : null;

      // Finance
      const totalExpenses = (txData || []).filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
      const totalIncome   = (txData || []).filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);

      setMonthStats({
        daysTracked,
        totalDays,
        avgSleep,
        exerciseDays,
        habitConsistencyPct,
        completedTasks,
        totalTasks: allTasks.length,
        taskPct,
        totalExpenses,
        totalIncome,
        coveragePct: Math.round((daysTracked / totalDays) * 100),
      });
    } catch (err) {
      console.error('Review load error:', err);
    } finally {
      setLoading(false);
    }
  }, [user, monthStart, monthEnd, totalDays]);

  useEffect(() => { loadMonthData(); }, [loadMonthData]);

  const handleDateSelect = (dateStr) => {
    setSelectedDate(dateStr);
    setShowDrawer(true);
  };

  const yp = getYearProgress();
  const isCurrentMonth = selectedMonth === now.getMonth() && selectedYear === now.getFullYear();

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-7)', animation: 'page-enter var(--dur-normal) var(--ease-decel)' }}>

      {/* PAGE HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1 style={{ margin: 0 }}>Life Review</h1>
          <p style={{ margin: 0 }}>Calendar, monthly insights, and year direction.</p>
        </div>
      </div>

      {/* TOP GRID: Year Countdown + Monthly Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-5)' }}>
        <YearCountdown />

        {/* Yearly Goal Summary */}
        <div className="card" style={{ padding: 'var(--space-5)', position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', top: 0, left: 0,
            width: '100%', height: '100%',
            background: 'radial-gradient(ellipse at bottom left, var(--mod-goals-glow) 0%, transparent 65%)',
            pointerEvents: 'none',
          }} />
          <div style={{ position: 'relative' }}>
            <div className="label-caps" style={{ marginBottom: 'var(--space-3)' }}>This Year's Direction</div>
            {yearlyGoals.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>No yearly goals set yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {yearlyGoals.slice(0, 4).map(goal => {
                  const health = getGoalHealth(goal.progress_pct, goal.status, goal.deadline);
                  const { label, badgeClass } = getGoalHealthDisplay(health);
                  const daysLeft = getDaysRemaining(goal.deadline);
                  return (
                    <div key={goal.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--text-primary)' }}>
                          {goal.title}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          <span className={`badge ${badgeClass}`}>{label}</span>
                          <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--mod-goals)' }}>
                            {goal.progress_pct}%
                          </span>
                        </div>
                      </div>
                      <div className="progress-track" style={{ height: '4px' }}>
                        <div className="progress-fill" style={{
                          width: `${goal.progress_pct}%`,
                          background: health === 'completed' ? 'var(--color-success)' : health === 'at_risk' ? 'var(--color-warning)' : 'var(--mod-goals)',
                        }} />
                      </div>
                    </div>
                  );
                })}
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', paddingTop: 'var(--space-2)', borderTop: '1px solid var(--border-subtle)', marginTop: 'var(--space-1)' }}>
                  {yp.daysRemaining} days remaining in {yp.year}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MONTHLY CALENDAR + STATS */}
      <div>
        {/* Month selector */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-5)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <div>
            <h2 style={{ margin: 0 }}>{formatMonthLabel(selectedYear, selectedMonth)}</h2>
            {monthStats && (
              <p style={{ margin: 0, fontSize: 'var(--font-size-sm)' }}>
                {monthStats.daysTracked} of {totalDays} days tracked · {monthStats.coveragePct}% coverage
              </p>
            )}
          </div>
          <MonthPicker
            year={selectedYear}
            month={selectedMonth}
            onChange={({ year, month }) => { setSelectedYear(year); setSelectedMonth(month); }}
          />
        </div>

        {/* Stats cards row */}
        {monthStats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
            <MiniStat label="Habit Consistency" value={monthStats.habitConsistencyPct !== null ? `${monthStats.habitConsistencyPct}%` : '—'} color="var(--mod-goals)" minDays={5} daysTracked={monthStats.daysTracked} />
            <MiniStat label="Tasks Done" value={monthStats.taskPct !== null ? `${monthStats.taskPct}%` : '—'} color="var(--mod-tasks)" sub={`${monthStats.completedTasks}/${monthStats.totalTasks}`} />
            <MiniStat label="Avg Sleep" value={monthStats.avgSleep !== null ? `${monthStats.avgSleep}h` : '—'} color="var(--accent-primary)" minDays={5} daysTracked={monthStats.daysTracked} />
            <MiniStat label="Exercise Days" value={monthStats.exerciseDays > 0 ? monthStats.exerciseDays : '—'} color="var(--mod-health)" sub={monthStats.exerciseDays > 0 ? 'days active' : undefined} />
            <MiniStat label="Month Spend" value={monthStats.totalExpenses > 0 ? `₹${Math.round(monthStats.totalExpenses).toLocaleString('en-IN')}` : '—'} color="var(--mod-finance)" />
          </div>
        )}

        {/* Calendar */}
        <div className="card" style={{ padding: 'var(--space-5)' }}>
          {loading ? (
            <div className="skeleton" style={{ height: '280px' }} />
          ) : (
            <MonthlyCalendar
              year={selectedYear}
              month={selectedMonth}
              checkinDates={checkinDates}
              selectedDate={selectedDate}
              onSelectDate={handleDateSelect}
            />
          )}
        </div>

        {/* Instruction hint */}
        <p style={{ textAlign: 'center', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-3)' }}>
          Tap any past day to view its full summary
        </p>
      </div>

      {/* GOAL DETAIL TABLE */}
      {yearlyGoals.length > 0 && (
        <div>
          <h2 style={{ margin: '0 0 var(--space-4)' }}>Yearly Goals</h2>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
                    {['Goal', 'Progress', 'Status', 'Days Remaining'].map(h => (
                      <th key={h} style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {yearlyGoals.map((goal, idx) => {
                    const health = getGoalHealth(goal.progress_pct, goal.status, goal.deadline);
                    const { label, badgeClass, color } = getGoalHealthDisplay(health);
                    const daysLeft = getDaysRemaining(goal.deadline);
                    return (
                      <tr key={goal.id} style={{
                        borderBottom: idx < yearlyGoals.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                        transition: 'background-color var(--dur-fast) var(--ease-standard)',
                      }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-subtle)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <td style={{ padding: 'var(--space-4)', color: 'var(--text-primary)', fontWeight: 500 }}>
                          {goal.title}
                          {goal.description && (
                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: '2px' }}>
                              {goal.description}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: 'var(--space-4)', minWidth: '120px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                            <div className="progress-track" style={{ flex: 1, height: '6px' }}>
                              <div className="progress-fill" style={{ width: `${goal.progress_pct}%`, backgroundColor: color }} />
                            </div>
                            <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color, minWidth: '36px', textAlign: 'right' }}>
                              {goal.progress_pct}%
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: 'var(--space-4)' }}>
                          <span className={`badge ${badgeClass}`}>{label}</span>
                        </td>
                        <td style={{ padding: 'var(--space-4)', fontWeight: 600, color: daysLeft < 30 ? 'var(--color-error)' : 'var(--text-secondary)' }}>
                          {daysLeft} days
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Needs Attention */}
      <NeedsAttentionSection yearlyGoals={yearlyGoals} monthStats={monthStats} />

      {/* Daily Detail Drawer */}
      {showDrawer && selectedDate && (
        <DailyDetailDrawer
          dateStr={selectedDate}
          onClose={() => { setShowDrawer(false); }}
          onDataChanged={loadMonthData}
        />
      )}
    </div>
  );
}

function MiniStat({ label, value, color, sub, minDays, daysTracked }) {
  const insufficient = minDays && daysTracked < minDays;
  return (
    <div className="card" style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
      <div style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontWeight: 700, fontSize: 'var(--font-size-xl)',
        color: insufficient ? 'var(--text-muted)' : (color || 'var(--text-primary)'),
        letterSpacing: '-0.03em', lineHeight: 1,
        marginBottom: '4px',
      }}>
        {insufficient ? '—' : value}
      </div>
      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </div>
      {sub && !insufficient && (
        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: '2px' }}>{sub}</div>
      )}
      {insufficient && (
        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: '2px' }}>Need {minDays}+ days</div>
      )}
    </div>
  );
}

function NeedsAttentionSection({ yearlyGoals, monthStats }) {
  const alerts = [];

  if (monthStats) {
    // Check-in gaps
    const now = new Date();
    const dayOfMonth = now.getDate();
    const coverageExpected = dayOfMonth;
    const actualTracked = monthStats.daysTracked;
    const gap = coverageExpected - actualTracked;
    if (gap >= 3) {
      alerts.push({ type: 'warning', msg: `Daily check-in missing for the last ~${gap} days this month` });
    }

    // Low habit consistency
    if (monthStats.habitConsistencyPct !== null && monthStats.habitConsistencyPct < 60) {
      alerts.push({ type: 'warning', msg: `Habit consistency is low this month (${monthStats.habitConsistencyPct}%)` });
    }

    // Low task completion
    if (monthStats.taskPct !== null && monthStats.taskPct < 50 && monthStats.totalTasks >= 5) {
      alerts.push({ type: 'warning', msg: `Task completion rate is ${monthStats.taskPct}% — ${monthStats.totalTasks - monthStats.completedTasks} tasks pending` });
    }
  }

  // Goals at risk or overdue
  yearlyGoals.forEach(goal => {
    const { getYearProgress: _ } = { getYearProgress: getYearProgress };
    const yp = getYearProgress();
    const health = getGoalHealth(goal.progress_pct, goal.status, goal.deadline);
    if (health === 'at_risk') {
      alerts.push({ type: 'warning', msg: `Goal "${goal.title}" is behind pace (${goal.progress_pct}%)` });
    }
    if (health === 'overdue') {
      alerts.push({ type: 'error', msg: `Goal "${goal.title}" is overdue — deadline has passed` });
    }
  });

  if (alerts.length === 0) return null;

  return (
    <div>
      <h2 style={{ margin: '0 0 var(--space-4)' }}>Needs Attention</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {alerts.map((alert, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: alert.type === 'error' ? 'var(--color-error-muted)' : 'var(--color-warning-muted)',
            border: `1px solid ${alert.type === 'error' ? 'rgba(220,38,38,0.15)' : 'rgba(217,119,6,0.15)'}`,
          }}>
            <AlertTriangle size={16} color={alert.type === 'error' ? 'var(--color-error)' : 'var(--color-warning)'} strokeWidth={2.5} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)', fontWeight: 500 }}>{alert.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
