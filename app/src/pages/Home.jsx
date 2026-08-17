import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { CheckCircle2, Clock, Moon, Activity, Sparkles, Plus, Wallet, Target, ListTodo, FolderKanban, Circle, ArrowUpRight } from 'lucide-react';
import QuickAddModal from '../components/QuickAddModal';
import YearCountdown from '../components/YearCountdown';
import { today, startOfMonth, endOfMonth } from '../lib/date';

function MetricCard({ icon: Icon, label, value, subLabel, color, muted, onClick, tint }) {
  return (
    <div
      className="card"
      onClick={onClick}
      style={{
        padding: 'var(--space-4)',
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all var(--transition-normal)',
        '--tint': tint || 'transparent',
      }}
      onMouseEnter={e => onClick && (e.currentTarget.style.transform = 'translateY(-2px)')}
      onMouseLeave={e => onClick && (e.currentTarget.style.transform = 'translateY(0)')}
    >
      {/* Background tint */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(ellipse at top right, ${tint || 'transparent'} 0%, transparent 65%)`,
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
          marginBottom: 'var(--space-3)'
        }}>
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
          letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 'var(--space-1)'
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

function SectionPanel({ icon: Icon, title, color, items, emptyText, onNavigate, renderItem }) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div className="flex-between" style={{
        padding: 'var(--space-4) var(--space-5)',
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: 'var(--radius-sm)',
            backgroundColor: 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: color,
          }}>
            <Icon size={16} strokeWidth={2.5} />
          </div>
          <h3 style={{ margin: 0, fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
            {title}
          </h3>
        </div>
        <button
          className="btn-icon"
          onClick={onNavigate}
          aria-label={`Open ${title}`}
          style={{ width: '28px', height: '28px', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)' }}
        >
          <ArrowUpRight size={14} />
        </button>
      </div>

      <div style={{ padding: 'var(--space-2)' }}>
        {items.length > 0 ? items.map((item, i) => renderItem(item, i)) : (
          <div style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>{emptyText}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [todayCheckin, setTodayCheckin] = useState(null);
  const [habitLogs, setHabitLogs] = useState([]);
  const [habits, setHabits] = useState([]);
  const [monthExpense, setMonthExpense] = useState(0);
  const [pendingTasks, setPendingTasks] = useState([]);
  const [activeProjects, setActiveProjects] = useState([]);
  const [activeGoals, setActiveGoals] = useState([]);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const todayStr = today();



  const fetchTodayData = useCallback(async () => {
    try {
      setLoading(true);
      const [
        { data: checkinData },
        { data: habitsData },
        { data: logsData },
        { data: tasksData },
        { data: projData },
        { data: goalsData }
      ] = await Promise.all([
        supabase.from('daily_checkins').select('*').eq('user_id', user.id).eq('date', todayStr).maybeSingle(),
        supabase.from('habits').select('*').eq('user_id', user.id).eq('enabled', true),
        supabase.from('habit_logs').select('*').eq('user_id', user.id).eq('date', todayStr),
        supabase.from('tasks').select('*').eq('user_id', user.id).neq('status', 'done').order('created_at', { ascending: false }).limit(4),
        supabase.from('projects').select('*').eq('user_id', user.id).eq('status', 'active').order('updated_at', { ascending: false }),
        supabase.from('goals').select('*').eq('user_id', user.id).eq('status', 'active').order('updated_at', { ascending: false }).limit(3)
      ]);

      setTodayCheckin(checkinData);
      setHabits(habitsData || []);
      setHabitLogs(logsData || []);
      setPendingTasks(tasksData || []);
      setActiveProjects(projData || []);
      setActiveGoals(goalsData || []);

      const currentDate = new Date();
      const startOfMonthStr = startOfMonth(currentDate);
      const endOfMonthStr = endOfMonth(currentDate);
      const { data: txData } = await supabase.from('transactions').select('amount').eq('user_id', user.id).eq('type', 'expense').gte('date', startOfMonthStr).lte('date', endOfMonthStr);
      setMonthExpense((txData || []).reduce((acc, t) => acc + Number(t.amount), 0));
    } catch (err) {
      console.error('Error fetching home data:', err);
    } finally {
      setLoading(false);
    }
  }, [user, todayStr]);

  useEffect(() => {
    if (user) fetchTodayData();
  }, [user, fetchTodayData]);

  const isCheckinDone = Boolean(todayCheckin);
  const completedGoodHabitsCount = habits.filter(h => h.category === 'good_habit').filter(h => {
    const log = habitLogs.find(l => l.habit_id === h.id);
    if (h.type === 'boolean') return log?.value_bool === true;
    if (h.type === 'count') return (log?.value_count || 0) > 0;
    return false;
  }).length;
  const totalGoodHabits = habits.filter(h => h.category === 'good_habit').length;

  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 17 ? 'Good afternoon' : 'Good evening';
  const displayDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const userName = user?.user_metadata?.preferred_name || user?.user_metadata?.name || user?.user_metadata?.first_name || 'Souvik';

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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-5)' }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton card" style={{ height: '220px' }} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-col" style={{ gap: 'var(--space-8)', animation: 'page-enter var(--dur-normal) var(--ease-decel)' }}>

      {/* Greeting */}
      <div className="flex-between" style={{ flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h1 style={{ margin: 0, lineHeight: 1.1, fontSize: 'clamp(1.5rem, 4vw, 2rem)' }}>
            {greeting}, {userName}.
          </h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>
            {displayDate}
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowQuickAdd(true)}
          style={{ gap: 'var(--space-2)' }}
        >
          <Plus size={16} />
          Quick Add
        </button>
      </div>

      {/* Daily Check-in Hero */}
      <div
        className="card card-interactive"
        onClick={() => navigate('/checkin')}
        style={{
          padding: 'var(--space-5) var(--space-6)',
          background: isCheckinDone
            ? 'var(--bg-surface)'
            : `linear-gradient(135deg, var(--accent-primary-subtle) 0%, var(--bg-surface) 100%)`,
          borderColor: isCheckinDone ? 'var(--border-subtle)' : 'var(--accent-primary)',
          borderWidth: isCheckinDone ? '1px' : '1.5px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: 'var(--radius-full)',
              backgroundColor: isCheckinDone ? 'var(--color-success-muted)' : 'var(--accent-primary-muted)',
              color: isCheckinDone ? 'var(--color-success)' : 'var(--accent-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {isCheckinDone ? <CheckCircle2 size={22} strokeWidth={2.5} /> : <Clock size={22} strokeWidth={2} />}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 'var(--font-size-md)', color: 'var(--text-primary)' }}>
                {isCheckinDone ? "Today's check-in complete" : "Daily check-in pending"}
              </div>
              <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {isCheckinDone
                  ? `Logged at ${new Date(todayCheckin.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : "Take 60 seconds to log today's metrics."}
              </div>
            </div>
          </div>
          {!isCheckinDone && (
            <div className="btn btn-primary" style={{ pointerEvents: 'none', padding: '0 var(--space-4)', minHeight: '36px', fontSize: 'var(--font-size-sm)' }}>
              Start →
            </div>
          )}
        </div>
      </div>

      {/* Metric Cards */}
      <div>
        <p className="label-caps" style={{ marginBottom: 'var(--space-3)' }}>Today's Pulse</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--space-4)' }}>
          <MetricCard
            icon={Moon}
            label="Sleep"
            value={todayCheckin ? `${todayCheckin.sleep_hours}h` : '—'}
            subLabel={todayCheckin ? (Number(todayCheckin.sleep_hours) >= 7 ? '✓ Optimal rest' : '↓ Under target') : 'Awaiting check-in'}
            color="var(--accent-primary)"
            muted="var(--accent-primary-muted)"
            tint="rgba(91,76,220,0.07)"
          />
          <MetricCard
            icon={Activity}
            label="Exercise"
            value={todayCheckin ? (todayCheckin.exercise ? 'Yes' : 'No') : '—'}
            subLabel={todayCheckin ? (todayCheckin.exercise ? 'Active day' : 'Rest day') : 'Awaiting check-in'}
            color="var(--mod-health)"
            muted="var(--mod-health-muted)"
            tint="var(--mod-health-glow)"
          />
          <MetricCard
            icon={Sparkles}
            label="Habits"
            value={isCheckinDone ? `${completedGoodHabitsCount}/${totalGoodHabits}` : '—'}
            subLabel={isCheckinDone ? 'Good habits logged' : 'Awaiting check-in'}
            color="var(--mod-goals)"
            muted="var(--mod-goals-muted)"
            tint="var(--mod-goals-glow)"
          />
          <MetricCard
            icon={Wallet}
            label="Spent"
            value={`₹${monthExpense.toLocaleString('en-IN')}`}
            subLabel="This month so far"
            color="var(--mod-finance)"
            muted="var(--mod-finance-muted)"
            tint="var(--mod-finance-glow)"
            onClick={() => navigate('/finance')}
          />
        </div>
      </div>

      {/* Dashboard panels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 'var(--space-5)', alignItems: 'start' }}>

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
              transition: 'background-color var(--transition-fast)',
            }}>
              <Circle size={14} color="var(--text-muted)" strokeWidth={2} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.4 }}>
                {task.title}
              </span>
            </div>
          )}
        />

        <SectionPanel
          icon={FolderKanban}
          title="Active Projects"
          color="var(--mod-projects)"
          items={activeProjects}
          emptyText="No active projects"
          onNavigate={() => navigate('/projects')}
          renderItem={(proj, i) => (
            <div key={proj.id} style={{
              padding: 'var(--space-3) var(--space-4)',
              borderBottom: i < activeProjects.length - 1 ? '1px solid var(--border-subtle)' : 'none',
            }}>
              <div className="flex-between" style={{ marginBottom: '8px' }}>
                <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--text-primary)' }}>{proj.name}</span>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--mod-projects)', fontWeight: 600 }}>{proj.progress_pct}%</span>
              </div>
              <div className="progress-track" style={{ height: '4px' }}>
                <div className="progress-fill" style={{ width: `${proj.progress_pct}%`, background: 'linear-gradient(90deg, var(--mod-projects), var(--accent-primary))' }} />
              </div>
            </div>
          )}
        />

        <SectionPanel
          icon={Target}
          title="Top Goals"
          color="var(--mod-goals)"
          items={activeGoals}
          emptyText="No active goals"
          onNavigate={() => navigate('/goals')}
          renderItem={(goal, i) => (
            <div key={goal.id} style={{
              padding: 'var(--space-3) var(--space-4)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderBottom: i < activeGoals.length - 1 ? '1px solid var(--border-subtle)' : 'none',
            }}>
              <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--text-primary)' }}>{goal.name}</span>
              <span className="badge badge-goals">{goal.progress_pct}%</span>
            </div>
          )}
        />

      </div>

      {/* Year Countdown */}
      <YearCountdown onViewYear={() => navigate('/review')} />

      {/* FAB */}
      <button className="fab" onClick={() => setShowQuickAdd(true)} aria-label="Quick Add">
        <Plus size={22} strokeWidth={2.5} />
      </button>

      {showQuickAdd && (
        <QuickAddModal
          onClose={() => setShowQuickAdd(false)}
          onAdded={() => fetchTodayData()}
        />
      )}
    </div>
  );
}
