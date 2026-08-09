import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, Check, X, Sparkles, Flame } from 'lucide-react';

export default function Settings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState('light');
  const [settings, setSettings] = useState({
    module_toggles: { health: true, finance: true, tasks: true, projects: true, goals: true },
    notification_prefs: { checkin_reminder: true, window_start: "20:00", window_end: "22:00" }
  });
  
  // Habits management state
  const [habits, setHabits] = useState([]);
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitType, setNewHabitType] = useState('boolean');
  const [newHabitCategory, setNewHabitCategory] = useState('good_habit');
  const [habitLoading, setHabitLoading] = useState(false);

  // Finance categories state
  const [financeCategories, setFinanceCategories] = useState([]);
  const [showAddFinanceCat, setShowAddFinanceCat] = useState(false);
  const [newFinanceCatName, setNewFinanceCatName] = useState('');
  const [newFinanceCatType, setNewFinanceCatType] = useState('expense');
  const [financeLoading, setFinanceLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadAllSettings();
    }
  }, [user]);

  async function loadAllSettings() {
    try {
      setLoading(true);
      
      // 1. Load theme preference from profiles
      const { data: profileData } = await supabase
        .from('profiles')
        .select('theme_preference')
        .eq('id', user.id)
        .maybeSingle();
      
      if (profileData?.theme_preference) {
        setTheme(profileData.theme_preference);
        document.documentElement.setAttribute('data-theme', profileData.theme_preference);
      }

      // 2. Load module toggles from settings
      const { data: settingsData } = await supabase
        .from('settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (settingsData) {
        setSettings(settingsData);
      }

      // 3. Load habits
      const { data: habitsData } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', user.id)
        .order('sort_order', { ascending: true });

      setHabits(habitsData || []);

      // 4. Load finance categories
      const { data: finCatData } = await supabase
        .from('transaction_categories')
        .select('*')
        .eq('user_id', user.id)
        .order('type', { ascending: false })
        .order('sort_order', { ascending: true });
        
      setFinanceCategories(finCatData || []);

    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleTheme() {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    await supabase.from('profiles').update({ theme_preference: newTheme }).eq('id', user.id);
  }

  async function toggleModule(moduleName) {
    const newToggles = { ...settings.module_toggles, [moduleName]: !settings.module_toggles[moduleName] };
    setSettings({ ...settings, module_toggles: newToggles });
    await supabase.from('settings').upsert({ user_id: user.id, module_toggles: newToggles }, { onConflict: 'user_id' });
  }

  async function toggleHabitEnabled(habitId, currentEnabled) {
    try {
      const nextVal = !currentEnabled;
      setHabits(habits.map(h => h.id === habitId ? { ...h, enabled: nextVal } : h));
      await supabase
        .from('habits')
        .update({ enabled: nextVal })
        .eq('id', habitId);
    } catch (err) {
      console.error('Error toggling habit:', err);
    }
  }

  async function handleAddHabit(e) {
    e.preventDefault();
    if (!newHabitName.trim()) return;

    try {
      setHabitLoading(true);
      const newOrder = (habits.length > 0 ? Math.max(...habits.map(h => h.sort_order || 0)) : 0) + 1;
      
      const payload = {
        user_id: user.id,
        name: newHabitName.trim(),
        type: newHabitType,
        category: newHabitCategory,
        enabled: true,
        sort_order: newOrder
      };

      const { data, error } = await supabase
        .from('habits')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      setHabits([...habits, data]);
      setNewHabitName('');
      setShowAddHabit(false);
    } catch (err) {
      alert('Failed to add habit: ' + err.message);
    } finally {
      setHabitLoading(false);
    }
  }

  async function deleteHabit(habitId) {
    if (!window.confirm('Delete this habit? (Past logs will also be removed)')) return;
    try {
      await supabase.from('habits').delete().eq('id', habitId);
      setHabits(habits.filter(h => h.id !== habitId));
    } catch (err) {
      alert('Failed to delete habit: ' + err.message);
    }
  }

  async function handleAddFinanceCategory(e) {
    e.preventDefault();
    if (!newFinanceCatName.trim()) return;

    try {
      setFinanceLoading(true);
      const sameTypeCats = financeCategories.filter(c => c.type === newFinanceCatType);
      const newOrder = (sameTypeCats.length > 0 ? Math.max(...sameTypeCats.map(c => c.sort_order || 0)) : 0) + 1;
      
      const payload = {
        user_id: user.id,
        name: newFinanceCatName.trim(),
        type: newFinanceCatType,
        sort_order: newOrder
      };

      const { data, error } = await supabase
        .from('transaction_categories')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      setFinanceCategories([...financeCategories, data]);
      setNewFinanceCatName('');
      setShowAddFinanceCat(false);
    } catch (err) {
      alert('Failed to add category: ' + err.message);
    } finally {
      setFinanceLoading(false);
    }
  }

  async function deleteFinanceCategory(catId) {
    if (!window.confirm('Delete this category? (Transactions using this category will have it set to null)')) return;
    try {
      await supabase.from('transaction_categories').delete().eq('id', catId);
      setFinanceCategories(financeCategories.filter(c => c.id !== catId));
    } catch (err) {
      alert('Failed to delete category: ' + err.message);
    }
  }

  async function updateNotificationPrefs(key, value) {
    const currentPrefs = settings.notification_prefs || { checkin_reminder: true, window_start: "20:00", window_end: "22:00" };
    const newPrefs = { ...currentPrefs, [key]: value };
    setSettings({ ...settings, notification_prefs: newPrefs });
    await supabase.from('settings').upsert({ user_id: user.id, notification_prefs: newPrefs }, { onConflict: 'user_id' });
  }

  async function handleExportData() {
    try {
      const tables = ['profiles', 'settings', 'habits', 'habit_logs', 'daily_checkins', 'weight_logs', 'transactions', 'transaction_categories', 'tasks', 'projects', 'goals'];
      const exportData = {};
      
      for (const table of tables) {
        const { data } = await supabase.from(table).select('*').eq('user_id', user.id);
        exportData[table] = data || [];
      }
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `souvik_os_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to export data: ' + err.message);
    }
  }

  async function handleDeleteData() {
    if (!window.confirm('CRITICAL WARNING: This will permanently delete all your data (tasks, projects, checkins, expenses). This action CANNOT be undone. Are you absolutely sure?')) return;
    if (!window.confirm('Are you REALLY sure?')) return;
    
    try {
      // In V1 we just delete all rows for the user from all tables (except profiles/settings).
      const tables = ['habit_logs', 'daily_checkins', 'weight_logs', 'transactions', 'tasks', 'goals', 'projects', 'transaction_categories', 'habits'];
      for (const table of tables) {
        await supabase.from(table).delete().eq('user_id', user.id);
      }
      alert('Your data has been successfully deleted. Your profile and settings remain.');
      window.location.reload();
    } catch (err) {
      alert('Failed to delete data: ' + err.message);
    }
  }

  if (loading) return <div style={{ padding: 'var(--space-6)' }}>Loading Settings...</div>;

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h1 style={{ marginBottom: 'var(--space-1)' }}>Settings</h1>
        <p style={{ margin: 0, fontSize: '0.875rem' }}>Personalize modules, daily tracking habits, and interface.</p>
      </div>

      {/* 1. Theme & Appearance */}
      <div className="card">
        <h3>Appearance</h3>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'var(--space-4)' }}>
          <div>
            <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Dark Mode</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Toggle dark or light theme interface</div>
          </div>
          <button className="btn btn-secondary" onClick={toggleTheme}>
            {theme === 'dark' ? 'Disable Dark Mode' : 'Enable Dark Mode'}
          </button>
        </div>
      </div>

      {/* 2. Daily Habits & Tracker Configuration */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Sparkles size={20} color="var(--accent-primary)" />
            <h3 style={{ margin: 0 }}>Daily Check-in Habits & Trackers</h3>
          </div>
          <button 
            type="button" 
            className="btn btn-secondary" 
            style={{ minHeight: '36px', fontSize: '0.875rem', gap: '4px' }}
            onClick={() => setShowAddHabit(!showAddHabit)}
          >
            <Plus size={16} /> Add Tracker
          </button>
        </div>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
          Enable or disable items that appear in your sub-60s daily check-in flow.
        </p>

        {/* Add Habit Form */}
        {showAddHabit && (
          <form onSubmit={handleAddHabit} style={{ padding: 'var(--space-4)', backgroundColor: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <h4 style={{ margin: 0, fontSize: '0.9375rem' }}>New Tracker</h4>
            
            <div className="form-group" style={{ margin: 0 }}>
              <label>Tracker Name</label>
              <input 
                type="text" 
                className="input" 
                placeholder="e.g. Read 20 pages, Pushups, Cigarettes..." 
                value={newHabitName} 
                onChange={e => setNewHabitName(e.target.value)} 
                required 
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Input Type</label>
                <select className="select" value={newHabitType} onChange={e => setNewHabitType(e.target.value)}>
                  <option value="boolean">Toggle (Yes / No)</option>
                  <option value="count">Counter (+ / -)</option>
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label>Category</label>
                <select className="select" value={newHabitCategory} onChange={e => setNewHabitCategory(e.target.value)}>
                  <option value="good_habit">Good Habit</option>
                  <option value="personal_tracking">Personal Tracking</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-1)' }}>
              <button type="submit" className="btn btn-primary" style={{ minHeight: '38px', fontSize: '0.875rem' }} disabled={habitLoading}>
                {habitLoading ? 'Saving...' : 'Save Tracker'}
              </button>
              <button type="button" className="btn btn-secondary" style={{ minHeight: '38px', fontSize: '0.875rem' }} onClick={() => setShowAddHabit(false)}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Habit List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {habits.length === 0 ? (
            <p style={{ fontSize: '0.875rem', fontStyle: 'italic', margin: 0 }}>No habits configured yet.</p>
          ) : (
            habits.map((habit) => (
              <div 
                key={habit.id} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  padding: 'var(--space-3) var(--space-4)', 
                  backgroundColor: 'var(--bg-surface)', 
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  opacity: habit.enabled ? 1 : 0.6,
                  transition: 'opacity var(--transition-fast)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  {habit.category === 'personal_tracking' ? (
                    <Flame size={18} color="var(--color-warning)" />
                  ) : (
                    <Sparkles size={18} color="var(--accent-primary)" />
                  )}
                  <div>
                    <div style={{ fontWeight: 500 }}>{habit.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {habit.type === 'boolean' ? 'Toggle Yes/No' : 'Number Counter'} • {habit.category === 'good_habit' ? 'Good Habit' : 'Personal Tracking'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <button 
                    type="button"
                    className={`btn ${habit.enabled ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ minHeight: '34px', padding: '0 var(--space-3)', fontSize: '0.8125rem' }}
                    onClick={() => toggleHabitEnabled(habit.id, habit.enabled)}
                  >
                    {habit.enabled ? 'Enabled' : 'Disabled'}
                  </button>
                  <button 
                    type="button" 
                    className="btn-icon" 
                    style={{ width: '34px', height: '34px' }}
                    onClick={() => deleteHabit(habit.id)}
                    title="Delete Habit"
                  >
                    <Trash2 size={16} color="var(--color-error)" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 3. Finance Categories Configuration */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <h3 style={{ margin: 0 }}>Finance Categories</h3>
          </div>
          <button 
            type="button" 
            className="btn btn-secondary" 
            style={{ minHeight: '36px', fontSize: '0.875rem', gap: '4px' }}
            onClick={() => setShowAddFinanceCat(!showAddFinanceCat)}
          >
            <Plus size={16} /> Add Category
          </button>
        </div>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
          Manage the categories used for income and expenses in the Finance module.
        </p>

        {showAddFinanceCat && (
          <form onSubmit={handleAddFinanceCategory} style={{ padding: 'var(--space-4)', backgroundColor: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <h4 style={{ margin: 0, fontSize: '0.9375rem' }}>New Category</h4>
            
            <div className="form-group" style={{ margin: 0 }}>
              <label>Category Name</label>
              <input 
                type="text" 
                className="input" 
                placeholder="e.g. Salary, Rent, Groceries..." 
                value={newFinanceCatName} 
                onChange={e => setNewFinanceCatName(e.target.value)} 
                required 
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label>Type</label>
              <select className="select" value={newFinanceCatType} onChange={e => setNewFinanceCatType(e.target.value)}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-1)' }}>
              <button type="submit" className="btn btn-primary" style={{ minHeight: '38px', fontSize: '0.875rem' }} disabled={financeLoading}>
                {financeLoading ? 'Saving...' : 'Save Category'}
              </button>
              <button type="button" className="btn btn-secondary" style={{ minHeight: '38px', fontSize: '0.875rem' }} onClick={() => setShowAddFinanceCat(false)}>
                Cancel
              </button>
            </div>
          </form>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {financeCategories.length === 0 ? (
            <p style={{ fontSize: '0.875rem', fontStyle: 'italic', margin: 0 }}>No finance categories configured yet.</p>
          ) : (
            financeCategories.map((cat) => (
              <div 
                key={cat.id} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  padding: 'var(--space-3) var(--space-4)', 
                  backgroundColor: 'var(--bg-surface)', 
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)'
                }}
              >
                <div>
                  <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{cat.name}</div>
                  <div style={{ fontSize: '0.75rem', color: cat.type === 'income' ? 'var(--color-success)' : 'var(--color-error)' }}>
                    {cat.type === 'income' ? 'Income' : 'Expense'}
                  </div>
                </div>

                <button 
                  type="button" 
                  className="btn-icon" 
                  style={{ width: '34px', height: '34px' }}
                  onClick={() => deleteFinanceCategory(cat.id)}
                  title="Delete Category"
                >
                  <Trash2 size={16} color="var(--color-error)" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 4. Module Toggles */}
      <div className="card">
        <h3>Active Modules</h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
          Turn off modules you don't use. Check-in is always active.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {Object.keys(settings.module_toggles || {}).map(mod => (
            <div key={mod} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-2) 0' }}>
              <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>{mod}</span>
              <button 
                className={`btn ${settings.module_toggles[mod] ? 'btn-primary' : 'btn-secondary'}`}
                style={{ minHeight: '36px', padding: '0 var(--space-4)', fontSize: '0.875rem' }}
                onClick={() => toggleModule(mod)}
              >
                {settings.module_toggles[mod] ? 'Active' : 'Hidden'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Notifications */}
      <div className="card">
        <h3>Notifications</h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
          Configure when you want to be reminded to complete your Daily Check-in.
        </p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="flex-between">
            <span style={{ fontWeight: 500 }}>Check-in Reminder</span>
            <button 
              className={`btn ${settings.notification_prefs?.checkin_reminder ? 'btn-primary' : 'btn-secondary'}`}
              style={{ minHeight: '36px', padding: '0 var(--space-4)', fontSize: '0.875rem' }}
              onClick={() => updateNotificationPrefs('checkin_reminder', !settings.notification_prefs?.checkin_reminder)}
            >
              {settings.notification_prefs?.checkin_reminder ? 'Enabled' : 'Disabled'}
            </button>
          </div>
          
          {settings.notification_prefs?.checkin_reminder && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginTop: 'var(--space-2)' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Window Start</label>
                <input 
                  type="time" 
                  className="input" 
                  value={settings.notification_prefs?.window_start || "20:00"} 
                  onChange={(e) => updateNotificationPrefs('window_start', e.target.value)}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Window End</label>
                <input 
                  type="time" 
                  className="input" 
                  value={settings.notification_prefs?.window_end || "22:00"} 
                  onChange={(e) => updateNotificationPrefs('window_end', e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 6. Data Controls */}
      <div className="card" style={{ border: '1px solid var(--color-error)' }}>
        <h3 style={{ color: 'var(--color-error)' }}>Danger Zone</h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
          Manage your account data. Export a backup or completely wipe your history.
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={handleExportData}>
            Export Data (JSON)
          </button>
          <button className="btn btn-primary" style={{ flex: 1, backgroundColor: 'var(--color-error)' }} onClick={handleDeleteData}>
            Delete All Data
          </button>
        </div>
      </div>
      
      <div style={{ paddingBottom: 'var(--space-8)' }} />
    </div>
  );
}
