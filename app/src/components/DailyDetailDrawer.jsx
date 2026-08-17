import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { X, Moon, Activity, CheckCircle2, Circle, Edit2 } from 'lucide-react';
import { formatDateFull, parseDateStr, isToday } from '../utils/dateUtils';
import { useNavigate } from 'react-router-dom';

/**
 * DailyDetailDrawer — Slide-in drawer/sheet showing a day's full summary.
 *
 * Props:
 *   dateStr: string (YYYY-MM-DD) — the day to show
 *   onClose: () => void
 */
export default function DailyDetailDrawer({ dateStr, onClose }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [checkin, setCheckin] = useState(null);
  const [habits, setHabits] = useState([]);
  const [habitLogs, setHabitLogs] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);

  const fetchDayData = useCallback(async () => {
    if (!user || !dateStr) return;
    try {
      setLoading(true);

      const [
        { data: checkinData },
        { data: habitsData },
        { data: logsData },
        { data: tasksData },
        { data: txData },
        { data: catData },
      ] = await Promise.all([
        supabase.from('daily_checkins').select('*').eq('user_id', user.id).eq('date', dateStr).maybeSingle(),
        supabase.from('habits').select('*').eq('user_id', user.id).eq('enabled', true).order('sort_order'),
        supabase.from('habit_logs').select('*').eq('user_id', user.id).eq('date', dateStr),
        supabase.from('tasks').select('*').eq('user_id', user.id).eq('date', dateStr).order('created_at'),
        supabase.from('transactions').select('*').eq('user_id', user.id).eq('date', dateStr).order('created_at'),
        supabase.from('transaction_categories').select('id, name, type').eq('user_id', user.id),
      ]);

      setCheckin(checkinData);
      setHabits(habitsData || []);
      setHabitLogs(logsData || []);
      setTasks(tasksData || []);
      setExpenses(txData || []);
      setCategories(catData || []);
    } catch (err) {
      console.error('Error loading day data:', err);
    } finally {
      setLoading(false);
    }
  }, [user, dateStr]);

  useEffect(() => {
    fetchDayData();
  }, [fetchDayData]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Prevent body scroll while drawer is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const displayDate = formatDateFull(dateStr);
  const isTodayDate = isToday(dateStr);

  const getCategoryName = (catId) => categories.find(c => c.id === catId)?.name || '—';
  const totalExpenses = expenses.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

  const goodHabits = habits.filter(h => h.category === 'good_habit');
  const trackingHabits = habits.filter(h => h.category === 'personal_tracking');

  const getHabitLog = (habitId) => habitLogs.find(l => l.habit_id === habitId);
  const isHabitDone = (habit) => {
    const log = getHabitLog(habit.id);
    if (!log) return false;
    if (habit.type === 'boolean') return Boolean(log.value_bool);
    if (habit.type === 'count') return (log.value_count || 0) > 0;
    return false;
  };

  const completedGoodHabits = goodHabits.filter(isHabitDone).length;
  const completedTasks = tasks.filter(t => t.status === 'done').length;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          zIndex: 200,
          animation: 'fadeIn var(--dur-fast) var(--ease-decel)',
        }}
      />

      {/* Drawer Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Daily summary for ${displayDate}`}
        style={{
          position: 'fixed',
          top: 0, right: 0, bottom: 0,
          width: 'min(480px, 100vw)',
          background: 'var(--bg-surface)',
          borderLeft: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-float)',
          zIndex: 201,
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInRight var(--dur-emphasis) var(--ease-decel)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: 'var(--space-5) var(--space-6)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div>
            <div style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 700, fontSize: 'var(--font-size-xl)',
              color: 'var(--text-primary)', letterSpacing: '-0.025em',
            }}>
              {isTodayDate ? 'Today' : parseDateStr(dateStr)?.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: '2px' }}>
              {parseDateStr(dateStr)?.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            {/* Edit — navigates to check-in for this date */}
            <button
              className="btn btn-secondary"
              onClick={() => { navigate(`/checkin?date=${dateStr}`); onClose(); }}
              style={{ minHeight: '34px', padding: '0 var(--space-3)', fontSize: 'var(--font-size-xs)', gap: '4px' }}
              title="Edit this day's check-in"
            >
              <Edit2 size={13} /> Edit
            </button>
            <button className="btn-icon" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-5) var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {[120, 100, 140, 110].map((h, i) => <div key={i} className="skeleton" style={{ height: h }} />)}
            </div>
          ) : (
            <>
              {/* No data state */}
              {!checkin && habits.length === 0 && tasks.length === 0 && (
                <div style={{ textAlign: 'center', padding: 'var(--space-10) var(--space-4)' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-4)' }}>📋</div>
                  <h3 style={{ marginBottom: 'var(--space-2)' }}>No data recorded</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>
                    {isTodayDate ? 'Complete your daily check-in to record today.' : 'No check-in was recorded for this day.'}
                  </p>
                  {isTodayDate && (
                    <button
                      className="btn btn-primary"
                      onClick={() => { navigate('/checkin'); onClose(); }}
                      style={{ marginTop: 'var(--space-4)' }}
                    >
                      Start Check-in
                    </button>
                  )}
                </div>
              )}

              {/* Check-in Summary */}
              {checkin && (
                <section>
                  <h4 className="label-caps" style={{ marginBottom: 'var(--space-3)' }}>Daily Check-in</h4>
                  <div className="card" style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    <DetailRow icon={Moon} iconColor="var(--accent-primary)" label="Sleep">
                      <span style={{ fontWeight: 600 }}>{checkin.sleep_hours}h</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }}>
                        {Number(checkin.sleep_hours) >= 7 ? '• Optimal' : '• Under target'}
                      </span>
                    </DetailRow>
                    <DetailRow icon={Activity} iconColor="var(--mod-health)" label="Exercise">
                      <span style={{
                        fontWeight: 600,
                        color: checkin.exercise ? 'var(--color-success)' : 'var(--text-muted)'
                      }}>
                        {checkin.exercise ? '✓ Yes' : '✗ Rest day'}
                      </span>
                    </DetailRow>
                    {checkin.achievement_text && (
                      <div style={{ paddingTop: 'var(--space-2)', borderTop: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>🏆 WIN</div>
                        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>{checkin.achievement_text}</div>
                      </div>
                    )}
                    {checkin.notes && (
                      <div style={{ paddingTop: 'var(--space-2)', borderTop: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>📝 NOTES</div>
                        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>{checkin.notes}</div>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Good Habits */}
              {goodHabits.length > 0 && (
                <section>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                    <h4 className="label-caps">Good Habits</h4>
                    <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-success)' }}>
                      {completedGoodHabits}/{goodHabits.length}
                    </span>
                  </div>
                  <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    {goodHabits.map((habit, idx) => {
                      const log = getHabitLog(habit.id);
                      const done = isHabitDone(habit);
                      return (
                        <div key={habit.id} style={{
                          padding: 'var(--space-3) var(--space-4)',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          borderBottom: idx < goodHabits.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                            {done
                              ? <CheckCircle2 size={16} color="var(--color-success)" strokeWidth={2.5} />
                              : <Circle size={16} color="var(--text-muted)" strokeWidth={2} />
                            }
                            <span style={{ fontSize: 'var(--font-size-sm)', color: done ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: done ? 500 : 400 }}>
                              {habit.name}
                            </span>
                          </div>
                          {habit.type === 'count' && log && (
                            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--text-secondary)' }}>
                              ×{log.value_count || 0}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Personal Tracking */}
              {trackingHabits.length > 0 && (
                <section>
                  <h4 className="label-caps" style={{ marginBottom: 'var(--space-3)' }}>Personal Tracking</h4>
                  <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    {trackingHabits.map((habit, idx) => {
                      const log = getHabitLog(habit.id);
                      return (
                        <div key={habit.id} style={{
                          padding: 'var(--space-3) var(--space-4)',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          borderBottom: idx < trackingHabits.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                        }}>
                          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>{habit.name}</span>
                          <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--text-secondary)' }}>
                            {habit.type === 'boolean'
                              ? (log?.value_bool ? 'Yes' : 'No')
                              : (log?.value_count || 0)
                            }
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Tasks */}
              {tasks.length > 0 && (
                <section>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                    <h4 className="label-caps">Tasks</h4>
                    <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--mod-tasks)' }}>
                      {completedTasks}/{tasks.length} done
                    </span>
                  </div>
                  <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    {tasks.map((task, idx) => (
                      <div key={task.id} style={{
                        padding: 'var(--space-3) var(--space-4)',
                        display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                        borderBottom: idx < tasks.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                      }}>
                        {task.status === 'done'
                          ? <CheckCircle2 size={15} color="var(--color-success)" strokeWidth={2.5} />
                          : <Circle size={15} color="var(--text-muted)" strokeWidth={2} />
                        }
                        <span style={{
                          fontSize: 'var(--font-size-sm)',
                          color: task.status === 'done' ? 'var(--text-muted)' : 'var(--text-primary)',
                          textDecoration: task.status === 'done' ? 'line-through' : 'none',
                          fontWeight: 500,
                        }}>
                          {task.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Expenses */}
              {expenses.length > 0 && (
                <section>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                    <h4 className="label-caps">Expenses</h4>
                    <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--mod-finance)' }}>
                      ₹{totalExpenses.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    {expenses.map((tx, idx) => (
                      <div key={tx.id} style={{
                        padding: 'var(--space-3) var(--space-4)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        borderBottom: idx < expenses.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                      }}>
                        <div>
                          <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--text-primary)' }}>
                            {getCategoryName(tx.category_id)}
                          </div>
                          {tx.note && (
                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{tx.note}</div>
                          )}
                        </div>
                        <span style={{
                          fontSize: 'var(--font-size-sm)', fontWeight: 600,
                          color: tx.type === 'income' ? 'var(--color-success)' : 'var(--text-primary)',
                        }}>
                          {tx.type === 'income' ? '+' : '−'}₹{Number(tx.amount).toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0.5; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </>
  );
}

function DetailRow({ icon: Icon, iconColor, label, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
      <div style={{
        width: '28px', height: '28px', borderRadius: 'var(--radius-sm)',
        backgroundColor: `${iconColor}22`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: iconColor, flexShrink: 0,
      }}>
        <Icon size={14} strokeWidth={2.5} />
      </div>
      <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', flex: 1 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--font-size-sm)' }}>
        {children}
      </div>
    </div>
  );
}
