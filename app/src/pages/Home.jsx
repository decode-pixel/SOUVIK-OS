import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import {
  CheckCircle2, Clock, Moon, Activity, Sparkles, Plus, Wallet,
  Target, ListTodo, FolderKanban, Circle, ArrowUpRight,
  ChevronLeft, ChevronRight, ExternalLink, TrendingUp,
} from 'lucide-react';
import QuickAddModal from '../components/QuickAddModal';
import YearCountdown from '../components/YearCountdown';
import SmartInsights from '../components/SmartInsights';
import MiniCalendar from '../components/MiniCalendar';
import { today, startOfMonth, endOfMonth } from '../lib/date';
import { getYearProgress, shiftMonth, formatMonthLabel, getDaysRemaining } from '../utils/dateUtils';

// ─── Metric Card ──────────────────────────────────────────────────────────────
function MetricCard({ icon: Icon, label, value, subLabel, color, muted, onClick, tint }) {
  return (
    <div
      className="card"
      onClick={onClick}
      style={{
        padding: 'var(--space-4)',
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative', overflow: 'hidden',
        transition: 'all var(--transition-normal)',
      }}
      onMouseEnter={e => onClick && (e.currentTarget.style.transform = 'translateY(-2px)')}
      onMouseLeave={e => onClick && (e.currentTarget.style.transform = 'translateY(0)')}
    >
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(ellipse at top right, ${tint || 'transparent'} 0%, transparent 65%)`,
        pointerEvents: 'none',
      }} />
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: 'var(--radius-sm)',
            backgroundColor: muted, color: color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={14} strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {label}
          </span>
        </div>
        <div style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 'var(--font-size-2xl)', fontWeight: 700,
          color: color || 'var(--text-primary)',
          letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 'var(--space-1)',
        }}>
          {value}
        </div>
        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', fontWeight: 500 }}>
          {subLabel}
        </div>
      </div>
    </div>
  );
}

// ─── Section Panel ────────────────────────────────────────────────────────────
function SectionPanel({ icon: Icon, title, color, items, emptyText, onNavigate, renderItem }) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{
        padding: 'var(--space-4) var(--space-5)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
            <Icon size={16} strokeWidth={2.5} />
          </div>
          <h3 style={{ margin: 0, fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>{title}</h3>
        </div>
        {onNavigate && (
          <button className="btn-icon" onClick={onNavigate} aria-label={`Open ${title}`} style={{ width: '28px', height: '28px', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)' }}>
            <ArrowUpRight size={14} />
          </button>
        )}
      </div>
      <div style={{ padding: 'var(--space-2)' }}>
        {items.length > 0 ? items.map((item, i) => renderItem(item, i)) : (
          <div style={{ padding: 'var(--space-5)', textAlign: 'center' }}>
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>{emptyText}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Goal Health Badge ─────────────────────────────────────────────────────────
function GoalHealthBadge({ goal }) {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const endOfYear = new Date(now.getFullYear(), 11, 31);
  const yearElapsed = (now - startOfYear) / (endOfYear - startOfYear);
  const pct = Number(goal.progress_pct || 0);

  let label = 'On Track', badgeClass = 'badge-finance';
  if (goal.status === 'completed' || pct >= 100) { label = 'Done'; badgeClass = 'badge-success'; }
  else if (pct < yearElapsed * 100 * 0.65) { label = 'Behind'; badgeClass = 'badge-error'; }
  else if (pct < yearElapsed * 100 * 0.85) { label = 'At Risk'; badgeClass = 'badge-warning'; }

  return <span className={`badge ${badgeClass}`}>{label}</span>;
}

// ─── Pace Text ─────────────────────────────────────────────────────────────────
function PaceText({ goal }) {
  if (!goal.target_value || !goal.current_value) return null;
  const remaining = Number(goal.target_value) - Number(goal.current_value);
  if (remaining <= 0) return null;
  const daysLeft = getDaysRemaining(goal.deadline || null);
  const monthsLeft = Math.max(1, Math.ceil(daysLeft / 30));
  const perMonth = Math.ceil(remaining / monthsLeft);
  const unitStr = goal.unit ? ` ${goal.unit}` : '';
  return (
    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
      Need {unitStr.trim()}{perMonth.toLocaleString('en-IN')}/{monthsLeft === 1 ? 'month' : `mo × ${monthsLeft}`}
    </span>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const todayStr = today();

  // Month tab state (default = current month)
  const now = useMemo(() => new Date(), []);
  const [tabMonth, setTabMonth] = useState(now.getMonth());
  const [tabYear, setTabYear] = useState(now.getFullYear());

  // Mini-calendar selected day
  const [calSelectedDate, setCalSelectedDate] = useState(null);

  // Data state
  const [loading, setLoading] = useState(true);
  const [todayCheckin, setTodayCheckin] = useState(null);
  const [habits, setHabits] = useState([]);
  const [habitLogs, setHabitLogs] = useState([]);
  const [pendingTasks, setPendingTasks] = useState([]);
  const [activeProjects, setActiveProjects] = useState([]);
  const [activeGoals, setActiveGoals] = useState([]);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  // Monthly snapshot data
  const [monthCheckins, setMonthCheckins] = useState([]);
  const [last14Checkins, setLast14Checkins] = useState([]);
  const [monthExpense, setMonthExpense] = useState(0);
  const [prevMonthExpense, setPrevMonthExpense] = useState(0);
  const [checkinDates, setCheckinDates] = useState(new Set());

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);

      const monthStartStr = startOfMonth(new Date(tabYear, tabMonth, 1));
      const monthEndStr = endOfMonth(new Date(tabYear, tabMonth, 1));

      // Previous month range
      const prevMonthDate = new Date(tabYear, tabMonth - 1, 1);
      const prevStart = startOfMonth(prevMonthDate);
      const prevEnd = endOfMonth(prevMonthDate);

      // 14 days ago for insights
      const d14ago = new Date();
      d14ago.setDate(d14ago.getDate() - 14);
      const d14agoStr = d14ago.toISOString().slice(0, 10);

      const [
        { data: checkinToday },
        { data: habitsData },
        { data: logsData },
        { data: tasksData },
        { data: projData },
        { data: goalsData },
        { data: monthCheckinData },
        { data: last14Data },
        { data: txData },
        { data: prevTxData },
      ] = await Promise.all([
        supabase.from('daily_checkins').select('*').eq('user_id', user.id).eq('date', todayStr).maybeSingle(),
        supabase.from('habits').select('*').eq('user_id', user.id).eq('enabled', true),
        supabase.from('habit_logs').select('*').eq('user_id', user.id).eq('date', todayStr),
        supabase.from('tasks').select('*').eq('user_id', user.id).neq('status', 'done').order('created_at', { ascending: false }).limit(4),
        supabase.from('projects').select('*').eq('user_id', user.id).eq('status', 'active').order('updated_at', { ascending: false }),
        supabase.from('goals').select('*').eq('user_id', user.id).in('status', ['active']).order('created_at', { ascending: false }),
        supabase.from('daily_checkins').select('date, sleep_hours, exercise, completed_at').eq('user_id', user.id).gte('date', monthStartStr).lte('date', monthEndStr),
        supabase.from('daily_checkins').select('date, sleep_hours, exercise').eq('user_id', user.id).gte('date', d14agoStr).order('date'),
        supabase.from('transactions').select('amount, type').eq('user_id', user.id).eq('type', 'expense').gte('date', monthStartStr).lte('date', monthEndStr),
        supabase.from('transactions').select('amount, type').eq('user_id', user.id).eq('type', 'expense').gte('date', prevStart).lte('date', prevEnd),
      ]);

      setTodayCheckin(checkinToday);
      setHabits(habitsData || []);
      setHabitLogs(logsData || []);
      setPendingTasks(tasksData || []);
      setActiveProjects(projData || []);
      setActiveGoals(goalsData || []);
      setMonthCheckins(monthCheckinData || []);
      setLast14Checkins(last14Data || []);

      const mDates = new Set((monthCheckinData || []).map(c => c.date));
      setCheckinDates(mDates);

      setMonthExpense((txData || []).reduce((s, t) => s + Number(t.amount), 0));
      setPrevMonthExpense((prevTxData || []).reduce((s, t) => s + Number(t.amount), 0));
    } catch (err) {
      console.error('Error fetching home data:', err);
    } finally {
      setLoading(false);
    }
  }, [user, todayStr, tabMonth, tabYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Derived values ───────────────────────────────────────────────────────────
  const isCheckinDone = Boolean(todayCheckin);
  const completedGoodHabits = habits.filter(h => h.category === 'good_habit').filter(h => {
    const log = habitLogs.find(l => l.habit_id === h.id);
    return h.type === 'boolean' ? log?.value_bool === true : (log?.value_count || 0) > 0;
  }).length;
  const totalGoodHabits = habits.filter(h => h.category === 'good_habit').length;

  const monthStats = useMemo(() => {
    const daysTracked = monthCheckins.length;
    const exerciseDays = monthCheckins.filter(c => c.exercise).length;
    const avgSleep = daysTracked >= 2
      ? (monthCheckins.reduce((s, c) => s + Number(c.sleep_hours || 0), 0) / daysTracked).toFixed(1)
      : null;
    const daysInMonth = new Date(tabYear, tabMonth + 1, 0).getDate();
    const elapsedDays = tabYear === now.getFullYear() && tabMonth === now.getMonth()
      ? now.getDate()
      : daysInMonth;
    const coveragePct = elapsedDays > 0 ? Math.round((daysTracked / elapsedDays) * 100) : 0;
    return { daysTracked, exerciseDays, avgSleep, coveragePct, daysInMonth };
  }, [monthCheckins, tabMonth, tabYear, now]);

  const isCurrentMonth = tabMonth === now.getMonth() && tabYear === now.getFullYear();

  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 17 ? 'Good afternoon' : 'Good evening';
  const displayDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const userName = user?.user_metadata?.preferred_name || user?.user_metadata?.name || user?.user_metadata?.first_name || 'Souvik';

  // Month tab navigation
  const goMonthPrev = () => { const r = shiftMonth(tabYear, tabMonth, -1); setTabMonth(r.month); setTabYear(r.year); };
  const goMonthNext = () => {
    const next = shiftMonth(tabYear, tabMonth, 1);
    if (next.year > now.getFullYear() || (next.year === now.getFullYear() && next.month > now.getMonth())) return;
    setTabMonth(next.month); setTabYear(next.year);
  };
  const canGoNext = !(tabYear === now.getFullYear() && tabMonth === now.getMonth());

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex-col" style={{ gap: 'var(--space-6)' }}>
        <div>
          <div className="skeleton" style={{ width: '260px', height: '38px', marginBottom: '8px' }} />
          <div className="skeleton" style={{ width: '180px', height: '18px' }} />
        </div>
        <div className="skeleton card" style={{ height: '96px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--space-4)' }}>
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton card" style={{ height: '110px' }} />)}
        </div>
        <div className="skeleton card" style={{ height: '200px' }} />
      </div>
    );
  }

  return (
    <div className="flex-col" style={{ gap: 'var(--space-8)', animation: 'page-enter var(--dur-normal) var(--ease-decel)' }}>

      {/* ── SECTION 1: Hero Row ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h1 style={{ margin: 0, lineHeight: 1.1, fontSize: 'clamp(1.5rem, 4vw, 2rem)' }}>
            {greeting}, {userName}.
          </h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>
            {displayDate}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowQuickAdd(true)} style={{ gap: 'var(--space-2)' }}>
          <Plus size={16} />
          Quick Add
        </button>
      </div>

      {/* ── Check-in Hero ───────────────────────────────────────────────────── */}
      <div
        className="card card-interactive"
        onClick={() => navigate('/checkin')}
        style={{
          padding: 'var(--space-5) var(--space-6)',
          background: isCheckinDone
            ? 'var(--bg-surface)'
            : 'linear-gradient(135deg, var(--accent-primary-subtle) 0%, var(--bg-surface) 100%)',
          borderColor: isCheckinDone ? 'var(--border-subtle)' : 'var(--accent-primary)',
          borderWidth: isCheckinDone ? '1px' : '1.5px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: 'var(--radius-full)', flexShrink: 0,
              backgroundColor: isCheckinDone ? 'var(--color-success-muted)' : 'var(--accent-primary-muted)',
              color: isCheckinDone ? 'var(--color-success)' : 'var(--accent-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {isCheckinDone ? <CheckCircle2 size={22} strokeWidth={2.5} /> : <Clock size={22} strokeWidth={2} />}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 'var(--font-size-md)', color: 'var(--text-primary)' }}>
                {isCheckinDone ? "Today's check-in complete" : 'Daily check-in pending'}
              </div>
              <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {isCheckinDone
                  ? `Logged at ${new Date(todayCheckin.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : "Take 60 seconds to log today's metrics."}
              </div>
            </div>
          </div>
          {!isCheckinDone && (
            <div className="btn btn-primary" style={{ pointerEvents: 'none', padding: '0 var(--space-4)', fontSize: 'var(--font-size-sm)' }}>
              Start →
            </div>
          )}
        </div>
      </div>

      {/* ── Pulse Metrics ───────────────────────────────────────────────────── */}
      <div>
        <p className="label-caps" style={{ marginBottom: 'var(--space-3)' }}>Today's Pulse</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--space-4)' }}>
          <MetricCard icon={Moon} label="Sleep" value={todayCheckin ? `${todayCheckin.sleep_hours}h` : '—'} subLabel={todayCheckin ? (Number(todayCheckin.sleep_hours) >= 7 ? '✓ Optimal rest' : '↓ Under target') : 'Awaiting check-in'} color="var(--accent-primary)" muted="var(--accent-primary-muted)" tint="rgba(91,76,220,0.07)" />
          <MetricCard icon={Activity} label="Exercise" value={todayCheckin ? (todayCheckin.exercise ? 'Yes' : 'No') : '—'} subLabel={todayCheckin ? (todayCheckin.exercise ? 'Active day' : 'Rest day') : 'Awaiting check-in'} color="var(--mod-health)" muted="var(--mod-health-muted)" tint="var(--mod-health-glow)" />
          <MetricCard icon={Sparkles} label="Habits" value={isCheckinDone ? `${completedGoodHabits}/${totalGoodHabits}` : '—'} subLabel={isCheckinDone ? 'Good habits logged' : 'Awaiting check-in'} color="var(--mod-goals)" muted="var(--mod-goals-muted)" tint="var(--mod-goals-glow)" />
          <MetricCard icon={Wallet} label="Spent" value={`₹${monthExpense.toLocaleString('en-IN')}`} subLabel="This month so far" color="var(--mod-finance)" muted="var(--mod-finance-muted)" tint="var(--mod-finance-glow)" onClick={() => navigate('/finance')} />
        </div>
      </div>

      {/* ── SECTION 2: Smart Insights ───────────────────────────────────────── */}
      <SmartInsights
        checkins={last14Checkins}
        goals={activeGoals}
        monthExpense={monthExpense}
        prevMonthExpense={prevMonthExpense}
        todayStr={todayStr}
      />

      {/* ── SECTION 3: Monthly Snapshot Tab ────────────────────────────────── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Tab header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: 'var(--space-4) var(--space-5)',
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          <span className="label-caps">Monthly Snapshot</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <button className="btn-icon" onClick={goMonthPrev} style={{ width: '28px', height: '28px' }}>
              <ChevronLeft size={14} />
            </button>
            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--text-primary)', minWidth: '110px', textAlign: 'center' }}>
              {formatMonthLabel(tabYear, tabMonth)}
            </span>
            <button className="btn-icon" onClick={goMonthNext} disabled={!canGoNext} style={{ width: '28px', height: '28px', opacity: canGoNext ? 1 : 0.3 }}>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        <div style={{ padding: 'var(--space-5)' }}>
          {/* Month stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
            <MonthStatCard label="Avg Sleep" value={monthStats.avgSleep ? `${monthStats.avgSleep}h` : '—'} sub={monthStats.avgSleep ? (Number(monthStats.avgSleep) >= 7 ? 'On target' : 'Below target') : 'Not enough data'} color="var(--accent-primary)" />
            <MonthStatCard label="Exercise Days" value={monthStats.exerciseDays} sub={`of ${monthStats.daysTracked} logged`} color="var(--mod-health)" />
            <MonthStatCard label="Days Logged" value={monthStats.daysTracked} sub={`${monthStats.coveragePct}% coverage`} color="var(--mod-goals)" />
            <MonthStatCard label="Month Spend" value={`₹${monthExpense.toLocaleString('en-IN')}`} sub={prevMonthExpense > 0 ? (monthExpense > prevMonthExpense ? `↑ vs last month` : `↓ vs last month`) : 'vs last month'} color="var(--mod-finance)" />
          </div>

          {/* Mini calendar */}
          <div style={{ marginBottom: 'var(--space-3)' }}>
            <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 'var(--space-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Check-in History
            </div>
            <MiniCalendar
              year={tabYear}
              month={tabMonth}
              checkinDates={checkinDates}
              todayStr={todayStr}
              onDayClick={setCalSelectedDate}
              selectedDate={calSelectedDate}
              onCloseDrawer={() => setCalSelectedDate(null)}
            />
          </div>

          {/* Link to full Review */}
          <button
            onClick={() => navigate('/review')}
            style={{
              width: '100%', marginTop: 'var(--space-3)',
              padding: 'var(--space-3)', borderRadius: 'var(--radius-md)',
              border: '1px dashed var(--border-default)',
              background: 'transparent', cursor: 'pointer',
              fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--accent-primary)',
              fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)',
              transition: 'all var(--transition-fast)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-primary-subtle)'; e.currentTarget.style.borderColor = 'var(--accent-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border-default)'; }}
          >
            <ExternalLink size={12} />
            View full calendar & habit heatmap in Review
          </button>
        </div>
      </div>

      {/* ── SECTION 4: Focus & Goals Grid ──────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 'var(--space-5)', alignItems: 'start' }}>

        {/* Today's Focus */}
        <SectionPanel
          icon={ListTodo}
          title="Today's Focus"
          color="var(--mod-tasks)"
          items={pendingTasks}
          emptyText="No pending tasks — clear deck! 🎉"
          onNavigate={() => navigate('/tasks')}
          renderItem={(task, i) => (
            <div key={task.id} style={{
              padding: 'var(--space-3) var(--space-4)',
              display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
              borderBottom: i < pendingTasks.length - 1 ? '1px solid var(--border-subtle)' : 'none',
              borderRadius: 'var(--radius-sm)',
            }}>
              <Circle size={14} color="var(--text-muted)" strokeWidth={2} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.4 }}>
                {task.title}
              </span>
            </div>
          )}
        />

        {/* Yearly Goals */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{
            padding: 'var(--space-4) var(--space-5)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--mod-goals)' }}>
                <Target size={16} strokeWidth={2.5} />
              </div>
              <h3 style={{ margin: 0, fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>Yearly Goals</h3>
            </div>
            <button className="btn-icon" onClick={() => navigate('/goals')} aria-label="Open Goals" style={{ width: '28px', height: '28px', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)' }}>
              <ArrowUpRight size={14} />
            </button>
          </div>
          <div style={{ padding: 'var(--space-2)' }}>
            {activeGoals.length === 0 ? (
              <div style={{ padding: 'var(--space-5)', textAlign: 'center' }}>
                <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>No active goals</span>
              </div>
            ) : activeGoals.slice(0, 4).map((goal, i) => (
              <div key={goal.id} style={{
                padding: 'var(--space-3) var(--space-4)',
                borderBottom: i < Math.min(activeGoals.length, 4) - 1 ? '1px solid var(--border-subtle)' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-2)', marginBottom: '6px' }}>
                  <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                    {goal.title || goal.name}
                  </span>
                  <GoalHealthBadge goal={goal} />
                </div>
                {/* Progress bar */}
                <div className="progress-track" style={{ height: '4px', marginBottom: '4px' }}>
                  <div className="progress-fill" style={{
                    width: `${Math.min(100, Number(goal.progress_pct || 0))}%`,
                    background: 'linear-gradient(90deg, var(--mod-goals), var(--accent-primary))',
                  }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <PaceText goal={goal} />
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                    {Math.round(goal.progress_pct || 0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── SECTION 5: Active Projects ──────────────────────────────────────── */}
      {activeProjects.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
            <p className="label-caps">Active Projects</p>
            <button className="btn-icon" onClick={() => navigate('/projects')} aria-label="Open Projects" style={{ width: '28px', height: '28px', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)' }}>
              <ArrowUpRight size={14} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
            {activeProjects.map(proj => (
              <div key={proj.id} className="card" style={{ padding: 'var(--space-4)', cursor: 'pointer' }} onClick={() => navigate('/projects')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--mod-projects-muted)', color: 'var(--mod-projects)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FolderKanban size={12} />
                  </div>
                  <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }} className="truncate">
                    {proj.name}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Progress</span>
                  <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--mod-projects)' }}>{proj.progress_pct}%</span>
                </div>
                <div className="progress-track" style={{ height: '4px' }}>
                  <div className="progress-fill" style={{ width: `${proj.progress_pct}%`, background: 'linear-gradient(90deg, var(--mod-projects), var(--accent-primary))' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Year Countdown ──────────────────────────────────────────────────── */}
      <YearCountdown onViewYear={() => navigate('/review')} />

      {/* ── FAB ─────────────────────────────────────────────────────────────── */}
      <button className="fab" onClick={() => setShowQuickAdd(true)} aria-label="Quick Add">
        <Plus size={22} strokeWidth={2.5} />
      </button>

      {showQuickAdd && (
        <QuickAddModal onClose={() => setShowQuickAdd(false)} onAdded={fetchData} />
      )}
    </div>
  );
}

// ─── Month Stat Mini Card ─────────────────────────────────────────────────────
function MonthStatCard({ label, value, sub, color }) {
  return (
    <div style={{
      padding: 'var(--space-3) var(--space-4)',
      borderRadius: 'var(--radius-md)',
      background: 'var(--bg-subtle)',
      border: '1px solid var(--border-subtle)',
    }}>
      <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--space-1)' }}>
        {label}
      </div>
      <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 'var(--font-size-xl)', color: color || 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: '2px' }}>
        {value}
      </div>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{sub}</div>
    </div>
  );
}
