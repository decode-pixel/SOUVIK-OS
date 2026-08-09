import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { ListTodo, Wallet, X } from 'lucide-react';

export default function QuickAddModal({ onClose, onAdded }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('task');
  const [loading, setLoading] = useState(false);
  const todayStr = new Date().toISOString().split('T')[0];

  const [taskTitle, setTaskTitle] = useState('');
  const [taskProjectId, setTaskProjectId] = useState('');
  const [projects, setProjects] = useState([]);

  const [expAmount, setExpAmount] = useState('');
  const [expCategoryId, setExpCategoryId] = useState('');
  const [expDate, setExpDate] = useState(todayStr);
  const [expNote, setExpNote] = useState('');
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    if (user) loadDependencies();
  }, [user]);

  async function loadDependencies() {
    try {
      const [{ data: projData }, { data: catData }] = await Promise.all([
        supabase.from('projects').select('id, name').eq('user_id', user.id).eq('status', 'active'),
        supabase.from('transaction_categories').select('id, name').eq('user_id', user.id).eq('type', 'expense').order('sort_order'),
      ]);
      setProjects(projData || []);
      setCategories(catData || []);
    } catch (err) {
      console.error('Failed to load quick add dependencies:', err);
    }
  }

  async function handleAddTask(e) {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    try {
      setLoading(true);
      await supabase.from('tasks').insert({
        user_id: user.id, title: taskTitle.trim(),
        project_id: taskProjectId || null, date: todayStr, status: 'todo',
      });
      if (onAdded) onAdded('task');
      onClose();
    } catch (err) {
      alert('Failed to add task: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddExpense(e) {
    e.preventDefault();
    if (!expAmount || !expCategoryId || !expDate) return;
    try {
      setLoading(true);
      await supabase.from('transactions').insert({
        user_id: user.id, date: expDate,
        amount: Number(expAmount), type: 'expense',
        category_id: expCategoryId, note: expNote.trim() || null,
      });
      if (onAdded) onAdded('expense');
      onClose();
    } catch (err) {
      alert('Failed to add expense: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>

        {/* Header */}
        <div className="modal-header">
          <div>
            <h3 style={{ margin: 0, fontSize: 'var(--font-size-lg)' }}>Quick Add</h3>
            <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Add a task or log an expense</p>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{
          display: 'flex', padding: 'var(--space-3) var(--space-4)',
          borderBottom: '1px solid var(--border-subtle)',
          gap: 'var(--space-2)',
        }}>
          <button
            className="btn"
            style={{
              flex: 1, minHeight: '36px', fontSize: 'var(--font-size-sm)',
              background: activeTab === 'task' ? 'var(--mod-tasks-muted)' : 'var(--bg-subtle)',
              color: activeTab === 'task' ? 'var(--mod-tasks)' : 'var(--text-secondary)',
              border: `1px solid ${activeTab === 'task' ? 'rgba(217,119,6,0.2)' : 'var(--border-subtle)'}`,
              fontWeight: activeTab === 'task' ? 600 : 500,
              gap: 'var(--space-2)',
            }}
            onClick={() => setActiveTab('task')}
          >
            <ListTodo size={15} /> Task
          </button>
          <button
            className="btn"
            style={{
              flex: 1, minHeight: '36px', fontSize: 'var(--font-size-sm)',
              background: activeTab === 'expense' ? 'var(--mod-finance-muted)' : 'var(--bg-subtle)',
              color: activeTab === 'expense' ? 'var(--mod-finance)' : 'var(--text-secondary)',
              border: `1px solid ${activeTab === 'expense' ? 'rgba(13,158,110,0.2)' : 'var(--border-subtle)'}`,
              fontWeight: activeTab === 'expense' ? 600 : 500,
              gap: 'var(--space-2)',
            }}
            onClick={() => setActiveTab('expense')}
          >
            <Wallet size={15} /> Expense
          </button>
        </div>

        {/* Forms */}
        <div className="modal-body" style={{ padding: 'var(--space-5)' }}>
          {activeTab === 'task' && (
            <form onSubmit={handleAddTask} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Task Title</label>
                <input
                  type="text" className="input"
                  placeholder="What needs to be done?"
                  value={taskTitle}
                  onChange={e => setTaskTitle(e.target.value)}
                  required autoFocus
                />
              </div>
              {projects.length > 0 && (
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Link to Project (Optional)</label>
                  <select className="select" value={taskProjectId} onChange={e => setTaskProjectId(e.target.value)}>
                    <option value="">No Project</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || !taskTitle.trim()}
                style={{ background: 'var(--mod-tasks)', marginTop: 'var(--space-1)', width: '100%' }}
              >
                {loading ? 'Adding...' : 'Add Task'}
              </button>
            </form>
          )}

          {activeTab === 'expense' && (
            <form onSubmit={handleAddExpense} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <div className="form-group" style={{ flex: 1, margin: 0 }}>
                  <label>Amount (₹)</label>
                  <input
                    type="number" className="input"
                    placeholder="0" step="0.01" min="0"
                    value={expAmount}
                    onChange={e => setExpAmount(e.target.value)}
                    required autoFocus
                  />
                </div>
                <div className="form-group" style={{ flex: 1, margin: 0 }}>
                  <label>Date</label>
                  <input
                    type="date" className="input"
                    value={expDate}
                    onChange={e => setExpDate(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Category</label>
                <div className="chip-group">
                  {categories.map(c => (
                    <button
                      key={c.id} type="button"
                      className={`chip ${expCategoryId === c.id ? 'active' : ''}`}
                      onClick={() => setExpCategoryId(c.id)}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Note (Optional)</label>
                <input
                  type="text" className="input"
                  placeholder="What was this for?"
                  value={expNote}
                  onChange={e => setExpNote(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || !expAmount || !expCategoryId}
                style={{ background: 'var(--mod-finance)', marginTop: 'var(--space-1)', width: '100%' }}
              >
                {loading ? 'Logging...' : 'Log Expense'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
