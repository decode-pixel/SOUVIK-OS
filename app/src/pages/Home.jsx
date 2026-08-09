import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { CheckCircle2, Clock, Moon, Activity, Sparkles, Plus, Wallet, Target, ListTodo, FolderKanban, Circle, ArrowUpRight } from 'lucide-react';
import QuickAddModal from '../components/QuickAddModal';

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

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (user) fetchTodayData();
  }, [user]);

  async function fetchTodayData() {
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
        supabase.from('tasks').select('*').eq('user_id', user.id).neq('status', 'done').order('created_at', { ascending: false }).limit(3),
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
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0];
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString().split('T')[0];
      
      const { data: txData } = await supabase.from('transactions').select('amount').eq('user_id', user.id).eq('type', 'expense').gte('date', startOfMonth).lte('date', endOfMonth);
      setMonthExpense((txData || []).reduce((acc, t) => acc + Number(t.amount), 0));

    } catch (err) {
      console.error('Error fetching home data:', err);
    } finally {
      setLoading(false);
    }
  }

  const isCheckinDone = Boolean(todayCheckin);
  const completedGoodHabitsCount = habits.filter(h => h.category === 'good_habit').filter(h => {
    const log = habitLogs.find(l => l.habit_id === h.id);
    if (h.type === 'boolean') return log?.value_bool === true;
    if (h.type === 'count') return (log?.value_count || 0) > 0;
    return false;
  }).length;
  const totalGoodHabits = habits.filter(h => h.category === 'good_habit').length;

  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening';
  const displayDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  // Fallback for user name
  const userName = user?.user_metadata?.preferred_name || user?.user_metadata?.name || user?.user_metadata?.first_name || 'Souvik';

  if (loading) {
    return (
      <div className="flex-col" style={{ gap: 'var(--space-6)' }}>
        <div>
          <div className="skeleton" style={{ width: '200px', height: '32px', marginBottom: '8px' }} />
          <div className="skeleton" style={{ width: '150px', height: '20px' }} />
        </div>
        <div className="skeleton card" style={{ height: '120px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--space-4)' }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton card" style={{ height: '100px' }} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-col" style={{ gap: 'var(--space-8)', position: 'relative' }}>
      
      {/* Header Area */}
      <div className="flex-between">
        <div>
          <h1 style={{ letterSpacing: '-0.03em', margin: 0 }}>{greeting}, {userName}.</h1>
          <p className="text-muted" style={{ margin: 0 }}>{displayDate}</p>
        </div>
        
        {/* Desktop Quick Add (Visible >= 768px handled by CSS natively or via React rendering - here we'll just show it always but style it appropriately) */}
        <button className="btn btn-primary" style={{ display: 'none' /* Will use FAB for all for now, or just show here */ }} onClick={() => setShowQuickAdd(true)}>
          <Plus size={18} /> Quick Add
        </button>
      </div>

      {/* 1. Daily Check-in Hero */}
      <div 
        className="card card-interactive" 
        onClick={() => navigate('/checkin')}
        style={{ 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--space-5) var(--space-6)',
          borderColor: isCheckinDone ? 'var(--border-subtle)' : 'var(--accent-primary)'
        }}
      >
        <div className="flex-start" style={{ gap: 'var(--space-4)' }}>
          <div style={{ 
            width: '48px', height: '48px', borderRadius: 'var(--radius-full)', 
            backgroundColor: isCheckinDone ? 'var(--mod-finance-muted)' : 'var(--accent-primary-subtle)', 
            color: isCheckinDone ? 'var(--color-success)' : 'var(--accent-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center' 
          }}>
            {isCheckinDone ? <CheckCircle2 size={24} /> : <Clock size={24} />}
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>
              {isCheckinDone ? "Today's check-in complete" : "Daily check-in pending"}
            </h2>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              {isCheckinDone 
                ? `Logged at ${new Date(todayCheckin.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` 
                : "Take 60 seconds to log today's metrics."}
            </p>
          </div>
        </div>
        
        {!isCheckinDone && (
          <div className="btn btn-primary" style={{ pointerEvents: 'none' }}>
            Start
          </div>
        )}
      </div>

      {/* 2. Today's Snapshot (Premium Metric Composition) */}
      <div>
        <h3 style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>Today's Pulse</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--space-4)' }}>
          
          <div className="card flex-col" style={{ padding: 'var(--space-4)' }}>
            <span className="text-muted text-sm flex-start"><Moon size={20} /> Sleep</span>
            <div style={{ fontSize: '2rem', fontWeight: 700, margin: 'var(--space-1) 0', color: 'var(--text-primary)' }}>
              {todayCheckin ? `${todayCheckin.sleep_hours}h` : '—'}
            </div>
            <span className="text-xs" style={{ color: todayCheckin && Number(todayCheckin.sleep_hours) >= 7 ? 'var(--color-success)' : 'var(--text-secondary)' }}>
              {todayCheckin ? (Number(todayCheckin.sleep_hours) >= 7 ? 'Optimal rest' : 'Under target') : 'Awaiting check-in'}
            </span>
          </div>

          <div className="card flex-col" style={{ padding: 'var(--space-4)' }}>
            <span className="text-muted text-sm flex-start"><Activity size={20} /> Exercise</span>
            <div style={{ fontSize: '2rem', fontWeight: 700, margin: 'var(--space-1) 0', color: 'var(--text-primary)' }}>
              {todayCheckin ? (todayCheckin.exercise ? 'Yes' : 'No') : '—'}
            </div>
            <span className="text-xs text-secondary">
              {todayCheckin ? (todayCheckin.exercise ? 'Active day' : 'Rest day') : 'Awaiting check-in'}
            </span>
          </div>

          <div className="card flex-col" style={{ padding: 'var(--space-4)' }}>
            <span className="text-muted text-sm flex-start"><Sparkles size={20} /> Habits</span>
            <div style={{ fontSize: '2rem', fontWeight: 700, margin: 'var(--space-1) 0', color: 'var(--text-primary)' }}>
              {isCheckinDone ? `${completedGoodHabitsCount}/${totalGoodHabits}` : '—'}
            </div>
            <span className="text-xs text-secondary">
              {isCheckinDone ? 'Good habits logged' : 'Awaiting check-in'}
            </span>
          </div>

          <div className="card flex-col" style={{ padding: 'var(--space-4)', cursor: 'pointer' }} onClick={() => navigate('/finance')}>
            <span className="text-muted text-sm flex-start"><Wallet size={20} /> Spent Today</span>
            <div style={{ fontSize: '2rem', fontWeight: 700, margin: 'var(--space-1) 0', color: 'var(--mod-finance)' }}>
              {/* Not actually fetching 'today's spend' directly in the query above right now, just monthly, so we fallback to month for now or calculate today */}
              {/* Using monthExpense here as a placeholder for today's spend visually, ideally we query just today's. Let's just say 'This Month' for accuracy */}
              ₹{monthExpense.toLocaleString('en-IN')}
            </div>
            <span className="text-xs text-secondary">This month so far</span>
          </div>

        </div>
      </div>

      {/* 3. Dashboard Integration (Tasks, Projects, Goals) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-6)', alignItems: 'start' }}>
        
        {/* Top Tasks */}
        <div className="card flex-col" style={{ padding: '0', overflow: 'hidden' }}>
          <div className="flex-between" style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface-elevated)' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <ListTodo size={18} color="var(--mod-tasks)" /> Today's Focus
            </h3>
            <button className="btn-icon" onClick={() => navigate('/tasks')}><ArrowUpRight size={18} /></button>
          </div>
          <div style={{ padding: 'var(--space-2)' }}>
            {pendingTasks.length > 0 ? pendingTasks.map(task => (
              <div key={task.id} style={{ padding: 'var(--space-3) var(--space-4)', display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start', borderBottom: '1px solid var(--border-subtle)' }}>
                <Circle size={18} color="var(--text-secondary)" style={{ marginTop: '2px' }} />
                <span style={{ fontSize: '0.9375rem' }}>{task.title}</span>
              </div>
            )) : (
              <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-muted)' }}>No pending tasks</div>
            )}
          </div>
        </div>

        {/* Active Projects */}
        <div className="card flex-col" style={{ padding: '0', overflow: 'hidden' }}>
          <div className="flex-between" style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface-elevated)' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <FolderKanban size={18} color="var(--mod-projects)" /> Active Projects
            </h3>
            <button className="btn-icon" onClick={() => navigate('/projects')}><ArrowUpRight size={18} /></button>
          </div>
          <div style={{ padding: 'var(--space-2)' }}>
            {activeProjects.length > 0 ? activeProjects.map(proj => (
              <div key={proj.id} style={{ padding: 'var(--space-3) var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', borderBottom: '1px solid var(--border-subtle)' }}>
                <div className="flex-between">
                  <span style={{ fontSize: '0.9375rem', fontWeight: 500 }}>{proj.name}</span>
                  <span className="text-xs text-muted">{proj.progress_pct}%</span>
                </div>
                <div className="progress-track" style={{ height: '4px' }}>
                  <div className="progress-fill" style={{ width: `${proj.progress_pct}%`, backgroundColor: 'var(--mod-projects)' }} />
                </div>
              </div>
            )) : (
              <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-muted)' }}>No active projects</div>
            )}
          </div>
        </div>

        {/* Active Goals */}
        <div className="card flex-col" style={{ padding: '0', overflow: 'hidden' }}>
          <div className="flex-between" style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface-elevated)' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Target size={18} color="var(--mod-goals)" /> Top Goals
            </h3>
            <button className="btn-icon" onClick={() => navigate('/goals')}><ArrowUpRight size={18} /></button>
          </div>
          <div style={{ padding: 'var(--space-2)' }}>
            {activeGoals.length > 0 ? activeGoals.map(goal => (
              <div key={goal.id} style={{ padding: 'var(--space-3) var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', borderBottom: '1px solid var(--border-subtle)' }}>
                <div className="flex-between">
                  <span style={{ fontSize: '0.9375rem', fontWeight: 500 }}>{goal.name}</span>
                  <span className="badge" style={{ backgroundColor: 'var(--mod-goals-muted)', color: 'var(--mod-goals)' }}>{goal.progress_pct}%</span>
                </div>
              </div>
            )) : (
              <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-muted)' }}>No active goals</div>
            )}
          </div>
        </div>

      </div>

      {/* Floating Action Button for Quick Add */}
      <button className="fab" onClick={() => setShowQuickAdd(true)} aria-label="Quick Add">
        <Plus size={24} />
      </button>

      {/* Quick Add Modal */}
      {showQuickAdd && (
        <QuickAddModal 
          onClose={() => setShowQuickAdd(false)} 
          onAdded={(type) => {
            fetchTodayData(); // refresh dashboard data
          }} 
        />
      )}

    </div>
  );
}
