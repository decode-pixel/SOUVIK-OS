import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { ListTodo, Wallet, X } from 'lucide-react';

export default function QuickAddModal({ onClose, onAdded }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('task'); // 'task' | 'expense'
  const [loading, setLoading] = useState(false);
  const todayStr = new Date().toISOString().split('T')[0];

  // Task state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskProjectId, setTaskProjectId] = useState('');
  const [projects, setProjects] = useState([]);

  // Expense state
  const [expAmount, setExpAmount] = useState('');
  const [expCategoryId, setExpCategoryId] = useState('');
  const [expDate, setExpDate] = useState(todayStr);
  const [expNote, setExpNote] = useState('');
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    if (user) {
      loadDependencies();
    }
  }, [user]);

  async function loadDependencies() {
    try {
      const [
        { data: projData },
        { data: catData }
      ] = await Promise.all([
        supabase.from('projects').select('id, name').eq('user_id', user.id).eq('status', 'active'),
        supabase.from('transaction_categories').select('id, name').eq('user_id', user.id).eq('type', 'expense').order('sort_order')
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
        user_id: user.id,
        title: taskTitle.trim(),
        project_id: taskProjectId || null,
        date: todayStr,
        status: 'todo'
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
        user_id: user.id,
        date: expDate,
        amount: Number(expAmount),
        type: 'expense',
        category_id: expCategoryId,
        note: expNote.trim() || null
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
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h3 style={{ margin: 0 }}>Quick Add</h3>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="modal-body" style={{ padding: '0', display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ display: 'flex', padding: 'var(--space-4)', borderBottom: '1px solid var(--border-subtle)', gap: 'var(--space-2)' }}>
            <button 
              className={`btn ${activeTab === 'task' ? 'btn-primary' : 'btn-secondary'}`} 
              style={{ flex: 1, backgroundColor: activeTab === 'task' ? 'var(--mod-tasks)' : '', color: activeTab === 'task' ? '#fff' : '' }}
              onClick={() => setActiveTab('task')}
            >
              <ListTodo size={18} /> Task
            </button>
            <button 
              className={`btn ${activeTab === 'expense' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1, backgroundColor: activeTab === 'expense' ? 'var(--mod-finance)' : '', color: activeTab === 'expense' ? '#fff' : '' }}
              onClick={() => setActiveTab('expense')}
            >
              <Wallet size={18} /> Expense
            </button>
          </div>

          <div style={{ padding: 'var(--space-4)' }}>
            {activeTab === 'task' && (
              <form onSubmit={handleAddTask} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div className="form-group">
                  <label>Task Title</label>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="What needs to be done?" 
                    value={taskTitle} 
                    onChange={e => setTaskTitle(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                {projects.length > 0 && (
                  <div className="form-group">
                    <label>Link to Project (Optional)</label>
                    <select className="select" value={taskProjectId} onChange={e => setTaskProjectId(e.target.value)}>
                      <option value="">No Project</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <button type="submit" className="btn btn-primary" disabled={loading || !taskTitle.trim()} style={{ backgroundColor: 'var(--mod-tasks)', marginTop: 'var(--space-2)' }}>
                  {loading ? 'Saving...' : 'Add Task'}
                </button>
              </form>
            )}

            {activeTab === 'expense' && (
              <form onSubmit={handleAddExpense} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Amount</label>
                    <input 
                      type="number" 
                      className="input" 
                      placeholder="0.00" 
                      step="0.01" 
                      min="0"
                      value={expAmount} 
                      onChange={e => setExpAmount(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Date</label>
                    <input 
                      type="date" 
                      className="input" 
                      value={expDate} 
                      onChange={e => setExpDate(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <div className="chip-group">
                    {categories.map(c => (
                      <button 
                        key={c.id} 
                        type="button" 
                        className={`chip ${expCategoryId === c.id ? 'active' : ''}`}
                        onClick={() => setExpCategoryId(c.id)}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label>Note (Optional)</label>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="What was this for?" 
                    value={expNote} 
                    onChange={e => setExpNote(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading || !expAmount || !expCategoryId} style={{ backgroundColor: 'var(--mod-finance)', marginTop: 'var(--space-2)' }}>
                  {loading ? 'Saving...' : 'Log Expense'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
