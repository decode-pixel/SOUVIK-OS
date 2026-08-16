import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { today, addDays } from '../lib/date';
import { CheckCircle2, ChevronLeft, ChevronRight, Sparkles, Moon, Activity, Flame, Award, Calendar, ArrowLeft, ArrowRight } from 'lucide-react';

const DEFAULT_HABITS = [
  { name: 'Reading / Learning (30m)', type: 'boolean', category: 'good_habit', sort_order: 1 },
  { name: 'Meditation / Mindfulness', type: 'boolean', category: 'good_habit', sort_order: 2 },
  { name: 'Deep Work Session', type: 'count', category: 'good_habit', sort_order: 3 },
  { name: 'Cigarettes Count', type: 'count', category: 'personal_tracking', sort_order: 4 },
  { name: 'Alcohol (Drinks)', type: 'count', category: 'personal_tracking', sort_order: 5 },
];

export default function Checkin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const todayStr = today();
  const selectedDate = searchParams.get('date') || todayStr;
  const isToday = selectedDate === todayStr;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [habits, setHabits] = useState([]);

  const [sleepHours, setSleepHours] = useState(7);
  const [exercise, setExercise] = useState(false);
  const [habitValues, setHabitValues] = useState({});
  const [achievementText, setAchievementText] = useState('');
  const [notes, setNotes] = useState('');
  const [isExistingRecord, setIsExistingRecord] = useState(false);
  const [showOptional, setShowOptional] = useState(false);

  useEffect(() => {
    if (user) loadCheckinData(selectedDate);
  }, [user, selectedDate]);

  async function loadCheckinData(date) {
    try {
      setLoading(true);
      setSubmittedSuccess(false);

      let { data: userHabits, error: habitsError } = await supabase
        .from('habits').select('*').eq('user_id', user.id).order('sort_order', { ascending: true });

      if (habitsError) throw habitsError;

      if (!userHabits || userHabits.length === 0) {
        const toInsert = DEFAULT_HABITS.map(h => ({ ...h, user_id: user.id, enabled: true }));
        const { data: inserted, error: insertErr } = await supabase.from('habits').insert(toInsert).select();
        if (!insertErr && inserted) userHabits = inserted;
      }

      setHabits(userHabits || []);

      const { data: existingCheckin, error: checkinErr } = await supabase
        .from('daily_checkins').select('*').eq('user_id', user.id).eq('date', date).maybeSingle();
      if (checkinErr) throw checkinErr;

      const { data: existingHabitLogs, error: logsErr } = await supabase
        .from('habit_logs').select('*').eq('user_id', user.id).eq('date', date);
      if (logsErr) throw logsErr;

      const initialHabitValues = {};
      (userHabits || []).forEach(h => {
        const foundLog = (existingHabitLogs || []).find(l => l.habit_id === h.id);
        initialHabitValues[h.id] = {
          value_bool: foundLog ? foundLog.value_bool : false,
          value_count: foundLog ? (foundLog.value_count ?? 0) : 0,
        };
      });

      if (existingCheckin) {
        setIsExistingRecord(true);
        setSleepHours(Number(existingCheckin.sleep_hours) || 7);
        setExercise(Boolean(existingCheckin.exercise));
        setAchievementText(existingCheckin.achievement_text || '');
        setNotes(existingCheckin.notes || '');
        setHabitValues(initialHabitValues);
        if (existingCheckin.achievement_text || existingCheckin.notes) setShowOptional(true);
      } else {
        setIsExistingRecord(false);
        const draftKey = `souvik_checkin_draft_${date}`;
        const savedDraft = localStorage.getItem(draftKey);
        if (savedDraft && isToday) {
          try {
            const parsed = JSON.parse(savedDraft);
            setSleepHours(parsed.sleepHours ?? 7);
            setExercise(parsed.exercise ?? false);
            setHabitValues(parsed.habitValues ?? initialHabitValues);
            setAchievementText(parsed.achievementText ?? '');
            setNotes(parsed.notes ?? '');
          } catch { setHabitValues(initialHabitValues); }
        } else {
          setSleepHours(7); setExercise(false);
          setAchievementText(''); setNotes('');
          setHabitValues(initialHabitValues);
        }
      }
    } catch (err) {
      console.error('Error loading check-in data:', err);
    } finally {
      setLoading(false);
    }
  }

  const saveDraftLocally = (updatedFields) => {
    if (!isToday || isExistingRecord) return;
    const currentData = { sleepHours, exercise, habitValues, achievementText, notes, ...updatedFields };
    localStorage.setItem(`souvik_checkin_draft_${selectedDate}`, JSON.stringify(currentData));
  };

  const handleSleepSelect = (hours) => { setSleepHours(hours); saveDraftLocally({ sleepHours: hours }); };
  const handleExerciseToggle = (val) => { setExercise(val); saveDraftLocally({ exercise: val }); };
  const handleHabitBoolToggle = (habitId) => {
    const current = habitValues[habitId]?.value_bool || false;
    const updated = { ...habitValues, [habitId]: { ...habitValues[habitId], value_bool: !current } };
    setHabitValues(updated); saveDraftLocally({ habitValues: updated });
  };
  const handleHabitCountChange = (habitId, delta) => {
    const current = habitValues[habitId]?.value_count || 0;
    const nextVal = Math.max(0, current + delta);
    const updated = { ...habitValues, [habitId]: { ...habitValues[habitId], value_count: nextVal } };
    setHabitValues(updated); saveDraftLocally({ habitValues: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    try {
      setSubmitting(true);
      const checkinPayload = {
        user_id: user.id, date: selectedDate,
        sleep_hours: sleepHours, exercise: exercise,
        achievement_text: achievementText.trim() || null,
        notes: notes.trim() || null,
        completed_at: new Date().toISOString(),
      };
      const { error: checkinError } = await supabase.from('daily_checkins').upsert(checkinPayload, { onConflict: 'user_id,date' });
      if (checkinError) throw checkinError;

      const enabledHabits = habits.filter(h => h.enabled);
      const habitLogPayloads = enabledHabits.map(h => ({
        user_id: user.id, habit_id: h.id, date: selectedDate,
        value_bool: h.type === 'boolean' ? Boolean(habitValues[h.id]?.value_bool) : null,
        value_count: h.type === 'count' ? Number(habitValues[h.id]?.value_count || 0) : null,
      }));

      if (habitLogPayloads.length > 0) {
        const { error: logsError } = await supabase.from('habit_logs').upsert(habitLogPayloads, { onConflict: 'user_id,habit_id,date' });
        if (logsError) throw logsError;
      }

      localStorage.removeItem(`souvik_checkin_draft_${selectedDate}`);
      setSubmittedSuccess(true);
      setIsExistingRecord(true);
    } catch (err) {
      console.error('Error submitting checkin:', err);
      alert('Failed to save check-in: ' + (err.message || 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  const shiftDate = (days) => {
    const newDateStr = addDays(selectedDate, days);
    if (newDateStr > todayStr) return;
    setSearchParams({ date: newDateStr });
  };

  const enabledGoodHabits = habits.filter(h => h.enabled && h.category === 'good_habit');
  const enabledTracking = habits.filter(h => h.enabled && h.category === 'personal_tracking');

  if (loading) {
    return (
      <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
        {[1, 2, 3, 4].map(i => <div key={i} className="skeleton card" style={{ height: '120px' }} />)}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', animation: 'page-enter var(--dur-normal) var(--ease-decel)' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ marginBottom: 'var(--space-1)' }}>Daily Check-in</h1>
          <p style={{ margin: 0 }}>
            {isToday ? "Log today's pulse in under 60 seconds." : `Viewing: ${selectedDate}`}
          </p>
        </div>

        {/* Date Nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', flexShrink: 0 }}>
          <button type="button" className="btn-icon" onClick={() => shiftDate(-1)} title="Previous Day" style={{ width: '34px', height: '34px' }}>
            <ChevronLeft size={18} />
          </button>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-secondary)',
            padding: '0 var(--space-2)', whiteSpace: 'nowrap'
          }}>
            <Calendar size={13} color="var(--text-muted)" />
            {isToday ? 'Today' : selectedDate}
          </div>
          <button type="button" className="btn-icon" onClick={() => shiftDate(1)} disabled={isToday} title="Next Day" style={{ width: '34px', height: '34px' }}>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Success Banner */}
      {submittedSuccess && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
          padding: 'var(--space-4) var(--space-5)',
          borderRadius: 'var(--radius-lg)',
          background: 'linear-gradient(135deg, var(--color-success) 0%, #0d9e6e 100%)',
          marginBottom: 'var(--space-5)',
          boxShadow: '0 4px 16px rgba(5,150,105,0.3)',
        }}>
          <CheckCircle2 size={24} color="#fff" strokeWidth={2.5} />
          <div style={{ flex: 1 }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 'var(--font-size-md)' }}>Check-in saved ✓</div>
            <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 'var(--font-size-sm)' }}>Dashboard has been updated.</div>
          </div>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '0 var(--space-4)', minHeight: '34px', borderRadius: 'var(--radius-md)',
              background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)',
              color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
              fontSize: 'var(--font-size-xs)', whiteSpace: 'nowrap',
            }}
          >
            ← Home
          </button>
        </div>
      )}

      {/* Existing record badge */}
      {!submittedSuccess && isExistingRecord && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
          <span className="badge badge-success"><CheckCircle2 size={12} /> Completed</span>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
            Modify and re-submit anytime.
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

        {/* 1. Sleep Hours */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--accent-primary-muted)', color: 'var(--accent-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Moon size={18} strokeWidth={2} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 'var(--font-size-md)' }}>Sleep Hours</h3>
              <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>How many hours did you sleep?</p>
            </div>
          </div>

          <div className="chip-group">
            {[5, 6, 7, 8, 9].map((hrs) => (
              <button
                key={hrs}
                type="button"
                className={`chip ${sleepHours === hrs ? 'active' : ''}`}
                onClick={() => handleSleepSelect(hrs)}
                style={{ minWidth: '68px' }}
              >
                {hrs === 9 ? '9+ hrs' : `${hrs}h`}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Exercise */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--mod-health-muted)', color: 'var(--mod-health)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Activity size={18} strokeWidth={2} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 'var(--font-size-md)' }}>Exercise & Movement</h3>
              <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Did you work out or move today?</p>
            </div>
          </div>

          <div className="chip-group">
            <button
              type="button"
              className={`chip ${exercise === true ? 'active' : ''}`}
              onClick={() => handleExerciseToggle(true)}
            >
              ✓ Yes, worked out
            </button>
            <button
              type="button"
              className={`chip ${exercise === false ? 'active' : ''}`}
              onClick={() => handleExerciseToggle(false)}
            >
              Rest day
            </button>
          </div>
        </div>

        {/* 3. Good Habits */}
        {enabledGoodHabits.length > 0 && (
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--accent-primary-muted)', color: 'var(--accent-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Sparkles size={18} strokeWidth={2} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 'var(--font-size-md)' }}>Good Habits</h3>
                <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Track your daily positive habits</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {enabledGoodHabits.map((habit) => (
                <div key={habit.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: 'var(--space-3) var(--space-4)',
                  backgroundColor: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  transition: 'all var(--transition-fast)',
                }}>
                  <span style={{ fontWeight: 500, fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>{habit.name}</span>
                  {habit.type === 'boolean' ? (
                    <label className="toggle-wrapper" style={{ margin: 0, gap: 0 }}>
                      <div className="toggle">
                        <input
                          type="checkbox"
                          checked={Boolean(habitValues[habit.id]?.value_bool)}
                          onChange={() => handleHabitBoolToggle(habit.id)}
                        />
                        <div className="toggle-track" />
                        <div className="toggle-thumb" />
                      </div>
                    </label>
                  ) : (
                    <div className="counter-control">
                      <button type="button" className="counter-btn" onClick={() => handleHabitCountChange(habit.id, -1)}>−</button>
                      <span className="counter-value">{habitValues[habit.id]?.value_count || 0}</span>
                      <button type="button" className="counter-btn" onClick={() => handleHabitCountChange(habit.id, 1)}>+</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. Personal Tracking */}
        {enabledTracking.length > 0 && (
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-warning-muted)', color: 'var(--color-warning)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Flame size={18} strokeWidth={2} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 'var(--font-size-md)' }}>Personal Tracking</h3>
                <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Non-judgmental tracking</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {enabledTracking.map((habit) => (
                <div key={habit.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: 'var(--space-3) var(--space-4)',
                  backgroundColor: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}>
                  <span style={{ fontWeight: 500, fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>{habit.name}</span>
                  {habit.type === 'boolean' ? (
                    <label className="toggle-wrapper" style={{ margin: 0, gap: 0 }}>
                      <div className="toggle">
                        <input
                          type="checkbox"
                          checked={Boolean(habitValues[habit.id]?.value_bool)}
                          onChange={() => handleHabitBoolToggle(habit.id)}
                        />
                        <div className="toggle-track" />
                        <div className="toggle-thumb" />
                      </div>
                    </label>
                  ) : (
                    <div className="counter-control">
                      <button type="button" className="counter-btn" onClick={() => handleHabitCountChange(habit.id, -1)}>−</button>
                      <span className="counter-value">{habitValues[habit.id]?.value_count || 0}</span>
                      <button type="button" className="counter-btn" onClick={() => handleHabitCountChange(habit.id, 1)}>+</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. Optional Notes */}
        <div className="card">
          <div
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
            onClick={() => setShowOptional(!showOptional)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--mod-goals-muted)', color: 'var(--mod-goals)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Award size={18} strokeWidth={2} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 'var(--font-size-md)' }}>Reflection & Notes</h3>
                <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Optional — wins, thoughts, notes</p>
              </div>
            </div>
            <div style={{
              width: '28px', height: '28px', borderRadius: 'var(--radius-sm)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--bg-hover)', color: 'var(--text-muted)',
              transition: 'transform var(--transition-fast)',
              transform: showOptional ? 'rotate(180deg)' : 'rotate(0deg)',
            }}>
              <ChevronRight size={14} style={{ transform: 'rotate(90deg)' }} />
            </div>
          </div>

          {showOptional && (
            <div style={{ marginTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--space-4)' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Daily Win / Key Achievement</label>
                <input
                  type="text"
                  className="input"
                  placeholder="What went well today?"
                  value={achievementText}
                  onChange={(e) => { setAchievementText(e.target.value); saveDraftLocally({ achievementText: e.target.value }); }}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Notes & Thoughts</label>
                <textarea
                  className="textarea"
                  rows={3}
                  placeholder="Any reflections, highlights or thoughts..."
                  value={notes}
                  onChange={(e) => { setNotes(e.target.value); saveDraftLocally({ notes: e.target.value }); }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Submit */}
        <div style={{ paddingTop: 'var(--space-2)' }}>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', minHeight: '48px', fontSize: 'var(--font-size-md)', fontWeight: 700 }}
            disabled={submitting}
          >
            {submitting ? 'Saving...' : (isExistingRecord ? 'Update Check-in ↑' : 'Submit Check-in ✓')}
          </button>
        </div>

      </form>
    </div>
  );
}
