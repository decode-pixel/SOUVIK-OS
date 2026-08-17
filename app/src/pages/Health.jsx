import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { today, addDays } from '../lib/date';
import { Moon, Activity, Scale, Sparkles, Plus, Calendar, CheckCircle2 } from 'lucide-react';

export default function Health() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState(7); // 7 or 30 days
  const [loading, setLoading] = useState(true);
  const [checkins, setCheckins] = useState([]);
  const [habits, setHabits] = useState([]);
  const [habitLogs, setHabitLogs] = useState([]);
  const [weightLogs, setWeightLogs] = useState([]);
  
  // Weight logging state
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [weightDate, setWeightDate] = useState(today());
  const [weightSaving, setWeightSaving] = useState(false);

  // Settings module toggle check
  const [isModuleEnabled, setIsModuleEnabled] = useState(true);

  const loadHealthData = useCallback(async () => {
    try {
      setLoading(true);

      // Check settings toggle
      const { data: settingsData } = await supabase
        .from('settings')
        .select('module_toggles')
        .eq('user_id', user.id)
        .maybeSingle();

      if (settingsData?.module_toggles?.health === false) {
        setIsModuleEnabled(false);
      } else {
        setIsModuleEnabled(true);
      }

      // Calculate start date based on range
      const startDateStr = addDays(today(), -(timeRange - 1));

      // 1. Fetch check-ins
      const { data: checkinData, error: checkinErr } = await supabase
        .from('daily_checkins')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDateStr)
        .order('date', { ascending: true });

      if (checkinErr) throw checkinErr;
      setCheckins(checkinData || []);

      // 2. Fetch habits
      const { data: habitsData } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', user.id)
        .eq('enabled', true);

      setHabits(habitsData || []);

      // 3. Fetch habit logs
      const { data: logsData } = await supabase
        .from('habit_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDateStr);

      setHabitLogs(logsData || []);

      // 4. Fetch weight logs (last 60 days)
      const weightStartDateStr = addDays(today(), -60);
      const { data: weights } = await supabase
        .from('weight_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', weightStartDateStr)
        .order('date', { ascending: true });

      setWeightLogs(weights || []);

    } catch (err) {
      console.error('Error loading health data:', err);
    } finally {
      setLoading(false);
    }
  }, [user, timeRange]);

  useEffect(() => {
    if (user) {
      loadHealthData();
    }
  }, [user, loadHealthData]);

  async function handleAddWeight(e) {
    e.preventDefault();
    if (!newWeight || isNaN(newWeight)) return;

    try {
      setWeightSaving(true);
      const payload = {
        user_id: user.id,
        date: weightDate,
        weight_kg: Number(newWeight)
      };

      const { data, error } = await supabase
        .from('weight_logs')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      setWeightLogs([...weightLogs, data].sort((a, b) => new Date(a.date) - new Date(b.date)));
      setNewWeight('');
      setShowWeightModal(false);
    } catch (err) {
      alert('Error saving weight: ' + err.message);
    } finally {
      setWeightSaving(false);
    }
  }

  async function enableHealthModule() {
    try {
      const { data: settingsData } = await supabase
        .from('settings')
        .select('module_toggles')
        .eq('user_id', user.id)
        .maybeSingle();

      const newToggles = { ...(settingsData?.module_toggles || {}), health: true };
      await supabase
        .from('settings')
        .upsert({ user_id: user.id, module_toggles: newToggles }, { onConflict: 'user_id' });

      setIsModuleEnabled(true);
    } catch (err) {
      console.error('Error enabling module:', err);
    }
  }

  // Derived statistics
  const totalDays = timeRange;
  const loggedDays = checkins.length;
  
  // Sleep statistics
  const avgSleep = loggedDays > 0 
    ? (checkins.reduce((acc, c) => acc + Number(c.sleep_hours || 0), 0) / loggedDays).toFixed(1)
    : 0;

  // Exercise statistics
  const exerciseDays = checkins.filter(c => c.exercise).length;
  const exerciseStreakPct = loggedDays > 0 ? Math.round((exerciseDays / loggedDays) * 100) : 0;

  // Latest weight
  const latestWeightLog = weightLogs.length > 0 ? weightLogs[weightLogs.length - 1] : null;
  const previousWeightLog = weightLogs.length > 1 ? weightLogs[weightLogs.length - 2] : null;
  const weightDiff = latestWeightLog && previousWeightLog 
    ? (Number(latestWeightLog.weight_kg) - Number(previousWeightLog.weight_kg)).toFixed(1)
    : null;

  // Generate date array for charts
  const dateList = [];
  for (let i = timeRange - 1; i >= 0; i--) {
    dateList.push(addDays(today(), -i));
  }

  if (!isModuleEnabled) {
    return (
      <div className="card" style={{ maxWidth: '600px', margin: 'var(--space-8) auto', textAlign: 'center' }}>
        <h2>Health Module is Hidden</h2>
        <p>You have turned off the Health module in your Settings.</p>
        <button className="btn btn-primary" onClick={enableHealthModule}>
          Enable Health Module
        </button>
      </div>
    );
  }

  if (loading) {
    return <div style={{ padding: 'var(--space-6)' }}>Loading Health trends...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', maxWidth: '900px', margin: '0 auto' }}>
      
      {/* Header & Range Selector */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h1 style={{ marginBottom: 'var(--space-1)' }}>Health & Vitality</h1>
          <p style={{ margin: 0, fontSize: '0.875rem' }}>Read-only analysis derived from your daily check-ins.</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <div className="chip-group" style={{ backgroundColor: 'var(--bg-secondary)', padding: '4px', borderRadius: 'var(--radius-full)' }}>
            <button 
              className={`chip ${timeRange === 7 ? 'active' : ''}`}
              style={{ minHeight: '34px', padding: '0 var(--space-3)', fontSize: '0.8125rem', border: 'none' }}
              onClick={() => setTimeRange(7)}
            >
              7 Days
            </button>
            <button 
              className={`chip ${timeRange === 30 ? 'active' : ''}`}
              style={{ minHeight: '34px', padding: '0 var(--space-3)', fontSize: '0.8125rem', border: 'none' }}
              onClick={() => setTimeRange(30)}
            >
              30 Days
            </button>
          </div>

          <button 
            className="btn btn-secondary" 
            style={{ minHeight: '38px', fontSize: '0.875rem', gap: '4px' }}
            onClick={() => setShowWeightModal(true)}
          >
            <Plus size={16} /> Log Weight
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
        
        {/* Sleep Card */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Avg Sleep</span>
            <Moon size={18} color="var(--accent-primary)" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>
            {avgSleep > 0 ? `${avgSleep} hrs` : '—'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {loggedDays} of {totalDays} days logged
          </div>
        </div>

        {/* Exercise Card */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Workout Consistency</span>
            <Activity size={18} color="var(--success)" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>
            {exerciseStreakPct}%
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {exerciseDays} active workouts
          </div>
        </div>

        {/* Weight Card */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Latest Weight</span>
            <Scale size={18} color="var(--warning)" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>
            {latestWeightLog ? `${latestWeightLog.weight_kg} kg` : '—'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {weightDiff !== null ? `${weightDiff > 0 ? `+${weightDiff}` : weightDiff} kg vs last log` : (latestWeightLog ? `Logged on ${latestWeightLog.date}` : 'No logs recorded')}
          </div>
        </div>

      </div>

      {/* 1. Sleep Trend Chart */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <div>
            <h3 style={{ margin: 0 }}>Sleep Duration Trend</h3>
            <p style={{ margin: 0, fontSize: '0.8125rem' }}>Daily recorded sleep hours ({timeRange}d range)</p>
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
            Goal: 7–8 hrs
          </div>
        </div>

        {/* Responsive Bar Chart */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: timeRange === 7 ? '12px' : '4px', height: '160px', padding: 'var(--space-3) 0', borderBottom: '1px solid var(--border-color)' }}>
          {dateList.map((dt) => {
            const checkin = checkins.find(c => c.date === dt);
            const hrs = checkin ? Number(checkin.sleep_hours) : 0;
            const maxScale = 10;
            const heightPct = hrs > 0 ? Math.min(100, (hrs / maxScale) * 100) : 4;
            const isTargetMet = hrs >= 7;

            return (
              <div key={dt} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: '6px' }}>
                {hrs > 0 && (
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: isTargetMet ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>
                    {hrs}h
                  </span>
                )}
                <div 
                  style={{ 
                    width: '100%', 
                    height: `${heightPct}%`, 
                    backgroundColor: hrs === 0 ? 'var(--bg-secondary)' : (isTargetMet ? 'var(--accent-primary)' : 'var(--warning)'),
                    borderRadius: '4px 4px 0 0',
                    transition: 'height 0.3s ease'
                  }} 
                  title={`${dt}: ${hrs > 0 ? `${hrs} hrs` : 'No log'}`}
                />
              </div>
            );
          })}
        </div>
        
        {/* Date labels */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>
          <span>{dateList[0]}</span>
          <span>{dateList[Math.floor(dateList.length / 2)]}</span>
          <span>{dateList[dateList.length - 1]}</span>
        </div>
      </div>

      {/* 2. Exercise Consistency Log */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <div>
            <h3 style={{ margin: 0 }}>Exercise & Workout Consistency</h3>
            <p style={{ margin: 0, fontSize: '0.8125rem' }}>Daily activity tracker status</p>
          </div>
          <span className="badge badge-success">
            {exerciseDays} Days Active
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(56px, 1fr))`, gap: 'var(--space-2)' }}>
          {dateList.map((dt) => {
            const checkin = checkins.find(c => c.date === dt);
            const isExercised = checkin?.exercise;
            const isLogged = Boolean(checkin);

            return (
              <div 
                key={dt} 
                style={{ 
                  padding: 'var(--space-2)', 
                  backgroundColor: isExercised ? 'var(--success-light)' : 'var(--bg-secondary)', 
                  border: `1px solid ${isExercised ? 'var(--success)' : 'var(--border-color)'}`,
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title={`${dt}: ${isExercised ? 'Active workout' : (isLogged ? 'Rest day' : 'Not logged')}`}
              >
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                  {dt.slice(5)}
                </span>
                {isExercised ? (
                  <CheckCircle2 size={18} color="var(--success)" />
                ) : (
                  <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '1px dashed var(--text-secondary)' }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Weight Log History */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
          <div>
            <h3 style={{ margin: 0 }}>Weight History</h3>
            <p style={{ margin: 0, fontSize: '0.8125rem' }}>Weekly weigh-in checkpoints</p>
          </div>
          <button className="btn btn-secondary" style={{ minHeight: '34px', fontSize: '0.8125rem' }} onClick={() => setShowWeightModal(true)}>
            + Log Checkpoint
          </button>
        </div>

        {weightLogs.length === 0 ? (
          <p style={{ fontSize: '0.875rem', fontStyle: 'italic', margin: 'var(--space-3) 0' }}>
            No weight checkpoints recorded. Use the button above to log your weekly weight.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {weightLogs.slice(-5).reverse().map((w) => (
              <div 
                key={w.id} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  padding: 'var(--space-3)', 
                  backgroundColor: 'var(--bg-secondary)', 
                  borderRadius: 'var(--radius-sm)' 
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <Calendar size={16} color="var(--text-secondary)" />
                  <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{w.date}</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                  {w.weight_kg} kg
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Habits Adherence Summary */}
      {habits.length > 0 && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
            <Sparkles size={20} color="var(--accent-primary)" />
            <h3 style={{ margin: 0 }}>Habits & Routines Adherence</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {habits.map((habit) => {
              const logsForHabit = habitLogs.filter(l => l.habit_id === habit.id);
              const completedCount = habit.type === 'boolean'
                ? logsForHabit.filter(l => l.value_bool).length
                : logsForHabit.filter(l => (l.value_count || 0) > 0).length;
              
              const adherencePct = loggedDays > 0 ? Math.round((completedCount / loggedDays) * 100) : 0;

              return (
                <div key={habit.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', fontWeight: 500 }}>
                    <span>{habit.name}</span>
                    <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{adherencePct}% ({completedCount}/{loggedDays}d)</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        width: `${adherencePct}%`, 
                        height: '100%', 
                        backgroundColor: adherencePct >= 70 ? 'var(--success)' : (adherencePct >= 40 ? 'var(--accent-primary)' : 'var(--warning)'),
                        borderRadius: '4px',
                        transition: 'width 0.3s ease'
                      }} 
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Weight Modal */}
      {showWeightModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 'var(--space-4)' }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
            <h2>Log Weight Checkpoint</h2>
            <form onSubmit={handleAddWeight}>
              <div className="form-group">
                <label>Date</label>
                <input 
                  type="date" 
                  className="input" 
                  value={weightDate} 
                  onChange={e => setWeightDate(e.target.value)} 
                  required 
                />
              </div>

              <div className="form-group">
                <label>Weight (kg)</label>
                <input 
                  type="number" 
                  step="0.1" 
                  className="input" 
                  placeholder="e.g. 72.5" 
                  value={newWeight} 
                  onChange={e => setNewWeight(e.target.value)} 
                  required 
                />
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={weightSaving}>
                  {weightSaving ? 'Saving...' : 'Save Checkpoint'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowWeightModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
