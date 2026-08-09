import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, ChevronLeft, ChevronRight, Calendar, ArrowUpRight, ArrowDownRight, Wallet, TrendingUp } from 'lucide-react';

export default function Finance() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // Date/Month state
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth()); // 0-11
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  
  // Data state
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isModuleEnabled, setIsModuleEnabled] = useState(true);

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTxType, setNewTxType] = useState('expense');
  const [newTxAmount, setNewTxAmount] = useState('');
  const [newTxCategoryId, setNewTxCategoryId] = useState('');
  const [newTxDate, setNewTxDate] = useState(currentDate.toISOString().split('T')[0]);
  const [newTxNote, setNewTxNote] = useState('');
  const [savingTx, setSavingTx] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, selectedMonth, selectedYear]);

  async function loadData() {
    try {
      setLoading(true);

      // Check settings toggle
      const { data: settingsData } = await supabase
        .from('settings')
        .select('module_toggles')
        .eq('user_id', user.id)
        .maybeSingle();

      if (settingsData?.module_toggles?.finance === false) {
        setIsModuleEnabled(false);
        return;
      }
      setIsModuleEnabled(true);

      // Fetch Categories
      const { data: catData } = await supabase
        .from('transaction_categories')
        .select('*')
        .eq('user_id', user.id)
        .order('sort_order', { ascending: true });
      
      setCategories(catData || []);

      // Determine date range for selected month
      const startDate = new Date(selectedYear, selectedMonth, 1);
      const endDate = new Date(selectedYear, selectedMonth + 1, 0); // last day of month

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      // Fetch Transactions
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDateStr)
        .lte('date', endDateStr)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (txError) throw txError;
      setTransactions(txData || []);

    } catch (err) {
      console.error('Error loading finance data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function enableFinanceModule() {
    try {
      const { data: settingsData } = await supabase
        .from('settings')
        .select('module_toggles')
        .eq('user_id', user.id)
        .maybeSingle();

      const newToggles = { ...(settingsData?.module_toggles || {}), finance: true };
      await supabase.from('settings').upsert({ user_id: user.id, module_toggles: newToggles }, { onConflict: 'user_id' });
      setIsModuleEnabled(true);
      loadData();
    } catch (err) {
      console.error('Error enabling module:', err);
    }
  }

  async function handleAddTransaction(e) {
    e.preventDefault();
    if (!newTxAmount || !newTxCategoryId || !newTxDate) return;

    try {
      setSavingTx(true);
      const payload = {
        user_id: user.id,
        date: newTxDate,
        amount: Number(newTxAmount),
        type: newTxType,
        category_id: newTxCategoryId,
        note: newTxNote.trim() || null
      };

      const { data, error } = await supabase
        .from('transactions')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      // Only add to current view if it belongs to selected month
      const txDate = new Date(data.date);
      if (txDate.getMonth() === selectedMonth && txDate.getFullYear() === selectedYear) {
        setTransactions([data, ...transactions].sort((a, b) => new Date(b.date) - new Date(a.date)));
      }
      
      setShowAddModal(false);
      setNewTxAmount('');
      setNewTxNote('');
      setNewTxCategoryId(''); // Reset category

    } catch (err) {
      alert('Failed to save transaction: ' + err.message);
    } finally {
      setSavingTx(false);
    }
  }

  async function deleteTransaction(id) {
    if (!window.confirm('Delete this transaction?')) return;
    try {
      await supabase.from('transactions').delete().eq('id', id);
      setTransactions(transactions.filter(t => t.id !== id));
    } catch (err) {
      alert('Failed to delete transaction: ' + err.message);
    }
  }

  const shiftMonth = (delta) => {
    let newMonth = selectedMonth + delta;
    let newYear = selectedYear;
    if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    } else if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    }
    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  if (!isModuleEnabled) {
    return (
      <div className="card" style={{ maxWidth: '600px', margin: 'var(--space-8) auto', textAlign: 'center' }}>
        <h2>Finance Module is Hidden</h2>
        <p>You have turned off the Finance module in your Settings.</p>
        <button className="btn btn-primary" onClick={enableFinanceModule}>
          Enable Finance Module
        </button>
      </div>
    );
  }

  if (loading) {
    return <div style={{ padding: 'var(--space-6)' }}>Loading Finance data...</div>;
  }

  // Calculate totals
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);
  const netSavings = totalIncome - totalExpense;

  // Expense breakdown
  const expenseBreakdown = {};
  transactions.filter(t => t.type === 'expense').forEach(t => {
    expenseBreakdown[t.category_id] = (expenseBreakdown[t.category_id] || 0) + Number(t.amount);
  });
  
  const sortedExpenses = Object.entries(expenseBreakdown)
    .sort((a, b) => b[1] - a[1])
    .map(([catId, amount]) => ({
      category: categories.find(c => c.id === catId)?.name || 'Unknown',
      amount,
      pct: totalExpense > 0 ? (amount / totalExpense) * 100 : 0
    }));

  // Options for form
  const availableCategories = categories.filter(c => c.type === newTxType);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', maxWidth: '900px', margin: '0 auto' }}>
      
      {/* Header & Month Selector */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--mod-finance-muted)', color: 'var(--mod-finance)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Wallet size={24} />
          </div>
          <div>
            <h1 style={{ margin: 0 }}>Finance</h1>
            <p className="text-muted text-sm" style={{ margin: 0 }}>Track your income, expenses, and savings.</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <button type="button" className="btn btn-secondary btn-icon" onClick={() => shiftMonth(-1)}>
              <ChevronLeft size={20} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', fontWeight: 600, width: '120px', justifyContent: 'center' }}>
              <Calendar size={16} color="var(--text-secondary)" />
              {monthNames[selectedMonth]} {selectedYear}
            </div>
            <button type="button" className="btn btn-secondary btn-icon" onClick={() => shiftMonth(1)} disabled={selectedMonth === currentDate.getMonth() && selectedYear === currentDate.getFullYear()}>
              <ChevronRight size={20} />
            </button>
          </div>

          <button className="btn btn-primary" style={{ minHeight: '38px', fontSize: '0.875rem', gap: '4px' }} onClick={() => setShowAddModal(true)}>
            <Plus size={16} /> Transaction
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
        <div className="card" style={{ borderTop: '4px solid var(--color-success)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Total Income</span>
            <ArrowUpRight size={18} color="var(--color-success)" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-success)' }}>
            {formatCurrency(totalIncome)}
          </div>
        </div>

        <div className="card" style={{ borderTop: '4px solid var(--color-error)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Total Expense</span>
            <ArrowDownRight size={18} color="var(--color-error)" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {formatCurrency(totalExpense)}
          </div>
        </div>

        <div className="card" style={{ borderTop: `4px solid ${netSavings >= 0 ? 'var(--accent-primary)' : 'var(--color-error)'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Net Savings</span>
            <Wallet size={18} color={netSavings >= 0 ? "var(--accent-primary)" : "var(--color-error)"} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: netSavings >= 0 ? 'var(--text-primary)' : 'var(--color-error)' }}>
            {formatCurrency(netSavings)}
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-6)', alignItems: 'start' }}>
        
        {/* Transaction List */}
        <div className="card" style={{ minHeight: '400px' }}>
          <h3 style={{ marginBottom: 'var(--space-4)' }}>Transactions</h3>
          
          {transactions.length === 0 ? (
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: 'var(--space-6)' }}>
              No transactions logged for this month.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {transactions.map(tx => {
                const catName = categories.find(c => c.id === tx.category_id)?.name || 'Unknown Category';
                const isIncome = tx.type === 'income';
                
                return (
                  <div key={tx.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-3)', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: isIncome ? 'var(--mod-finance-muted)' : 'var(--bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {isIncome ? <ArrowUpRight size={18} color="var(--color-success)" /> : <ArrowDownRight size={18} color="var(--color-error)" />}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{catName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {tx.date} {tx.note && `• ${tx.note}`}
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                      <div style={{ fontWeight: 600, color: isIncome ? 'var(--color-success)' : 'var(--text-primary)' }}>
                        {isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
                      </div>
                      <button className="btn-icon" style={{ width: '28px', height: '28px', color: 'var(--text-secondary)' }} onClick={() => deleteTransaction(tx.id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Expense Breakdown */}
        <div className="card" style={{ position: 'sticky', top: 'var(--space-6)' }}>
          <h3 style={{ marginBottom: 'var(--space-4)' }}>Expense Breakdown</h3>
          
          {sortedExpenses.length === 0 ? (
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>No expenses to analyze.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {sortedExpenses.map(item => (
                <div key={item.category}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 500 }}>{item.category}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{formatCurrency(item.amount)} ({Math.round(item.pct)}%)</span>
                  </div>
                  <div className="progress-track">
                    <div 
                      className="progress-fill"
                      style={{ 
                        width: `${item.pct}%`, 
                        backgroundColor: 'var(--color-error)'
                      }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Transaction Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Add Transaction</h3>
              <button className="btn-icon" onClick={() => setShowAddModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleAddTransaction} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                
                <div className="chip-group" style={{ marginBottom: 'var(--space-2)' }}>
                  <button type="button" className={`chip ${newTxType === 'expense' ? 'active' : ''}`} style={{ flex: 1, backgroundColor: newTxType === 'expense' ? 'var(--color-error)' : 'var(--bg-surface)', color: newTxType === 'expense' ? '#fff' : 'var(--text-primary)' }} onClick={() => { setNewTxType('expense'); setNewTxCategoryId(''); }}>
                    Expense
                  </button>
                  <button type="button" className={`chip ${newTxType === 'income' ? 'active' : ''}`} style={{ flex: 1, backgroundColor: newTxType === 'income' ? 'var(--color-success)' : 'var(--bg-surface)', color: newTxType === 'income' ? '#fff' : 'var(--text-primary)' }} onClick={() => { setNewTxType('income'); setNewTxCategoryId(''); }}>
                    Income
                  </button>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label>Amount</label>
                  <input type="number" step="0.01" className="input" placeholder="0.00" value={newTxAmount} onChange={e => setNewTxAmount(e.target.value)} required />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label>Category</label>
                  <select className="select" value={newTxCategoryId} onChange={e => setNewTxCategoryId(e.target.value)} required>
                    <option value="" disabled>Select category...</option>
                    {availableCategories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  {availableCategories.length === 0 && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-error)', marginTop: '4px' }}>
                      No {newTxType} categories found. Add them in Settings.
                    </p>
                  )}
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label>Date</label>
                  <input type="date" className="input" value={newTxDate} onChange={e => setNewTxDate(e.target.value)} required />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label>Note (Optional)</label>
                  <input type="text" className="input" placeholder="e.g. Coffee with Sarah" value={newTxNote} onChange={e => setNewTxNote(e.target.value)} />
                </div>

                <div className="modal-footer" style={{ margin: '0 -var(--space-6)', marginBottom: '-var(--space-6)', marginTop: 'var(--space-4)' }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={savingTx || availableCategories.length === 0}>
                    {savingTx ? 'Saving...' : 'Save Transaction'}
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
