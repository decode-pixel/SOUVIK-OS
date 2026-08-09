import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { CheckCircle2, ChevronLeft, ChevronRight, Sparkles, Moon, Activity, Flame, Wine, FileText, Award, Calendar } from 'lucide-react';

const DEFAULT_HABITS = [
  { name: 'Reading / Learning (30m)', type: 'boolean', category: 'good_habit', sort_order: 1 },
  { name: 'Meditation / Mindfulness', type: 'boolean', category: 'good_habit', sort_order: 2 },
  { name: 'Deep Work Session', type: 'count', category: 'good_habit', sort_order: 3 },
  { name: 'Cigarettes Count', type: 'count', category: 'personal_tracking', sort_order: 4 },
  { name: 'Alcohol (Drinks)', type: 'count', category: 'personal_tracking', sort_order: 5 }
];

export default function Checkin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const todayStr = new Date().toISOString().split('T')[0];
  const selectedDate = searchParams.get('date') || todayStr;
  const isToday = selectedDate === todayStr;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [habits, setHabits] = useState([]);
  
  // Core state
  const [sleepHours, setSleepHours] = useState(7);
  const [exercise, setExercise] = useState(false);
  const [habitValues, setHabitValues] = useState({}); // { [habit_id]: { bool: true/false, count: 0 } }
  const [achievementText, setAchievementText] = useState('');
  const [notes, setNotes] = useState('');
  const [isExistingRecord, setIsExistingRecord] = useState(false);
  const [showOptional, setShowOptional] = useState(false);

  useEffect(() => {
    if (user) {
      loadCheckinData(selectedDate);
    }
  }, [user, selectedDate]);

  // Load habits and existing check-in data
  async function loadCheckinData(date) {
    try {
      setLoading(true);
      setSubmittedSuccess(false);

      // 1. Fetch habits (enabled or all if viewing past record)
      let { data: userHabits, error: habitsError } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', user.id)
        .order('sort_order', { ascending: true });

      if (habitsError) throw habitsError;

      // If user has no habits yet, seed default habits
      if (!userHabits || userHabits.length === 0) {
        const toInsert = DEFAULT_HABITS.map(h => ({
          ...h,
          user_id: user.id,
          enabled: true
        }));
        const { data: inserted, error: insertErr } = await supabase
          .from('habits')
          .insert(toInsert)
          .select();
        if (!insertErr && inserted) {
          userHabits = inserted;
        }
      }

      setHabits(userHabits || []);

      // 2. Fetch existing daily checkin for this date
      const { data: existingCheckin, error: checkinErr } = await supabase
        .from('daily_checkins')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', date)
        .maybeSingle();

      if (checkinErr) throw checkinErr;

      // 3. Fetch existing habit logs for this date
      const { data: existingHabitLogs, error: logsErr } = await supabase
        .from('habit_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', date);

      if (logsErr) throw logsErr;

      const initialHabitValues = {};
      (userHabits || []).forEach(h => {
        const foundLog = (existingHabitLogs || []).find(l => l.habit_id === h.id);
        initialHabitValues[h.id] = {
          value_bool: foundLog ? foundLog.value_bool : false,
          value_count: foundLog ? (foundLog.value_count ?? 0) : 0
        };
      });

      if (existingCheckin) {
        setIsExistingRecord(true);
        setSleepHours(Number(existingCheckin.sleep_hours) || 7);
        setExercise(Boolean(existingCheckin.exercise));
        setAchievementText(existingCheckin.achievement_text || '');
        setNotes(existingCheckin.notes || '');
        setHabitValues(initialHabitValues);
        if (existingCheckin.achievement_text || existingCheckin.notes) {
          setShowOptional(true);
        }
      } else {
        setIsExistingRecord(false);
        // Check if there is a local draft for today
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
          } catch (e) {
            setHabitValues(initialHabitValues);
          }
        } else {
          setSleepHours(7);
          setExercise(false);
          setAchievementText('');
          setNotes('');
          setHabitValues(initialHabitValues);
        }
      }
    } catch (err) {
      console.error('Error loading check-in data:', err);
    } finally {
      setLoading(false);
    }
  }

  // Save draft locally on changes if it's today and not already submitted
  const saveDraftLocally = (updatedFields) => {
    if (!isToday || isExistingRecord) return;
    const currentData = {
      sleepHours,
      exercise,
      habitValues,
      achievementText,
      notes,
      ...updatedFields
    };
    localStorage.setItem(`souvik_checkin_draft_${selectedDate}`, JSON.stringify(currentData));
  };

  const handleSleepSelect = (hours) => {
    setSleepHours(hours);
    saveDraftLocally({ sleepHours: hours });
  };

  const handleExerciseToggle = (val) => {
    setExercise(val);
    saveDraftLocally({ exercise: val });
  };

  const handleHabitBoolToggle = (habitId) => {
    const current = habitValues[habitId]?.value_bool || false;
    const updated = {
      ...habitValues,
      [habitId]: {
        ...habitValues[habitId],
        value_bool: !current
      }
    };
    setHabitValues(updated);
    saveDraftLocally({ habitValues: updated });
  };

  const handleHabitCountChange = (habitId, delta) => {
    const current = habitValues[habitId]?.value_count || 0;
    const nextVal = Math.max(0, current + delta);
    const updated = {
      ...habitValues,
      [habitId]: {
        ...habitValues[habitId],
        value_count: nextVal
      }
    };
    setHabitValues(updated);
    saveDraftLocally({ habitValues: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    try {
      setSubmitting(true);

      // 1. Upsert daily_checkins
      const checkinPayload = {
        user_id: user.id,
        date: selectedDate,
        sleep_hours: sleepHours,
        exercise: exercise,
        achievement_text: achievementText.trim() || null,
        notes: notes.trim() || null,
        completed_at: new Date().toISOString()
      };

      const { error: checkinError } = await supabase
        .from('daily_checkins')
        .upsert(checkinPayload, { onConflict: 'user_id,date' });

      if (checkinError) throw checkinError;

      // 2. Upsert habit_logs for enabled habits
      const enabledHabits = habits.filter(h => h.enabled);
      const habitLogPayloads = enabledHabits.map(h => ({
        user_id: user.id,
        habit_id: h.id,
        date: selectedDate,
        value_bool: h.type === 'boolean' ? Boolean(habitValues[h.id]?.value_bool) : null,
        value_count: h.type === 'count' ? Number(habitValues[h.id]?.value_count || 0) : null
      }));

      if (habitLogPayloads.length > 0) {
        const { error: logsError } = await supabase
          .from('habit_logs')
          .upsert(habitLogPayloads, { onConflict: 'user_id,habit_id,date' });

        if (logsError) throw logsError;
      }

      // Clear local draft
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
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    const newDateStr = d.toISOString().split('T')[0];
    // prevent going into future
    if (newDateStr > todayStr) return;
    setSearchParams({ date: newDateStr });
  };

  const enabledGoodHabits = habits.filter(h => h.enabled && h.category === 'good_habit');
  const enabledTracking = habits.filter(h => h.enabled && h.category === 'personal_tracking');

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <p>Loading check-in engine...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }}>
      {/* Header & Date navigator */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ marginBottom: 'var(--space-1)' }}>Daily Check-in</h1>
          <p style={{ margin: 0, fontSize: '0.875rem' }}>
            {isToday ? "Log today's pulse in under 60 seconds." : `Viewing historical log for ${selectedDate}`}
          </p>
        </div>

        {/* Date Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <button 
            type="button" 
            className="btn btn-secondary btn-icon" 
            onClick={() => shiftDate(-1)}
            title="Previous Day"
          >
            <ChevronLeft size={20} />
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', fontWeight: 600, padding: '0 var(--space-2)' }}>
            <Calendar size={16} color="var(--text-secondary)" />
            {isToday ? 'Today' : selectedDate}
          </div>

          <button 
            type="button" 
            className="btn btn-secondary btn-icon" 
            onClick={() => shiftDate(1)} 
            disabled={isToday}
            title="Next Day"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Success banner */}
      {submittedSuccess && (
        <div className="card" style={{ backgroundColor: 'var(--color-success)', borderColor: 'var(--color-success)', color: '#fff', marginBottom: 'var(--space-5)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <CheckCircle2 size={24} color="#fff" />
          <div style={{ flex: 1 }}>
            <strong style={{ display: 'block' }}>Day Updated ✓</strong>
            <span style={{ fontSize: '0.875rem', opacity: 0.9 }}>Your check-in is saved and Home snapshot has updated.</span>
          </div>
          <button className="btn btn-secondary" style={{ padding: '0 var(--space-3)', minHeight: '36px', fontSize: '0.875rem', backgroundColor: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff' }} onClick={() => navigate('/')}>
            Back to Home
          </button>
        </div>
      )}

      {/* Status indicator for existing record */}
      {!submittedSuccess && isExistingRecord && (
        <div style={{ marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="badge badge-success">
            <CheckCircle2 size={14} /> Completed
          </span>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            You can modify values and re-submit anytime today.
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
        
        {/* 1. Sleep Hours */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
            <Moon size={20} color="var(--accent-primary)" />
            <h3 style={{ margin: 0 }}>Sleep Hours</h3>
          </div>
          <p style={{ fontSize: '0.875rem', marginBottom: 'var(--space-3)' }}>How many hours did you sleep last night?</p>
          
          <div className="chip-group">
            {[5, 6, 7, 8, 9].map((hrs) => (
              <button
                key={hrs}
                type="button"
                className={`chip ${sleepHours === hrs ? 'active' : ''}`}
                onClick={() => handleSleepSelect(hrs)}
              >
                {hrs === 9 ? '9+ hrs' : `${hrs} hrs`}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Exercise */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
            <Activity size={20} color="var(--accent-primary)" />
            <h3 style={{ margin: 0 }}>Exercise & Movement</h3>
          </div>
          <p style={{ fontSize: '0.875rem', marginBottom: 'var(--space-3)' }}>Did you work out or do physical activity today?</p>
          
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
              No exercise
            </button>
          </div>
        </div>

        {/* 3. Daily Habits */}
        {enabledGoodHabits.length > 0 && (
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
              <Sparkles size={20} color="var(--accent-primary)" />
              <h3 style={{ margin: 0 }}>Good Habits</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {enabledGoodHabits.map((habit) => (
                <div 
                  key={habit.id} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    padding: 'var(--space-3)', 
                    backgroundColor: 'var(--bg-secondary)', 
                    borderRadius: 'var(--radius-sm)' 
                  }}
                >
                  <span style={{ fontWeight: 500 }}>{habit.name}</span>
                  
                  {habit.type === 'boolean' ? (
                    <button
                      type="button"
                      className={`chip ${habitValues[habit.id]?.value_bool ? 'active' : ''}`}
                      style={{ minHeight: '38px', padding: '0 var(--space-4)' }}
                      onClick={() => handleHabitBoolToggle(habit.id)}
                    >
                      {habitValues[habit.id]?.value_bool ? '✓ Completed' : 'Pending'}
                    </button>
                  ) : (
                    <div className="counter-control">
                      <button
                        type="button"
                        className="counter-btn"
                        onClick={() => handleHabitCountChange(habit.id, -1)}
                      >
                        -
                      </button>
                      <span className="counter-value">{habitValues[habit.id]?.value_count || 0}</span>
                      <button
                        type="button"
                        className="counter-btn"
                        onClick={() => handleHabitCountChange(habit.id, 1)}
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. Personal Tracking (Cigarettes / Alcohol etc) */}
        {enabledTracking.length > 0 && (
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
              <Flame size={20} color="var(--color-warning)" />
              <h3 style={{ margin: 0 }}>Personal Tracking</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {enabledTracking.map((habit) => (
                <div 
                  key={habit.id} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    padding: 'var(--space-3)', 
                    backgroundColor: 'var(--bg-secondary)', 
                    borderRadius: 'var(--radius-sm)' 
                  }}
                >
                  <span style={{ fontWeight: 500 }}>{habit.name}</span>
                  
                  {habit.type === 'boolean' ? (
                    <button
                      type="button"
                      className={`chip ${habitValues[habit.id]?.value_bool ? 'active' : ''}`}
                      style={{ minHeight: '38px', padding: '0 var(--space-4)' }}
                      onClick={() => handleHabitBoolToggle(habit.id)}
                    >
                      {habitValues[habit.id]?.value_bool ? 'Yes' : 'None'}
                    </button>
                  ) : (
                    <div className="counter-control">
                      <button
                        type="button"
                        className="counter-btn"
                        onClick={() => handleHabitCountChange(habit.id, -1)}
                      >
                        -
                      </button>
                      <span className="counter-value">{habitValues[habit.id]?.value_count || 0}</span>
                      <button
                        type="button"
                        className="counter-btn"
                        onClick={() => handleHabitCountChange(habit.id, 1)}
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. Optional Notes & Achievements */}
        <div className="card">
          <div 
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
            onClick={() => setShowOptional(!showOptional)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Award size={20} color="var(--accent-primary)" />
              <h3 style={{ margin: 0 }}>Reflection & Notes (Optional)</h3>
            </div>
            <button type="button" className="btn btn-secondary" style={{ minHeight: '36px', fontSize: '0.8125rem' }}>
              {showOptional ? 'Collapse' : 'Expand'}
            </button>
          </div>

          {showOptional && (
            <div style={{ marginTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="form-group">
                <label>Daily Win / Key Achievement</label>
                <input 
                  type="text" 
                  className="input" 
                  placeholder="What went well today?"
                  value={achievementText} 
                  onChange={(e) => {
                    setAchievementText(e.target.value);
                    saveDraftLocally({ achievementText: e.target.value });
                  }} 
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label>Daily Notes & Thoughts</label>
                <textarea 
                  className="textarea" 
                  rows={3} 
                  placeholder="Any quick thoughts, reflections, or highlights..."
                  value={notes} 
                  onChange={(e) => {
                    setNotes(e.target.value);
                    saveDraftLocally({ notes: e.target.value });
                  }} 
                />
              </div>
            </div>
          )}
        </div>

        {/* Submit CTA */}
        <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ flex: 1, minHeight: '48px', fontSize: '1rem', fontWeight: 600 }}
            disabled={submitting}
          >
            {submitting ? 'Saving...' : (isExistingRecord ? 'Update Today\'s Check-in' : 'Submit Check-in ✓')}
          </button>
        </div>

      </form>
    </div>
  );
}
