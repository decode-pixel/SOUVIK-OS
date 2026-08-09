import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, Droplets, Flame, FolderKanban, CheckCircle2 } from 'lucide-react';

export default function Projects() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  
  // UI State
  const [activeTab, setActiveTab] = useState('waterbook'); // waterbook or fuelbook
  const [isModuleEnabled, setIsModuleEnabled] = useState(true);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [savingProj, setSavingProj] = useState(false);

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
        .single();

      const newToggles = { ...(settingsData?.module_toggles || {}), projects: true };
      await supabase.from('settings').upsert({ user_id: user.id, module_toggles: newToggles }, { onConflict: 'user_id' });
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
        type: activeTab,
        status: 'active'
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
    } catch (err) {
      alert('Failed to save project: ' + err.message);
    } finally {
      setSavingProj(false);
    }
  }

  async function toggleProjectStatus(id, currentStatus) {
    try {
      const nextStatus = currentStatus === 'active' ? 'completed' : 'active';
      setProjects(projects.map(p => p.id === id ? { ...p, status: nextStatus } : p));
      
      await supabase
        .from('projects')
        .update({ status: nextStatus })
        .eq('id', id);
    } catch (err) {
      console.error('Error toggling status:', err);
    }
  }

  async function deleteProject(id) {
    if (!window.confirm('Delete this project? All associated tasks will be unlinked (set to null project).')) return;
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
        <p>You have turned off the Projects module in your Settings.</p>
        <button className="btn btn-primary" onClick={enableProjectsModule}>
          Enable Projects Module
        </button>
      </div>
    );
  }

  if (loading) {
    return <div style={{ padding: 'var(--space-6)' }}>Loading Projects...</div>;
  }

  const displayedProjects = projects.filter(p => p.type === activeTab);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', maxWidth: '900px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--mod-projects-muted)', color: 'var(--mod-projects)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FolderKanban size={24} />
          </div>
          <div>
            <h1 style={{ margin: 0 }}>Projects</h1>
            <p className="text-muted text-sm" style={{ margin: 0 }}>Organize via the WaterBook / FuelBook system.</p>
          </div>
        </div>
        <button className="btn btn-primary" style={{ minHeight: '38px', fontSize: '0.875rem', gap: '4px' }} onClick={() => setShowAddModal(true)}>
          <Plus size={16} /> New Project
        </button>
      </div>

      {/* Tabs */}
      <div className="chip-group" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', padding: '4px', borderRadius: 'var(--radius-md)', display: 'inline-flex' }}>
        <button 
          className={`btn ${activeTab === 'waterbook' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ minHeight: '38px', border: 'none', gap: '8px', boxShadow: activeTab === 'waterbook' ? 'var(--shadow-sm)' : 'none', flex: 1, backgroundColor: activeTab === 'waterbook' ? 'var(--mod-projects)' : 'transparent', color: activeTab === 'waterbook' ? 'var(--text-inverse)' : 'var(--text-secondary)' }}
          onClick={() => setActiveTab('waterbook')}
        >
          <Droplets size={18} /> WaterBook
        </button>
        <button 
          className={`btn ${activeTab === 'fuelbook' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ minHeight: '38px', border: 'none', gap: '8px', boxShadow: activeTab === 'fuelbook' ? 'var(--shadow-sm)' : 'none', flex: 1, backgroundColor: activeTab === 'fuelbook' ? 'var(--mod-tasks)' : 'transparent', color: activeTab === 'fuelbook' ? 'var(--bg-app)' : 'var(--text-secondary)' }}
          onClick={() => setActiveTab('fuelbook')}
        >
          <Flame size={18} /> FuelBook
        </button>
      </div>

      {/* Intro text based on tab */}
      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
        {activeTab === 'waterbook' 
          ? "WaterBook projects are necessary administrative or maintenance tasks (e.g. Taxes, Moving, Renewal). They keep the engine running."
          : "FuelBook projects are creative, growth-oriented, or passion-driven pursuits (e.g. Side Hustle, Learning an Instrument, Building an app)."}
      </p>

      {/* Project List */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-4)' }}>
        {displayedProjects.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', padding: 'var(--space-8)', textAlign: 'center', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)' }}>
            <FolderKanban size={48} color="var(--text-muted)" style={{ marginBottom: 'var(--space-4)' }} />
            <h3 style={{ margin: 0, marginBottom: 'var(--space-2)' }}>No {activeTab === 'waterbook' ? 'WaterBook' : 'FuelBook'} Projects</h3>
            <p className="text-muted" style={{ margin: 0 }}>Click "New Project" to create one.</p>
          </div>
        ) : (
          displayedProjects.map(proj => (
            <div 
              key={proj.id} 
              className="card card-interactive" 
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: 'var(--space-4)',
                opacity: proj.status === 'completed' ? 0.6 : 1,
                borderTop: `4px solid ${activeTab === 'waterbook' ? 'var(--mod-projects)' : 'var(--mod-tasks)'}`
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 style={{ margin: 0, fontSize: '1.125rem' }}>{proj.name}</h3>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <button 
                    className="btn-icon" 
                    style={{ color: proj.status === 'completed' ? 'var(--color-success)' : 'var(--text-secondary)' }}
                    onClick={() => toggleProjectStatus(proj.id, proj.status)}
                    title={proj.status === 'completed' ? 'Mark Active' : 'Mark Completed'}
                  >
                    <CheckCircle2 size={18} />
                  </button>
                  <button 
                    className="btn-icon" 
                    style={{ color: 'var(--color-error)' }}
                    onClick={() => deleteProject(proj.id)}
                    title="Delete Project"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              
              {proj.description && (
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', flex: 1 }}>
                  {proj.description}
                </p>
              )}
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--border-subtle)' }}>
                <span className={`badge ${proj.status === 'completed' ? 'badge-success' : 'badge-info'}`}>
                  {proj.status === 'completed' ? 'Completed' : 'Active'}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {new Date(proj.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))
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
                
                <div className="chip-group" style={{ marginBottom: 'var(--space-2)' }}>
                  <button type="button" className={`chip ${activeTab === 'waterbook' ? 'active' : ''}`} style={{ flex: 1, backgroundColor: activeTab === 'waterbook' ? 'var(--mod-projects)' : 'var(--bg-surface)', color: activeTab === 'waterbook' ? '#fff' : 'var(--text-primary)' }} onClick={() => setActiveTab('waterbook')}>
                    WaterBook
                  </button>
                  <button type="button" className={`chip ${activeTab === 'fuelbook' ? 'active' : ''}`} style={{ flex: 1, backgroundColor: activeTab === 'fuelbook' ? 'var(--mod-tasks)' : 'var(--bg-surface)', color: activeTab === 'fuelbook' ? 'var(--bg-app)' : 'var(--text-primary)' }} onClick={() => setActiveTab('fuelbook')}>
                    FuelBook
                  </button>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label>Project Name</label>
                  <input type="text" className="input" placeholder="e.g. Taxes 2026, Learn Piano" value={newProjName} onChange={e => setNewProjName(e.target.value)} required />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label>Goal / Description (Optional)</label>
                  <textarea className="textarea" rows={3} placeholder="What is the objective?" value={newProjDesc} onChange={e => setNewProjDesc(e.target.value)} />
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
