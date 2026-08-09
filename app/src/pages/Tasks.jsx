import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, CheckCircle2, Circle, Clock, FolderKanban } from 'lucide-react';

export default function Tasks() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [isModuleEnabled, setIsModuleEnabled] = useState(true);

  // New task state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskProjectId, setNewTaskProjectId] = useState('');
  const [savingTask, setSavingTask] = useState(false);
  
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, selectedDate]);

  async function loadData() {
    try {
      setLoading(true);

      const { data: settingsData } = await supabase
        .from('settings')
        .select('module_toggles')
        .eq('user_id', user.id)
        .maybeSingle();

      if (settingsData?.module_toggles?.tasks === false) {
        setIsModuleEnabled(false);
        return;
      }
      setIsModuleEnabled(true);

      // Load active projects for the dropdown
      const { data: projData } = await supabase
        .from('projects')
        .select('id, name')
        .eq('user_id', user.id)
        .eq('status', 'active');
      setProjects(projData || []);

      // Load tasks for the selected date OR overdue tasks that are not done
      const { data: taskData, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .or(`date.eq.${selectedDate},and(status.neq.done,date.lt.${selectedDate})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setTasks(taskData || []);

    } catch (err) {
      console.error('Error loading tasks:', err);
    } finally {
      setLoading(false);
    }
  }

  async function enableTasksModule() {
    try {
      const { data: settingsData } = await supabase
        .from('settings')
        .select('module_toggles')
        .eq('user_id', user.id)
        .single();

      const newToggles = { ...(settingsData?.module_toggles || {}), tasks: true };
      await supabase.from('settings').upsert({ user_id: user.id, module_toggles: newToggles }, { onConflict: 'user_id' });
      setIsModuleEnabled(true);
      loadData();
    } catch (err) {
      console.error('Error enabling module:', err);
    }
  }

  async function handleAddTask(e) {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      setSavingTask(true);
      const payload = {
        user_id: user.id,
        title: newTaskTitle.trim(),
        project_id: newTaskProjectId || null,
        date: selectedDate,
        status: 'todo'
      };

      const { data, error } = await supabase
        .from('tasks')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      setTasks([...tasks, data]);
      setNewTaskTitle('');
      // Keep the project selected to add multiple tasks quickly
    } catch (err) {
      alert('Failed to save task: ' + err.message);
    } finally {
      setSavingTask(false);
    }
  }

  async function updateTaskStatus(id, newStatus) {
    try {
      setTasks(tasks.map(t => t.id === id ? { ...t, status: newStatus } : t));
      await supabase.from('tasks').update({ status: newStatus }).eq('id', id);
    } catch (err) {
      console.error('Error updating task status:', err);
    }
  }

  async function deleteTask(id) {
    try {
      await supabase.from('tasks').delete().eq('id', id);
      setTasks(tasks.filter(t => t.id !== id));
    } catch (err) {
      alert('Failed to delete task: ' + err.message);
    }
  }

  if (!isModuleEnabled) {
    return (
      <div className="card" style={{ maxWidth: '600px', margin: 'var(--space-8) auto', textAlign: 'center' }}>
        <h2>Tasks Module is Hidden</h2>
        <p>You have turned off the Tasks module in your Settings.</p>
        <button className="btn btn-primary" onClick={enableTasksModule}>
          Enable Tasks Module
        </button>
      </div>
    );
  }

  if (loading) {
    return <div style={{ padding: 'var(--space-6)' }}>Loading Tasks...</div>;
  }

  const todoTasks = tasks.filter(t => t.status === 'todo');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const doneTasks = tasks.filter(t => t.status === 'done');

  const TaskCard = ({ task }) => {
    const projName = projects.find(p => p.id === task.project_id)?.name;
    const isOverdue = task.date < todayStr && task.status !== 'done';
    
    return (
      <div className="card" style={{ 
        padding: 'var(--space-3) var(--space-4)', 
        opacity: task.status === 'done' ? 0.6 : 1,
        marginBottom: '0',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        transition: 'all var(--transition-fast)'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', flex: 1 }}>
          <button 
            className="btn-icon" 
            style={{ 
              width: '24px', height: '24px', 
              marginTop: '2px',
              color: task.status === 'done' ? 'var(--color-success)' : task.status === 'in_progress' ? 'var(--mod-tasks)' : 'var(--text-secondary)'
            }}
            onClick={() => updateTaskStatus(task.id, task.status === 'done' ? 'todo' : 'done')}
          >
            {task.status === 'done' ? <CheckCircle2 size={20} /> : task.status === 'in_progress' ? <Clock size={20} /> : <Circle size={20} />}
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500, textDecoration: task.status === 'done' ? 'line-through' : 'none', color: task.status === 'done' ? 'var(--text-muted)' : 'var(--text-primary)' }}>
              {task.title}
            </div>
            {(projName || isOverdue) && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                {projName && (
                  <span className="badge badge-info">
                    <FolderKanban size={10} /> {projName}
                  </span>
                )}
                {isOverdue && (
                  <span className="badge badge-neutral" style={{ color: 'var(--color-error)', backgroundColor: 'var(--bg-muted)' }}>
                    Overdue
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {task.status === 'todo' && (
            <button className="btn-icon" style={{ width: '32px', height: '32px' }} onClick={() => updateTaskStatus(task.id, 'in_progress')} title="Start Task">
              <Clock size={16} color="var(--mod-tasks)" />
            </button>
          )}
          {task.status === 'in_progress' && (
            <button className="btn-icon" style={{ width: '32px', height: '32px' }} onClick={() => updateTaskStatus(task.id, 'todo')} title="Pause Task">
              <Circle size={16} />
            </button>
          )}
          <button className="btn-icon" style={{ width: '32px', height: '32px' }} onClick={() => deleteTask(task.id)} title="Delete">
            <Trash2 size={16} color="var(--color-error)" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', maxWidth: '900px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--mod-tasks-muted)', color: 'var(--mod-tasks)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ListTodo size={24} />
          </div>
          <div>
            <h1 style={{ margin: 0 }}>Tasks</h1>
            <p className="text-muted text-sm" style={{ margin: 0 }}>Execution system & actionable items.</p>
          </div>
        </div>
        <div>
          <input 
            type="date" 
            className="input" 
            value={selectedDate} 
            onChange={e => setSelectedDate(e.target.value)} 
            style={{ minWidth: '150px' }}
          />
        </div>
      </div>

      {/* Quick Add Form */}
      <div className="card" style={{ padding: 'var(--space-3)' }}>
        <form onSubmit={handleAddTask} style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1 1 300px', margin: 0 }}>
            <input 
              type="text" 
              className="input" 
              placeholder="What needs to be done?" 
              value={newTaskTitle} 
              onChange={e => setNewTaskTitle(e.target.value)} 
              required 
            />
          </div>
          <div style={{ width: '200px', margin: 0 }}>
            <select className="select" value={newTaskProjectId} onChange={e => setNewTaskProjectId(e.target.value)}>
              <option value="">No Project</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-primary" style={{ minHeight: '38px' }} disabled={savingTask}>
            <Plus size={16} /> Add
          </button>
        </form>
      </div>

      {/* Columns Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-4)', alignItems: 'start' }}>
        
        {/* To Do Column */}
        <div className="flex-col" style={{ gap: 'var(--space-3)' }}>
          <h3 className="flex-between text-sm text-muted font-semibold" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            To Do <span className="badge badge-neutral">{todoTasks.length}</span>
          </h3>
          <div className="flex-col" style={{ gap: 'var(--space-2)' }}>
            {todoTasks.length === 0 ? (
              <p className="text-muted text-sm text-center" style={{ fontStyle: 'italic', padding: 'var(--space-4)' }}>Clear deck.</p>
            ) : (
              todoTasks.map(t => <TaskCard key={t.id} task={t} />)
            )}
          </div>
        </div>

        {/* In Progress Column */}
        <div className="flex-col" style={{ gap: 'var(--space-3)' }}>
          <h3 className="flex-between text-sm text-muted font-semibold" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            In Progress <span className="badge badge-warning">{inProgressTasks.length}</span>
          </h3>
          <div className="flex-col" style={{ gap: 'var(--space-2)' }}>
            {inProgressTasks.length === 0 ? (
              <p className="text-muted text-sm text-center" style={{ fontStyle: 'italic', padding: 'var(--space-4)' }}>No active tasks.</p>
            ) : (
              inProgressTasks.map(t => <TaskCard key={t.id} task={t} />)
            )}
          </div>
        </div>

        {/* Done Column */}
        <div className="flex-col" style={{ gap: 'var(--space-3)' }}>
          <h3 className="flex-between text-sm text-muted font-semibold" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Done <span className="badge badge-success">{doneTasks.length}</span>
          </h3>
          <div className="flex-col" style={{ gap: 'var(--space-2)' }}>
            {doneTasks.length === 0 ? (
              <p className="text-muted text-sm text-center" style={{ fontStyle: 'italic', padding: 'var(--space-4)' }}>No completed tasks yet.</p>
            ) : (
              doneTasks.map(t => <TaskCard key={t.id} task={t} />)
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
