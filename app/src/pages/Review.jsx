import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import {
  CheckCircle2, AlertTriangle,
  Sparkles, Moon, Activity,
  Wallet, ListTodo, Clock, Star
} from 'lucide-react';
import MonthPicker from '../components/MonthPicker';
import MonthlyCalendar from '../components/MonthlyCalendar';
import DailyDetailDrawer from '../components/DailyDetailDrawer';
import HabitHeatmap from '../components/HabitHeatmap';
import { DonutRing, SparkLine } from '../components/MiniCharts';
import {
  getMonthStart, getMonthEnd, getDaysInMonth, shiftMonth,
  getYearProgress, getGoalHealth, getGoalHealthDisplay, getDaysRemaining,
  formatMonthLabel, parseDateStr, today, addDays
} from '../utils/dateUtils';

// ─── helpers ──────────────────────────────────────────────────────────────────

function computeMonthStats(checkins, habits, logs, tasks, txData, totalDays) {
  const daysTracked = checkins?.length || 0;

  const avgSleep = daysTracked >= 3
    ? ((checkins || []).reduce((s, c) => s + Number(c.sleep_hours || 0), 0) / daysTracked).toFixed(1)
    : null;

  const exerciseDays = (checkins || []).filter(c => c.exercise).length;

  // Habit consistency (good habits only)
  const goodHabits = (habits || []).filter(h => h.category === 'good_habit');
  let habitDone = 0;
  goodHabits.forEach(habit => {
    (logs || []).forEach(log => {
      if (log.habit_id !== habit.id) return;
      const done = habit.type === 'boolean' ? Boolean(log.value_bool) : (log.value_count || 0) > 0;
      if (done) habitDone++;
    });
  });
  // Calculate possible = goodHabits.length * daysTracked (one entry per habit per checked-in day)
  const habitPossibleCalc = goodHabits.length * daysTracked;
  const habitConsistencyPct = habitPossibleCalc > 0
    ? Math.round((habitDone / habitPossibleCalc) * 100)
    : null;

  // Task stats
  const allTasks = tasks || [];
  const completedTasks = allTasks.filter(t => t.status === 'done').length;
  const taskPct = allTasks.length > 0 ? Math.round((completedTasks / allTasks.length) * 100) : null;

  // Finance
  const totalExpenses = (txData || []).filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const totalIncome   = (txData || []).filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);

  const coveragePct = Math.round((daysTracked / totalDays) * 100);

  // Daily sleep array for sparkline
  const sleepArray = (checkins || [])
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(c => Number(c.sleep_hours || 0));

  return {
    daysTracked, totalDays, coveragePct,
    avgSleep, exerciseDays,
    habitConsistencyPct, goodHabits: goodHabits.length,
    completedTasks, totalTasks: allTasks.length, taskPct,
    totalExpenses, totalIncome,
    sleepArray,
  };
}

// ─── main component ────────────────────────────────────────────────────────────

