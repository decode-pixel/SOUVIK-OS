import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, Target, CheckCircle2, TrendingUp } from 'lucide-react';

export default function Goals() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState([]);
  const [isModuleEnabled, setIsModuleEnabled] = useState(true);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalTimeframe, setNewGoalTimeframe] = useState('Yearly');
  const [newGoalDesc, setNewGoalDesc] = useState('');
  const [savingGoal, setSavingGoal] = useState(false);

  // Edit Progress State
  const [editingProgressId, setEditingProgressId] = useState(null);
  const [editingProgressVal, setEditingProgressVal] = useState(0);


  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const { data: settingsData } = await supabase
        .from('settings')
        .select('module_toggles')
        .eq('user_id', user.id)
        .maybeSingle();

      if (settingsData?.module_toggles?.goals === false) {
        setIsModuleEnabled(false);
        return;
      }
      setIsModuleEnabled(true);

      const { data: goalData, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGoals(goalData || []);

    } catch (err) {
      console.error('Error loading goals:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  async function enableGoalsModule() {
    try {
      const { data: settingsData } = await supabase
        .from('settings')
        .select('module_toggles')
        .eq('user_id', user.id)
        .maybeSingle();

      const newToggles = { ...(settingsData?.module_toggles || {}), goals: true };
      await supabase.from('settings').upsert({ user_id: user.id, module_toggles: newToggles }, { onConflict: 'user_id' });
      setIsModuleEnabled(true);
      loadData();
    } catch (err) {
      console.error('Error enabling module:', err);
    }
  }

  async function handleAddGoal(e) {
    e.preventDefault();
    if (!newGoalTitle.trim()) return;

    try {
      setSavingGoal(true);
      const payload = {
        user_id: user.id,
        title: newGoalTitle.trim(),
        timeframe: newGoalTimeframe,
        description: newGoalDesc.trim() || null,
        status: 'active',
        progress_pct: 0
      };

      const { data, error } = await supabase
        .from('goals')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      setGoals([data, ...goals]);
      setShowAddModal(false);
      setNewGoalTitle('');
      setNewGoalDesc('');
      setNewGoalTimeframe('Yearly');
    } catch (err) {
      alert('Failed to save goal: ' + err.message);
    } finally {
      setSavingGoal(false);
    }
  }

  async function updateGoalProgress(id, newPct) {
    try {
      const pct = Math.max(0, Math.min(100, parseInt(newPct) || 0));
      const newStatus = pct === 100 ? 'completed' : 'active';

      setGoals(goals.map(g => g.id === id ? { ...g, progress_pct: pct, status: newStatus } : g));
      setEditingProgressId(null);
      
      await supabase
        .from('goals')
        .update({ progress_pct: pct, status: newStatus })
        .eq('id', id);
    } catch (err) {
      console.error('Error updating progress:', err);
    }
  }

  async function toggleGoalStatus(id, currentStatus, currentPct) {
    try {
      const isCompleting = currentStatus !== 'completed';
      const nextStatus = isCompleting ? 'completed' : 'active';
      const nextPct = isCompleting ? 100 : currentPct; // Only force to 100% if marking complete

      setGoals(goals.map(g => g.id === id ? { ...g, status: nextStatus, progress_pct: nextPct } : g));
      
      await supabase
        .from('goals')
        .update({ status: nextStatus, progress_pct: nextPct })
        .eq('id', id);
    } catch (err) {
      console.error('Error toggling status:', err);
    }
  }

  async function deleteGoal(id) {
    if (!window.confirm('Delete this goal?')) return;
    try {
      await supabase.from('goals').delete().eq('id', id);
      setGoals(goals.filter(g => g.id !== id));
    } catch (err) {
      alert('Failed to delete goal: ' + err.message);
    }
  }

  if (!isModuleEnabled) {
    return (
      <div className="card" style={{ maxWidth: '600px', margin: 'var(--space-8) auto', textAlign: 'center' }}>
        <h2>Goals Module is Hidden</h2>
        <p>You have turned off the Goals module in your Settings.</p>
        <button className="btn btn-primary" onClick={enableGoalsModule}>
          Enable Goals Module
        </button>
      </div>
    );
  }

  if (loading) {
    return <div style={{ padding: 'var(--space-6)' }}>Loading Goals...</div>;
  }

  const timeframes = ['Q1', 'Q2', 'Q3', 'Q4', 'Yearly', 'Long-term'];
  
  // Group goals by timeframe
  const groupedGoals = {};
  timeframes.forEach(tf => groupedGoals[tf] = []);
  
  goals.forEach(g => {
    if (groupedGoals[g.timeframe]) {
      groupedGoals[g.timeframe].push(g);
    }
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', maxWidth: '900px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--mod-goals-muted)', color: 'var(--mod-goals)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Target size={24} />
          </div>
          <div>
            <h1 style={{ margin: 0 }}>Goals</h1>
            <p className="text-muted text-sm" style={{ margin: 0 }}>High-level vision tracking and milestone setting.</p>
          </div>
        </div>
        <button className="btn btn-primary" style={{ minHeight: '38px', fontSize: '0.875rem', gap: '4px' }} onClick={() => setShowAddModal(true)}>
          <Plus size={16} /> New Goal
        </button>
      </div>

      {/* Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
        <div className="card" style={{ borderTop: '4px solid var(--mod-goals)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Active Goals</span>
            <Target size={18} color="var(--mod-goals)" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {goals.filter(g => g.status === 'active').length}
          </div>
        </div>

        <div className="card" style={{ borderTop: '4px solid var(--color-success)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Completed</span>
            <CheckCircle2 size={18} color="var(--color-success)" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-success)' }}>
            {goals.filter(g => g.status === 'completed').length}
          </div>
        </div>
      </div>

      {/* Goal Lists by Timeframe */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        {timeframes.map(tf => {
          const tfGoals = groupedGoals[tf];
          if (tfGoals.length === 0) return null;

          return (
            <div key={tf} className="card" style={{ padding: '0', overflow: 'hidden' }}>
              <div style={{ padding: 'var(--space-4)', backgroundColor: 'var(--bg-surface-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
                <h3 style={{ margin: 0, fontSize: '1.125rem', color: 'var(--text-primary)' }}>{tf} Goals</h3>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {tfGoals.map((goal, idx) => (
                  <div key={goal.id} style={{ 
                    padding: 'var(--space-5)', 
                    borderBottom: idx === tfGoals.length - 1 ? 'none' : '1px solid var(--border-subtle)',
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: 'var(--space-4)',
                    opacity: goal.status === 'completed' ? 0.6 : 1,
                    transition: 'all var(--transition-fast)'
                  }}>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: '4px' }}>
                          <h4 style={{ margin: 0, fontSize: '1.125rem', textDecoration: goal.status === 'completed' ? 'line-through' : 'none' }}>
                            {goal.title}
                          </h4>
                          {goal.status === 'completed' && <span className="badge badge-success">Completed</span>}
                        </div>
                        {goal.description && (
                          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                            {goal.description}
                          </p>
                        )}
                      </div>
                      
                      <div style={{ display: 'flex', gap: 'var(--space-2)', marginLeft: 'var(--space-4)' }}>
                        <button 
                          className="btn-icon" 
                          style={{ color: goal.status === 'completed' ? 'var(--color-success)' : 'var(--text-secondary)' }}
                          onClick={() => toggleGoalStatus(goal.id, goal.status, goal.progress_pct)}
                          title={goal.status === 'completed' ? 'Mark Active' : 'Mark Completed'}
                        >
                          <CheckCircle2 size={18} />
                        </button>
                        <button 
                          className="btn-icon" 
                          style={{ color: 'var(--color-error)' }}
                          onClick={() => deleteGoal(goal.id)}
                          title="Delete Goal"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar Area */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                      <div className="progress-track">
                        <div 
                          className="progress-fill"
                          style={{ 
                            width: `${goal.progress_pct}%`, 
                            backgroundColor: goal.progress_pct === 100 ? 'var(--color-success)' : 'var(--mod-goals)',
                          }} 
                        />
                      </div>
                      
                      {editingProgressId === goal.id ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <input 
                            type="number" 
                            className="input" 
                            style={{ width: '60px', padding: '4px 8px', minHeight: '30px' }} 
                            min="0" max="100" 
                            value={editingProgressVal} 
                            onChange={(e) => setEditingProgressVal(e.target.value)}
                            onBlur={() => updateGoalProgress(goal.id, editingProgressVal)}
                            onKeyDown={(e) => { if (e.key === 'Enter') updateGoalProgress(goal.id, editingProgressVal) }}
                            autoFocus
                          />
                          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>%</span>
                        </div>
                      ) : (
                        <div 
                          style={{ fontSize: '0.875rem', fontWeight: 600, minWidth: '40px', textAlign: 'right', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => { setEditingProgressId(goal.id); setEditingProgressVal(goal.progress_pct); }}
                          title="Click to edit progress"
                        >
                          {goal.progress_pct}% <TrendingUp size={12} color="var(--text-secondary)" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        
        {goals.length === 0 && (
          <div style={{ gridColumn: '1 / -1', padding: 'var(--space-8)', textAlign: 'center', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)' }}>
            <Target size={48} color="var(--text-muted)" style={{ marginBottom: 'var(--space-4)' }} />
            <h3 style={{ margin: 0, marginBottom: 'var(--space-2)' }}>No Goals Set</h3>
            <p className="text-muted" style={{ margin: 0 }}>Define your vision and milestones. Click "New Goal".</p>
          </div>
        )}
      </div>

      {/* Add Goal Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>New Goal</h3>
              <button className="btn-icon" onClick={() => setShowAddModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleAddGoal} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Goal Title</label>
                  <input type="text" className="input" placeholder="e.g. Save 10k, Run a marathon" value={newGoalTitle} onChange={e => setNewGoalTitle(e.target.value)} required />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label>Timeframe</label>
                  <select className="select" value={newGoalTimeframe} onChange={e => setNewGoalTimeframe(e.target.value)}>
                    {timeframes.map(tf => (
                      <option key={tf} value={tf}>{tf}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label>Description (Optional)</label>
                  <textarea className="textarea" rows={3} placeholder="Why is this important? How will you achieve it?" value={newGoalDesc} onChange={e => setNewGoalDesc(e.target.value)} />
                </div>

                <div className="modal-footer" style={{ margin: '0 -var(--space-6)', marginBottom: '-var(--space-6)', marginTop: 'var(--space-4)' }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={savingGoal}>
                    {savingGoal ? 'Saving...' : 'Create Goal'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
