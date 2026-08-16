import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, FolderKanban, CheckCircle2, TrendingUp, Circle, PauseCircle } from 'lucide-react';

export default function Projects() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [isModuleEnabled, setIsModuleEnabled] = useState(true);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [newProjStatus, setNewProjStatus] = useState('active');
  const [savingProj, setSavingProj] = useState(false);

  // Edit Progress State
  const [editingProgressId, setEditingProgressId] = useState(null);
  const [editingProgressVal, setEditingProgressVal] = useState(0);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  async function loadData() {
    try {
      setLoading(true);

      const { data: settingsData } = await supabase
        .from('settings')
        .select('module_toggles')
        .eq('user_id', user.id)
        .maybeSingle();

      if (settingsData?.module_toggles?.projects === false) {
        setIsModuleEnabled(false);
        return;
      }
      setIsModuleEnabled(true);

      const { data: projData, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(projData || []);
    } catch (err) {
      console.error('Error loading projects:', err);
    } finally {
      setLoading(false);
    }
  }

  async function enableProjectsModule() {
    try {
      const { data: settingsData } = await supabase
        .from('settings')
        .select('module_toggles')
        .eq('user_id', user.id)
        .maybeSingle();

      const newToggles = { ...(settingsData?.module_toggles || {}), projects: true };
      await supabase
        .from('settings')
        .upsert({ user_id: user.id, module_toggles: newToggles }, { onConflict: 'user_id' });
      setIsModuleEnabled(true);
      loadData();
    } catch (err) {
      console.error('Error enabling module:', err);
    }
  }

  async function handleAddProject(e) {
    e.preventDefault();
    if (!newProjName.trim()) return;

    try {
      setSavingProj(true);
      const payload = {
        user_id: user.id,
        name: newProjName.trim(),
        description: newProjDesc.trim() || null,
        status: newProjStatus || 'active',
        progress_pct: 0
      };

      const { data, error } = await supabase
        .from('projects')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      setProjects([data, ...projects]);
      setShowAddModal(false);
      setNewProjName('');
      setNewProjDesc('');
      setNewProjStatus('active');
    } catch (err) {
      alert('Failed to save project: ' + err.message);
    } finally {
      setSavingProj(false);
    }
  }

  async function updateProjectProgress(id, newPct) {
    try {
      const pct = Math.max(0, Math.min(100, parseInt(newPct, 10) || 0));
      const currentProj = projects.find(p => p.id === id);
      const newStatus = pct === 100 ? 'completed' : (currentProj?.status === 'completed' ? 'active' : (currentProj?.status || 'active'));

      setProjects(projects.map(p => p.id === id ? { ...p, progress_pct: pct, status: newStatus } : p));
      setEditingProgressId(null);

      await supabase
        .from('projects')
        .update({ progress_pct: pct, status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);
    } catch (err) {
      console.error('Error updating progress:', err);
    }
  }

  async function cycleProjectStatus(id, currentStatus, currentPct) {
    try {
      // Cycle: active -> completed -> on-hold -> active
      let nextStatus = 'active';
      if (currentStatus === 'active') nextStatus = 'completed';
      else if (currentStatus === 'completed') nextStatus = 'on-hold';
      else nextStatus = 'active';

      const nextPct = nextStatus === 'completed' ? 100 : (currentPct ?? 0);

      setProjects(projects.map(p => p.id === id ? { ...p, status: nextStatus, progress_pct: nextPct } : p));

      await supabase
        .from('projects')
        .update({ status: nextStatus, progress_pct: nextPct, updated_at: new Date().toISOString() })
        .eq('id', id);
    } catch (err) {
      console.error('Error cycling status:', err);
    }
  }

  async function deleteProject(id) {
    if (!window.confirm('Delete this project?')) return;
    try {
      await supabase.from('projects').delete().eq('id', id);
      setProjects(projects.filter(p => p.id !== id));
    } catch (err) {
      alert('Failed to delete project: ' + err.message);
    }
  }

  if (!isModuleEnabled) {
    return (
      <div className="card" style={{ maxWidth: '600px', margin: 'var(--space-8) auto', textAlign: 'center' }}>
        <h2>Projects Module is Hidden</h2>
        <p style={{ color: 'var(--text-secondary)', margin: 'var(--space-3) 0 var(--space-6)' }}>
          You have turned off the Projects module in your Settings.
        </p>
        <button className="btn btn-primary" onClick={enableProjectsModule}>
          Enable Projects Module
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="skeleton" style={{ width: '200px', height: '40px', borderRadius: 'var(--radius-md)' }} />
          <div className="skeleton" style={{ width: '130px', height: '40px', borderRadius: 'var(--radius-md)' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton card" style={{ height: '90px' }} />
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-4)' }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton card" style={{ height: '180px' }} />
          ))}
        </div>
      </div>
    );
  }

  const activeCount = projects.filter(p => p.status === 'active').length;
  const completedCount = projects.filter(p => p.status === 'completed').length;
  const avgProgress = projects.length > 0
    ? Math.round(projects.reduce((acc, p) => acc + (p.progress_pct || 0), 0) / projects.length)
    : 0;

  function renderStatusBadge(proj) {
    let badgeClass = 'badge badge-info';
    let label = 'Active';
    let icon = <Circle size={10} />;

    if (proj.status === 'completed') {
      badgeClass = 'badge badge-success';
      label = 'Completed';
      icon = <CheckCircle2 size={10} />;
    } else if (proj.status === 'on-hold') {
      badgeClass = 'badge badge-warning';
      label = 'On Hold';
      icon = <PauseCircle size={10} />;
    }

    return (
      <button
        type="button"
        className={badgeClass}
        onClick={() => cycleProjectStatus(proj.id, proj.status, proj.progress_pct)}
        title="Click to cycle status (active → completed → on-hold)"
        style={{ cursor: 'pointer', border: 'none', font: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
      >
        {icon}
        <span>{label}</span>
      </button>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', maxWidth: '900px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--mod-projects-muted)', color: 'var(--mod-projects)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FolderKanban size={24} />
          </div>
          <div>
            <h1 style={{ margin: 0 }}>Projects</h1>
            <p className="text-muted text-sm" style={{ margin: 0 }}>Manage initiatives, milestones, and deliverables.</p>
          </div>
        </div>
        <button className="btn btn-primary" style={{ minHeight: '38px', fontSize: '0.875rem', gap: '4px' }} onClick={() => setShowAddModal(true)}>
          <Plus size={16} /> New Project
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
        <div className="card" style={{ borderTop: '4px solid var(--mod-projects)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
            <span className="label-caps" style={{ color: 'var(--text-secondary)' }}>Active Projects</span>
            <FolderKanban size={18} color="var(--mod-projects)" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {activeCount}
          </div>
        </div>

        <div className="card" style={{ borderTop: '4px solid var(--color-success)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
            <span className="label-caps" style={{ color: 'var(--text-secondary)' }}>Completed</span>
            <CheckCircle2 size={18} color="var(--color-success)" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-success)' }}>
            {completedCount}
          </div>
        </div>

        <div className="card" style={{ borderTop: '4px solid var(--accent-primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
            <span className="label-caps" style={{ color: 'var(--text-secondary)' }}>Avg Progress</span>
            <TrendingUp size={18} color="var(--accent-primary)" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
            {avgProgress}%
          </div>
        </div>
      </div>

      {/* Project List */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-4)' }}>
        {projects.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', padding: 'var(--space-8)', textAlign: 'center', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)' }}>
            <FolderKanban size={48} color="var(--text-muted)" style={{ marginBottom: 'var(--space-4)' }} />
            <h3 style={{ margin: 0, marginBottom: 'var(--space-2)' }}>No Projects Yet</h3>
            <p className="text-muted" style={{ margin: '0 0 var(--space-4)' }}>Create your first project to start tracking progress and milestones.</p>
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)} style={{ minHeight: '36px', fontSize: '0.875rem' }}>
              <Plus size={16} /> New Project
            </button>
          </div>
        ) : (
          projects.map(proj => {
            const isCompleted = proj.status === 'completed';
            const progress = proj.progress_pct || 0;

            return (
              <div 
                key={proj.id} 
                className="card card-interactive" 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: 'var(--space-4)',
                  opacity: isCompleted ? 0.75 : 1,
                  borderTop: `4px solid ${
                    proj.status === 'completed'
                      ? 'var(--color-success)'
                      : proj.status === 'on-hold'
                        ? 'var(--color-warning)'
                        : 'var(--mod-projects)'
                  }`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ 
                      margin: 0, 
                      fontSize: '1.125rem', 
                      color: 'var(--text-primary)',
                      textDecoration: isCompleted ? 'line-through' : 'none' 
                    }}>
                      {proj.name}
                    </h3>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                    <button 
                      className="btn-icon" 
                      style={{ color: 'var(--color-error)' }}
                      onClick={() => deleteProject(proj.id)}
                      title="Delete Project"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {proj.description && (
                  <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', flex: 1, whiteSpace: 'pre-wrap' }}>
                    {proj.description}
                  </p>
                )}

                {/* Progress Bar & Inline Edit */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginTop: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="label-caps" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Progress</span>
                    
                    {editingProgressId === proj.id ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <input 
                          type="number" 
                          className="input" 
                          style={{ width: '60px', padding: '2px 6px', minHeight: '26px', fontSize: '0.8125rem' }} 
                          min="0" 
                          max="100" 
                          value={editingProgressVal} 
                          onChange={(e) => setEditingProgressVal(e.target.value)}
                          onBlur={() => updateProjectProgress(proj.id, editingProgressVal)}
                          onKeyDown={(e) => { if (e.key === 'Enter') updateProjectProgress(proj.id, editingProgressVal); }}
                          autoFocus
                        />
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>%</span>
                      </div>
                    ) : (
                      <div 
                        style={{ fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-primary)' }}
                        onClick={() => { setEditingProgressId(proj.id); setEditingProgressVal(progress); }}
                        title="Click to edit progress"
                      >
                        {progress}% <TrendingUp size={12} color="var(--text-secondary)" />
                      </div>
                    )}
                  </div>

                  <div className="progress-track">
                    <div 
                      className="progress-fill"
                      style={{ 
                        width: `${progress}%`, 
                        backgroundColor: progress === 100 
                          ? 'var(--color-success)' 
                          : proj.status === 'on-hold' 
                            ? 'var(--color-warning)' 
                            : 'var(--mod-projects)',
                      }} 
                    />
                  </div>
                </div>

                {/* Footer with Status Badge and Date */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border-subtle)' }}>
                  <div>
                    {renderStatusBadge(proj)}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {proj.created_at ? new Date(proj.created_at).toLocaleDateString() : ''}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Project Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>New Project</h3>
              <button className="btn-icon" onClick={() => setShowAddModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleAddProject} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="label-caps">Project Name *</label>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="e.g. Website Redesign, Mobile App v2" 
                    value={newProjName} 
                    onChange={e => setNewProjName(e.target.value)} 
                    required 
                    autoFocus 
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="label-caps">Status</label>
                  <select 
                    className="select" 
                    value={newProjStatus} 
                    onChange={e => setNewProjStatus(e.target.value)}
                  >
                    <option value="active">Active</option>
                    <option value="on-hold">On Hold</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="label-caps">Description (Optional)</label>
                  <textarea 
                    className="textarea" 
                    rows={3} 
                    placeholder="What is this project about? Scope, goals, or notes..." 
                    value={newProjDesc} 
                    onChange={e => setNewProjDesc(e.target.value)} 
                  />
                </div>

                <div className="modal-footer" style={{ margin: '0 -var(--space-6)', marginBottom: '-var(--space-6)', marginTop: 'var(--space-4)' }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={savingProj}>
                    {savingProj ? 'Saving...' : 'Create Project'}
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