export default function Review() {
  const { user } = useAuth();
  const now = useMemo(() => new Date(), []);

  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear]   = useState(now.getFullYear());
  const [selectedDate, setSelectedDate]   = useState(null);
  const [showDrawer, setShowDrawer]       = useState(false);
  const [activeSection, setActiveSection] = useState('month'); // 'month' | 'habits' | 'goals' | 'year'

  // Data
  const [loading, setLoading]         = useState(true);
  const [checkinDates, setCheckinDates] = useState(new Set());
  const [checkins, setCheckins]       = useState([]);
  const [habits, setHabits]           = useState([]);
  const [habitLogs, setHabitLogs]     = useState([]);
  const [allHabitLogs, setAllHabitLogs] = useState([]);
  const [tasks, setTasks]             = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [yearlyGoals, setYearlyGoals] = useState([]);
  const [prevMonthStats, setPrevMonthStats] = useState(null);
  const [weeklyData, setWeeklyData]   = useState(null);

  const monthStart = getMonthStart(selectedYear, selectedMonth);
  const monthEnd   = getMonthEnd(selectedYear, selectedMonth);
  const totalDays  = getDaysInMonth(selectedYear, selectedMonth);

  const monthStats = useMemo(
    () => computeMonthStats(checkins, habits, habitLogs, tasks, transactions, totalDays),
    [checkins, habits, habitLogs, tasks, transactions, totalDays]
  );

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Prev month for comparison
      const prev = shiftMonth(selectedYear, selectedMonth, -1);
      const prevStart = getMonthStart(prev.year, prev.month);
      const prevEnd   = getMonthEnd(prev.year, prev.month);
      const prevTotal = getDaysInMonth(prev.year, prev.month);

      // Current week
      const currentToday = today();
      const weekStartStr = addDays(currentToday, -now.getDay());
      const weekEndStr   = currentToday;

      const [
        { data: checkinData },
        { data: habitsData },
        { data: logsData },
        { data: tasksData },
        { data: txData },
        { data: goals },
        { data: prevCheckins },
        { data: prevLogs },
        { data: prevTasks },
        { data: weekCheckins },
        { data: weekLogs },
        { data: weekTasks },
        { data: allLogsData },
      ] = await Promise.all([
        supabase.from('daily_checkins').select('date, sleep_hours, exercise, achievement_text, notes').eq('user_id', user.id).gte('date', monthStart).lte('date', monthEnd).order('date'),
        supabase.from('habits').select('id, name, category, type, sort_order').eq('user_id', user.id).eq('enabled', true).order('sort_order'),
        supabase.from('habit_logs').select('habit_id, date, value_bool, value_count').eq('user_id', user.id).gte('date', monthStart).lte('date', monthEnd),
        supabase.from('tasks').select('id, status, title, date').eq('user_id', user.id).gte('date', monthStart).lte('date', monthEnd),
        supabase.from('transactions').select('amount, type, category_id, date').eq('user_id', user.id).gte('date', monthStart).lte('date', monthEnd),
        supabase.from('goals').select('*').eq('user_id', user.id).neq('status', 'archived').order('created_at'),
        supabase.from('daily_checkins').select('date, sleep_hours, exercise').eq('user_id', user.id).gte('date', prevStart).lte('date', prevEnd),
        supabase.from('habit_logs').select('habit_id, date, value_bool, value_count').eq('user_id', user.id).gte('date', prevStart).lte('date', prevEnd),
        supabase.from('tasks').select('id, status').eq('user_id', user.id).gte('date', prevStart).lte('date', prevEnd),
        supabase.from('daily_checkins').select('date, sleep_hours, exercise').eq('user_id', user.id).gte('date', weekStartStr).lte('date', weekEndStr),
        supabase.from('habit_logs').select('habit_id, date, value_bool, value_count').eq('user_id', user.id).gte('date', weekStartStr).lte('date', weekEndStr),
        supabase.from('tasks').select('id, status, title').eq('user_id', user.id).gte('date', weekStartStr).lte('date', weekEndStr),
        supabase.from('habit_logs').select('habit_id, date, value_bool, value_count').eq('user_id', user.id),
      ]);

      setCheckins(checkinData || []);
      setHabits(habitsData || []);
      setHabitLogs(logsData || []);
      setAllHabitLogs(allLogsData || []);
      setTasks(tasksData || []);
      setTransactions(txData || []);
      setYearlyGoals((goals || []).filter(g => g.timeframe === 'Yearly' || g.timeframe === 'Long-term'));
      setCheckinDates(new Set((checkinData || []).map(c => c.date)));

      // Previous month stats
      const habitsForCalc = habitsData || [];
      const pm = computeMonthStats(prevCheckins, habitsForCalc, prevLogs, prevTasks, [], prevTotal);
      setPrevMonthStats(pm);

      // Weekly summary
      const weekGoodHabits = habitsForCalc.filter(h => h.category === 'good_habit');
      let wHabitDone = 0, wHabitPossible = weekGoodHabits.length * (weekCheckins?.length || 0);
      weekGoodHabits.forEach(habit => {
        (weekLogs || []).forEach(log => {
          if (log.habit_id !== habit.id) return;
          const done = habit.type === 'boolean' ? Boolean(log.value_bool) : (log.value_count || 0) > 0;
          if (done) wHabitDone++;
        });
      });

      setWeeklyData({
        daysChecked: weekCheckins?.length || 0,
        habitPct: wHabitPossible > 0 ? Math.round((wHabitDone / wHabitPossible) * 100) : null,
        tasksCompleted: (weekTasks || []).filter(t => t.status === 'done').length,
        totalTasks: weekTasks?.length || 0,
        avgSleep: weekCheckins?.length
          ? ((weekCheckins || []).reduce((s, c) => s + Number(c.sleep_hours || 0), 0) / weekCheckins.length).toFixed(1)
          : null,
        exerciseDays: (weekCheckins || []).filter(c => c.exercise).length,
      });

    } catch (err) {
      console.error('Review load error:', err);
    } finally {
      setLoading(false);
    }
  }, [user, monthStart, monthEnd, selectedMonth, selectedYear, now]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDateSelect = (dateStr) => {
    setSelectedDate(dateStr);
    setShowDrawer(true);
  };

  const yp = getYearProgress();
  const isCurrentMonth = selectedMonth === now.getMonth() && selectedYear === now.getFullYear();

  // Comparison delta helper
  const delta = (curr, prev) => {
    if (curr === null || prev === null) return null;
    return Math.round(curr - prev);
  };

  const goodHabits = habits.filter(h => h.category === 'good_habit');

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-7)', animation: 'page-enter var(--dur-normal) var(--ease-decel)' }}>

      {/* ── PAGE HEADER ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1 style={{ margin: 0 }}>Life Review</h1>
          <p style={{ margin: 0 }}>Monthly insights, habit patterns, and year direction.</p>
        </div>

        {/* Section nav tabs */}
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          {[
            { id: 'month', label: 'Monthly' },
            { id: 'habits', label: 'Habits' },
            { id: 'goals', label: 'Goals' },
            { id: 'year', label: 'Year' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              style={{
                padding: '6px 14px', borderRadius: 'var(--radius-full)',
                border: '1px solid var(--border-default)',
                fontFamily: 'inherit', fontWeight: 600, fontSize: 'var(--font-size-xs)',
                cursor: 'pointer', transition: 'all var(--dur-fast) var(--ease-standard)',
                background: activeSection === tab.id ? 'var(--text-primary)' : 'var(--bg-surface)',
                color: activeSection === tab.id ? 'var(--bg-app)' : 'var(--text-secondary)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          MONTHLY SECTION
         ══════════════════════════════════════════════ */}
      {activeSection === 'month' && (
        <>
          {/* Month selector */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
            <div>
              <h2 style={{ margin: 0 }}>{formatMonthLabel(selectedYear, selectedMonth)}</h2>
              {monthStats && (
                <p style={{ margin: '2px 0 0', fontSize: 'var(--font-size-sm)' }}>
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

          {/* Monthly summary card */}
          {monthStats && monthStats.daysTracked >= 3 && (
            <div className="card" style={{ padding: 'var(--space-5)', background: 'var(--bg-surface)' }}>
              <h3 style={{ margin: '0 0 var(--space-4)', fontSize: 'var(--font-size-md)', color: 'var(--text-secondary)', fontWeight: 500 }}>
                {formatMonthLabel(selectedYear, selectedMonth)} at a glance
              </h3>
              <p style={{ margin: 0, fontSize: 'var(--font-size-md)', color: 'var(--text-primary)', lineHeight: 1.7 }}>
                You tracked <strong>{monthStats.daysTracked} days</strong>.{' '}
                {monthStats.habitConsistencyPct !== null && <>Habit consistency was <strong style={{ color: monthStats.habitConsistencyPct >= 70 ? 'var(--color-success)' : 'var(--color-warning)' }}>{monthStats.habitConsistencyPct}%</strong>. </>}
                {monthStats.taskPct !== null && <>You completed <strong>{monthStats.taskPct}%</strong> of planned tasks. </>}
                {monthStats.avgSleep !== null && <>Average sleep was <strong>{monthStats.avgSleep}h</strong>. </>}
                {monthStats.totalExpenses > 0 && <>Total spend was <strong>₹{Math.round(monthStats.totalExpenses).toLocaleString('en-IN')}</strong>.</>}
              </p>
            </div>
          )}

          {/* Stats grid */}
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 'var(--space-3)' }}>
              {[1,2,3,4,5].map(i => <div key={i} className="skeleton card" style={{ height: 100 }} />)}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 'var(--space-3)' }}>
              <StatCard
                icon={Sparkles} iconColor="var(--mod-goals)"
                label="Habit Consistency"
                value={monthStats.habitConsistencyPct !== null ? `${monthStats.habitConsistencyPct}%` : '—'}
                delta={prevMonthStats ? delta(monthStats.habitConsistencyPct, prevMonthStats.habitConsistencyPct) : null}
                minDays={5} daysTracked={monthStats.daysTracked}
                sub={`${monthStats.goodHabits} habits tracked`}
                donutPct={monthStats.habitConsistencyPct}
                donutColor="var(--mod-goals)"
              />
              <StatCard
                icon={ListTodo} iconColor="var(--mod-tasks)"
                label="Task Completion"
                value={monthStats.taskPct !== null ? `${monthStats.taskPct}%` : '—'}
                delta={prevMonthStats ? delta(monthStats.taskPct, prevMonthStats.taskPct) : null}
                sub={`${monthStats.completedTasks}/${monthStats.totalTasks} done`}
                donutPct={monthStats.taskPct}
                donutColor="var(--mod-tasks)"
              />
              <StatCard
                icon={Moon} iconColor="var(--accent-primary)"
                label="Avg Sleep"
                value={monthStats.avgSleep !== null ? `${monthStats.avgSleep}h` : '—'}
                delta={prevMonthStats ? delta(parseFloat(monthStats.avgSleep), parseFloat(prevMonthStats.avgSleep)) : null}
                minDays={5} daysTracked={monthStats.daysTracked}
                sub="per night"
              />
              <StatCard
                icon={Activity} iconColor="var(--mod-health)"
                label="Exercise Days"
                value={monthStats.exerciseDays > 0 ? monthStats.exerciseDays : '—'}
                delta={prevMonthStats ? delta(monthStats.exerciseDays, prevMonthStats.exerciseDays) : null}
                sub="days active"
              />
              <StatCard
                icon={Wallet} iconColor="var(--mod-finance)"
                label="Month Spend"
                value={monthStats.totalExpenses > 0 ? `₹${Math.round(monthStats.totalExpenses / 1000).toFixed(1)}k` : '—'}
                sub={monthStats.totalIncome > 0 ? `In: ₹${Math.round(monthStats.totalIncome/1000).toFixed(1)}k` : 'expenses'}
              />
            </div>
          )}

          {/* Sleep sparkline if data exists */}
          {monthStats.sleepArray.length >= 5 && (
            <div className="card" style={{ padding: 'var(--space-4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <Moon size={14} color="var(--accent-primary)" />
                  <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>Sleep Trend</span>
                </div>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                  Avg {monthStats.avgSleep}h/night
                </span>
              </div>
              <SparkLine data={monthStats.sleepArray} color="var(--accent-primary)" height={50} />
            </div>
          )}

          {/* Month comparison */}
          {prevMonthStats && monthStats.daysTracked >= 3 && (
            <div>
              <h3 style={{ margin: '0 0 var(--space-4)' }}>
                vs. {(() => { const p = shiftMonth(selectedYear, selectedMonth, -1); return formatMonthLabel(p.year, p.month); })()} <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 400, color: 'var(--text-muted)' }}>comparison</span>
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: 'var(--space-3)' }}>
                <CompareCard label="Habit Consistency" prev={prevMonthStats.habitConsistencyPct} curr={monthStats.habitConsistencyPct} unit="%" />
                <CompareCard label="Task Completion" prev={prevMonthStats.taskPct} curr={monthStats.taskPct} unit="%" />
                <CompareCard label="Avg Sleep" prev={parseFloat(prevMonthStats.avgSleep)} curr={parseFloat(monthStats.avgSleep)} unit="h" decimals={1} />
                <CompareCard label="Exercise Days" prev={prevMonthStats.exerciseDays} curr={monthStats.exerciseDays} unit=" days" />
              </div>
            </div>
          )}

          {/* Calendar */}
          <div>
            <h3 style={{ margin: '0 0 var(--space-4)' }}>Calendar</h3>
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
            <p style={{ textAlign: 'center', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-3)' }}>
              Tap any past day to view its full summary
            </p>
          </div>

          {/* Weekly Snapshot */}
          {weeklyData && isCurrentMonth && (
            <WeeklySnapshot weeklyData={weeklyData} habits={habits} />
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════
          HABITS SECTION
         ══════════════════════════════════════════════ */}
      {activeSection === 'habits' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
            <div>
              <h2 style={{ margin: 0 }}>Habit Consistency</h2>
              <p style={{ margin: 0, fontSize: 'var(--font-size-sm)' }}>
                {formatMonthLabel(selectedYear, selectedMonth)} · Day-by-day breakdown
              </p>
            </div>
            <MonthPicker
              year={selectedYear}
              month={selectedMonth}
              onChange={({ year, month }) => { setSelectedYear(year); setSelectedMonth(month); }}
              compact
            />
          </div>

          {loading ? (
            <div className="skeleton card" style={{ height: 300 }} />
          ) : goodHabits.length === 0 ? (
            <EmptyState icon="✨" title="No habits configured" sub="Add good habits in your Check-in to track consistency here." />
          ) : (
            <>
              {/* Overall consistency ring */}
              <div className="card" style={{ padding: 'var(--space-5)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)', flexWrap: 'wrap' }}>
                  <DonutRing
                    pct={monthStats.habitConsistencyPct || 0}
                    size={88}
                    strokeWidth={10}
                    color={
                      (monthStats.habitConsistencyPct || 0) >= 80 ? 'var(--color-success)' :
                      (monthStats.habitConsistencyPct || 0) >= 60 ? 'var(--color-warning)' :
                      'var(--color-error)'
                    }
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 'var(--font-size-2xl)', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
                      {monthStats.habitConsistencyPct !== null ? `${monthStats.habitConsistencyPct}% consistent` : 'Not enough data'}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)', marginTop: 4 }}>
                      {formatMonthLabel(selectedYear, selectedMonth)} · {monthStats.daysTracked} days tracked · {goodHabits.length} habits
                    </div>
                    {monthStats.habitConsistencyPct !== null && (
                      <div style={{ marginTop: 'var(--space-2)', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                        {monthStats.habitConsistencyPct >= 80
                          ? '🏆 Excellent — you\'re building strong routines!'
                          : monthStats.habitConsistencyPct >= 60
                          ? '⚡ Good — keep pushing for more consistency.'
                          : '💪 Room to grow — small steps every day.'}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Individual heatmaps */}
              <div className="card" style={{ padding: 'var(--space-5)' }}>
                <h3 style={{ margin: '0 0 var(--space-5)', fontSize: 'var(--font-size-md)' }}>Good Habits</h3>
                {goodHabits.map(habit => (
                  <HabitHeatmap
                    key={habit.id}
                    habit={habit}
                    logs={habitLogs}
                    allTimeLogs={allHabitLogs}
                    year={selectedYear}
                    month={selectedMonth}
                  />
                ))}
              </div>

              {/* Tracking habits */}
              {habits.filter(h => h.category === 'personal_tracking').length > 0 && (
                <div className="card" style={{ padding: 'var(--space-5)' }}>
                  <h3 style={{ margin: '0 0 var(--space-5)', fontSize: 'var(--font-size-md)', color: 'var(--text-secondary)' }}>Personal Tracking</h3>
                  {habits.filter(h => h.category === 'personal_tracking').map(habit => (
                    <HabitHeatmap
                      key={habit.id}
                      habit={habit}
                      logs={habitLogs}
                      allTimeLogs={allHabitLogs}
                      year={selectedYear}
                      month={selectedMonth}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════
          GOALS SECTION
         ══════════════════════════════════════════════ */}
      {activeSection === 'goals' && (
        <>
          <div>
            <h2 style={{ margin: 0 }}>Yearly Goals</h2>
            <p style={{ margin: 0, fontSize: 'var(--font-size-sm)' }}>
              {yp.year} · {yp.daysRemaining} days remaining · {yp.pctDisplay}% of year elapsed
            </p>
          </div>

          {loading ? (
            <div className="skeleton card" style={{ height: 300 }} />
          ) : yearlyGoals.length === 0 ? (
            <EmptyState icon="🎯" title="No yearly goals yet" sub="Set goals in the Goals section and mark them as 'Yearly' to see them here." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {yearlyGoals.map(goal => {
                const health = getGoalHealth(goal.progress_pct, goal.status, goal.deadline);
                const { label, badgeClass, color } = getGoalHealthDisplay(health);
                const daysLeft = getDaysRemaining(goal.deadline);
                const expectedPct = goal.deadline ? null : yp.pct;

                return (
                  <div key={goal.id} className="card" style={{ padding: 'var(--space-5)', borderLeft: `3px solid ${color}` }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 4 }}>
                          <h3 style={{ margin: 0, fontSize: 'var(--font-size-md)' }}>{goal.title}</h3>
                          <span className={`badge ${badgeClass}`}>{label}</span>
                        </div>
                        {goal.description && (
                          <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{goal.description}</p>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, fontFamily: "'Plus Jakarta Sans',sans-serif", color, letterSpacing: '-0.03em' }}>
                          {goal.progress_pct}%
                        </div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                          {daysLeft} days left
                        </div>
                      </div>
                    </div>

                    {/* Progress bar with expected marker */}
                    <div style={{ position: 'relative', marginBottom: 'var(--space-3)' }}>
                      <div className="progress-track" style={{ height: '10px', borderRadius: 'var(--radius-full)' }}>
                        <div className="progress-fill" style={{
                          width: `${goal.progress_pct}%`,
                          height: '100%', borderRadius: 'var(--radius-full)',
                          backgroundColor: color,
                          transition: 'width 800ms var(--ease-spring)',
                        }} />
                      </div>
                      {/* Expected pace marker */}
                      {expectedPct && (
                        <div style={{
                          position: 'absolute', top: '-4px', bottom: '-4px',
                          left: `${Math.min(expectedPct, 98)}%`,
                          width: '2px', backgroundColor: 'var(--text-muted)',
                          borderRadius: 'var(--radius-full)',
                          opacity: 0.5,
                        }} title={`Expected pace: ${expectedPct.toFixed(0)}%`} />
                      )}
                    </div>

                    {/* Context row */}
                    <div style={{ display: 'flex', gap: 'var(--space-5)', flexWrap: 'wrap' }}>
                      {expectedPct && (
                        <GoalMeta label="Expected pace" value={`${expectedPct.toFixed(0)}%`} />
                      )}
                      {goal.deadline && (
                        <GoalMeta label="Deadline" value={parseDateStr(goal.deadline)?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} />
                      )}
                      <GoalMeta label="Timeframe" value={goal.timeframe} />
                      {health === 'at_risk' && expectedPct && (
                        <GoalMeta
                          label="Gap"
                          value={`${(expectedPct - goal.progress_pct).toFixed(0)}% behind`}
                          valueColor="var(--color-warning)"
                        />
                      )}
                    </div>

                    {/* Health explanation */}
                    {health === 'at_risk' && (
                      <div style={{ marginTop: 'var(--space-3)', padding: 'var(--space-2) var(--space-3)', backgroundColor: 'var(--color-warning-muted)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-size-xs)', color: 'var(--color-warning)', fontWeight: 500 }}>
                        ⚠ {yp.pctDisplay}% of year has passed, but only {goal.progress_pct}% of this goal is complete. Pick up the pace.
                      </div>
                    )}
                    {health === 'overdue' && (
                      <div style={{ marginTop: 'var(--space-3)', padding: 'var(--space-2) var(--space-3)', backgroundColor: 'var(--color-error-muted)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-size-xs)', color: 'var(--color-error)', fontWeight: 500 }}>
                        ✗ Deadline has passed. Consider updating the goal or marking it complete.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Needs Attention */}
          <NeedsAttentionSection yearlyGoals={yearlyGoals} monthStats={monthStats} yp={yp} />
        </>
      )}

      {/* ══════════════════════════════════════════════
          YEAR SECTION
         ══════════════════════════════════════════════ */}
      {activeSection === 'year' && (
        <>
          <div>
            <h2 style={{ margin: 0 }}>Year {yp.year}</h2>
            <p style={{ margin: 0, fontSize: 'var(--font-size-sm)' }}>Your direction and progress toward the year's ambitions.</p>
          </div>


          {/* Year metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 'var(--space-4)' }}>
            <YearStatCard label="Year" value={yp.year} sub="current" />
            <YearStatCard label="Day of Year" value={`${yp.dayOfYear}`} sub={`of ${yp.totalDays}`} />
            <YearStatCard label="Days Remaining" value={yp.daysRemaining} sub={`${yp.weeksRemaining} weeks`} color="var(--accent-primary)" />
            <YearStatCard label="Year Elapsed" value={`${yp.pctDisplay}%`} sub="completed" color="var(--mod-finance)" />
            <YearStatCard label="Goals" value={yearlyGoals.filter(g => g.status === 'completed').length} sub={`of ${yearlyGoals.length} completed`} color="var(--color-success)" />
            <YearStatCard label="At Risk" value={yearlyGoals.filter(g => getGoalHealth(g.progress_pct, g.status, g.deadline) === 'at_risk').length} sub="goals behind pace" color="var(--color-warning)" />
          </div>

          {/* Year Direction summary */}
          <div className="card" style={{ padding: 'var(--space-6)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, right: 0, width: '200px', height: '100%', background: 'radial-gradient(ellipse at top right, var(--accent-primary-subtle) 0%, transparent 65%)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative' }}>
              <h3 style={{ margin: '0 0 var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Star size={18} color="var(--accent-primary)" /> This Year's Direction
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {yearlyGoals.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>
                    No yearly goals set. Define what you want to achieve in {yp.year} in the Goals section.
                  </p>
                ) : yearlyGoals.map(goal => {
                  const health = getGoalHealth(goal.progress_pct, goal.status, goal.deadline);
                  const { label, color, badgeClass } = getGoalHealthDisplay(health);
                  return (
                    <div key={goal.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--text-primary)' }}>{goal.title}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          <span className={`badge ${badgeClass}`}>{label}</span>
                          <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color }}>{goal.progress_pct}%</span>
                        </div>
                      </div>
                      <div className="progress-track" style={{ height: '6px' }}>
                        <div className="progress-fill" style={{ width: `${goal.progress_pct}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Daily Detail Drawer */}
      {showDrawer && selectedDate && (
        <DailyDetailDrawer
          dateStr={selectedDate}
          onClose={() => setShowDrawer(false)}
          onDataChanged={loadData}
        />
      )}
    </div>
  );
}

// ─── sub-components ────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, iconColor, label, value, delta: d, sub, minDays, daysTracked, donutPct, donutColor }) {
  const insufficient = minDays && daysTracked < minDays;
  const showDonut = donutPct !== undefined && donutPct !== null && !insufficient;

  return (
    <div className="card" style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', backgroundColor: `${iconColor}22`, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={14} strokeWidth={2.5} />
        </div>
        {showDonut && <DonutRing pct={donutPct} size={36} strokeWidth={5} color={donutColor || iconColor} />}
      </div>
      <div>
        <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 'var(--font-size-xl)', fontWeight: 800, letterSpacing: '-0.03em', color: insufficient ? 'var(--text-muted)' : 'var(--text-primary)', lineHeight: 1 }}>
          {insufficient ? '—' : value}
        </div>
        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 3 }}>
          {label}
        </div>
        {d !== null && d !== undefined && !insufficient && (
          <div style={{ fontSize: 'var(--font-size-xs)', color: d > 0 ? 'var(--color-success)' : d < 0 ? 'var(--color-error)' : 'var(--text-muted)', marginTop: 2, fontWeight: 600 }}>
            {d > 0 ? '↑' : d < 0 ? '↓' : '→'} {Math.abs(d)} vs last month
          </div>
        )}
        {sub && !insufficient && <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
        {insufficient && <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: 2 }}>Need {minDays}+ days</div>}
      </div>
    </div>
  );
}

function CompareCard({ label, prev, curr, unit, decimals = 0 }) {
  if (prev === null || curr === null) return null;
  const d = decimals === 0 ? Math.round(curr - prev) : parseFloat((curr - prev).toFixed(decimals));
  const improved = d > 0;
  const same = d === 0;

  return (
    <div className="card" style={{ padding: 'var(--space-4)' }}>
      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-3)' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)', marginBottom: 4 }}>
        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>{prev}{unit}</span>
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>→</span>
        <span style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, fontFamily: "'Plus Jakarta Sans',sans-serif", color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>{curr}{unit}</span>
      </div>
      <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: same ? 'var(--text-muted)' : improved ? 'var(--color-success)' : 'var(--color-error)' }}>
        {same ? '→ No change' : improved ? `↑ +${Math.abs(d)}${unit}` : `↓ ${d}${unit}`}
      </div>
    </div>
  );
}

function WeeklySnapshot({ weeklyData: wd }) {
  if (!wd) return null;
  return (
    <div className="card" style={{ padding: 'var(--space-5)', borderLeft: '3px solid var(--accent-primary)' }}>
      <h3 style={{ margin: '0 0 var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <Clock size={16} color="var(--accent-primary)" /> This Week
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 'var(--space-4)' }}>
        <WeekStat label="Days Checked In" value={`${wd.daysChecked}/7`} />
        {wd.habitPct !== null && <WeekStat label="Habit Consistency" value={`${wd.habitPct}%`} color={wd.habitPct >= 70 ? 'var(--color-success)' : 'var(--color-warning)'} />}
        {wd.totalTasks > 0 && <WeekStat label="Tasks Done" value={`${wd.tasksCompleted}/${wd.totalTasks}`} />}
        {wd.avgSleep && <WeekStat label="Avg Sleep" value={`${wd.avgSleep}h`} />}
        <WeekStat label="Exercise Days" value={`${wd.exerciseDays} days`} />
      </div>
    </div>
  );
}

function WeekStat({ label, value, color }) {
  return (
    <div>
      <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 'var(--font-size-lg)', fontWeight: 700, color: color || 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', fontWeight: 500, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function GoalMeta({ label, value, valueColor }) {
  return (
    <div>
      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: valueColor || 'var(--text-primary)', marginTop: 2 }}>{value}</div>
    </div>
  );
}

function YearStatCard({ label, value, sub, color }) {
  return (
    <div className="card" style={{ padding: 'var(--space-4)', textAlign: 'left' }}>
      <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 'var(--font-size-2xl)', fontWeight: 800, letterSpacing: '-0.04em', color: color || 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function EmptyState({ icon, title, sub }) {
  return (
    <div className="card" style={{ padding: 'var(--space-10)', textAlign: 'center' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-4)' }}>{icon}</div>
      <h3 style={{ margin: '0 0 var(--space-2)' }}>{title}</h3>
      <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>{sub}</p>
    </div>
  );
}

function NeedsAttentionSection({ yearlyGoals, monthStats, yp }) {
  const alerts = [];

  if (monthStats && monthStats.daysTracked > 0) {
    const now = new Date();
    const dayOfMonth = now.getDate();
    const gap = dayOfMonth - monthStats.daysTracked;
    if (gap >= 3) alerts.push({ type: 'warning', msg: `Daily check-in missing for ~${gap} days this month` });
    if (monthStats.habitConsistencyPct !== null && monthStats.habitConsistencyPct < 60) {
      alerts.push({ type: 'warning', msg: `Habit consistency is low: ${monthStats.habitConsistencyPct}% — aim for 70%+` });
    }
    if (monthStats.taskPct !== null && monthStats.taskPct < 50 && monthStats.totalTasks >= 5) {
      alerts.push({ type: 'warning', msg: `Task completion: ${monthStats.taskPct}% — ${monthStats.totalTasks - monthStats.completedTasks} tasks still pending` });
    }
  }

  yearlyGoals.forEach(goal => {
    const health = getGoalHealth(goal.progress_pct, goal.status, goal.deadline);
    if (health === 'at_risk') alerts.push({ type: 'warning', msg: `"${goal.title}" is behind pace (${goal.progress_pct}% done, ${yp.pctDisplay}% of year elapsed)` });
    if (health === 'overdue') alerts.push({ type: 'error', msg: `"${goal.title}" is overdue — deadline has passed at ${goal.progress_pct}%` });
  });

  if (alerts.length === 0) return (
    <div className="card" style={{ padding: 'var(--space-5)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
      <CheckCircle2 size={20} color="var(--color-success)" />
      <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', fontWeight: 500 }}>Everything looks good — no issues detected!</span>
    </div>
  );

  return (
    <div>
      <h3 style={{ margin: '0 0 var(--space-3)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <AlertTriangle size={16} color="var(--color-warning)" /> Needs Attention
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {alerts.map((alert, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)',
            padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-md)',
            backgroundColor: alert.type === 'error' ? 'var(--color-error-muted)' : 'var(--color-warning-muted)',
            border: `1px solid ${alert.type === 'error' ? 'rgba(220,38,38,0.15)' : 'rgba(217,119,6,0.15)'}`,
          }}>
            <AlertTriangle size={14} color={alert.type === 'error' ? 'var(--color-error)' : 'var(--color-warning)'} strokeWidth={2.5} style={{ flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)', fontWeight: 500 }}>{alert.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

