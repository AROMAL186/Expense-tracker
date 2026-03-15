import { useState, useEffect } from 'react'
import './index.css'

const INITIAL_BUDGET = 70000;

function App() {
  const [expenses, setExpenses] = useState([]);
  const [isAdmin, setIsAdmin] = useState(sessionStorage.getItem('isAdmin') === 'true');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [sortOrder, setSortOrder] = useState('desc');

  // Form State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [editingId, setEditingId] = useState(null);

  // Login Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const loadData = async () => {
    try {
      const res = await fetch('/api/expenses');
      if (res.ok) {
        const data = await res.json();
        setExpenses(data);
      }
    } catch (err) {
      console.error('Failed to load expenses', err);
    }
  };

  useEffect(() => {
    loadData();
    // Auto-refresh for clients every 30 seconds
    if (!isAdmin) {
      const interval = setInterval(loadData, 30000);
      return () => clearInterval(interval);
    }
  }, [isAdmin]);

  const saveData = async (newData) => {
    try {
      await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newData)
      });
      setExpenses(newData);
    } catch (err) {
      console.error('Failed to save expenses', err);
      alert('Could not save to server. Is the Node server running?');
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (username === 'admin' && password === 'admin') {
      sessionStorage.setItem('isAdmin', 'true');
      setIsAdmin(true);
      setShowLoginModal(false);
      setUsername('');
      setPassword('');
    } else {
      alert('Invalid username or password');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('isAdmin');
    setIsAdmin(false);
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    const amountValue = parseFloat(amount);
    if (amountValue <= 0 || isNaN(amountValue) || !date || !desc) return;

    let newData = [...expenses];

    if (editingId) {
      const index = newData.findIndex(ex => ex.id === editingId);
      if (index !== -1) {
        newData[index] = { ...newData[index], amount: amountValue, date, desc };
      }
      setEditingId(null);
    } else {
      const newExpense = {
        id: Date.now().toString(),
        date,
        desc,
        amount: amountValue,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      };
      newData.push(newExpense);
    }

    await saveData(newData);
    setAmount('');
    setDesc('');
  };

  const handleEdit = (id) => {
    const expense = expenses.find(ex => ex.id === id);
    if (expense) {
      setAmount(expense.amount);
      setDesc(expense.desc);
      setDate(expense.date);
      setEditingId(id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this expense?')) {
      const newData = expenses.filter(ex => ex.id !== id);
      await saveData(newData);
    }
  };

  const handleReset = async () => {
    if (window.confirm('Are you sure you want to reset all data? This cannot be undone.')) {
      await saveData([]);
    }
  };

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0
  }).format(val);

  const formatDateLabel = (dateString) => {
    const d = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = d.toDateString() === today.toDateString();
    const isYesterday = d.toDateString() === yesterday.toDateString();

    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    if (isToday) return `Today, ${d.toLocaleDateString('en-US', options)}`;
    if (isYesterday) return `Yesterday, ${d.toLocaleDateString('en-US', options)}`;
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const remaining = INITIAL_BUDGET - totalSpent;
  let percentage = (totalSpent / INITIAL_BUDGET) * 100;
  if (percentage > 100) percentage = 100;

  // Sorting
  const sortedExpenses = [...expenses].sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    if (dateA.getTime() === dateB.getTime()) {
      return sortOrder === 'desc' ? b.id - a.id : a.id - b.id;
    }
    return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
  });

  // Grouping
  const grouped = sortedExpenses.reduce((group, expense) => {
    if (!group[expense.date]) group[expense.date] = { total: 0, items: [] };
    group[expense.date].items.push(expense);
    group[expense.date].total += expense.amount;
    return group;
  }, {});

  return (
    <>
      <div className="background-blob blob-1"></div>
      <div className="background-blob blob-2"></div>

      <div className="app-container">
        <header className="app-header">
          <div className="header-icon">
            <i className="fas fa-hammer"></i>
          </div>
          <div>
            <h1>House Project Tracker</h1>
            <p>{isAdmin ? "Admin Mode: Manage 70,000 budget" : "Viewer Mode: 70,000 budget summary"}</p>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
            {isAdmin ? (
              <>
                <button onClick={handleReset} className="icon-btn" title="Reset All Data">
                  <i className="fas fa-rotate-right"></i>
                </button>
                <button onClick={handleLogout} className="icon-btn" title="Logout" style={{ color: 'var(--accent-danger)' }}>
                  <i className="fas fa-sign-out-alt"></i>
                </button>
              </>
            ) : (
              <button onClick={() => setShowLoginModal(true)} className="icon-btn login-btn" title="Admin Login">
                <i className="fas fa-lock"></i> Admin
              </button>
            )}
          </div>
        </header>

        {showLoginModal && (
          <div className="modal-overlay">
            <div className="modal-content glass card form-card">
              <div className="modal-header">
                <h2>Admin Login</h2>
                <button onClick={() => setShowLoginModal(false)} className="icon-btn"><i className="fas fa-times"></i></button>
              </div>
              <form onSubmit={handleLogin}>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label htmlFor="username">Username</label>
                  <div className="input-wrapper">
                    <i className="fas fa-user input-icon"></i>
                    <input type="text" id="username" value={username} onChange={e => setUsername(e.target.value)} required autoComplete="off" />
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label htmlFor="password">Password</label>
                  <div className="input-wrapper">
                    <i className="fas fa-key input-icon"></i>
                    <input type="password" id="password" value={password} onChange={e => setPassword(e.target.value)} required />
                  </div>
                </div>
                <button type="submit" className="btn primary-btn" style={{ marginTop: '1rem' }}>
                  <i className="fas fa-sign-in-alt"></i> Login
                </button>
              </form>
            </div>
          </div>
        )}

        <main>
          {/* Dashboard */}
          <section className="dashboard">
            <div className="card balance-card glass">
              <div className="card-header">
                <div className="card-title">Remaining Balance</div>
                <i className="fas fa-wallet text-muted"></i>
              </div>
              <div className={`card-value ${percentage >= 80 ? '' : 'highlight'}`} style={{ color: percentage >= 80 ? 'var(--accent-danger)' : '' }}>
                {formatCurrency(remaining)}
              </div>

              <div className="progress-wrapper">
                <div className="progress-labels">
                  <span>{percentage.toFixed(1)}% spent</span>
                  <span>100%</span>
                </div>
                <div className="progress-container">
                  <div className={`progress-bar ${percentage >= 80 ? 'warning' : ''}`} style={{ width: `${percentage}%` }}></div>
                </div>
              </div>
            </div>

            <div className="grid-2">
              <div className="card stat-card glass">
                <div className="icon-box blue">
                  <i className="fas fa-piggy-bank"></i>
                </div>
                <div className="stat-content">
                  <div className="card-title">Total Budget</div>
                  <div className="card-value small">{formatCurrency(INITIAL_BUDGET)}</div>
                </div>
              </div>
              <div className="card stat-card glass">
                <div className="icon-box red">
                  <i className="fas fa-arrow-trend-down"></i>
                </div>
                <div className="stat-content">
                  <div className="card-title">Total Spent</div>
                  <div className="card-value small">{formatCurrency(totalSpent)}</div>
                </div>
              </div>
            </div>
          </section>

          {/* Add Expense Section - Admin Only */}
          {isAdmin && (
            <section className="add-expense-section">
              <div className="section-header">
                <h2>Record Expense</h2>
              </div>
              <form onSubmit={handleAddExpense} className="card form-card glass">
                <div className="form-row">
                  <div className="form-group flex-1">
                    <label htmlFor="expenseDate">Date</label>
                    <div className="input-wrapper">
                      <i className="fas fa-calendar-alt input-icon"></i>
                      <input type="date" id="expenseDate" value={date} onChange={e => setDate(e.target.value)} required />
                    </div>
                  </div>
                  <div className="form-group flex-1">
                    <label htmlFor="expenseAmount">Amount</label>
                    <div className="input-wrapper">
                      <i className="fas fa-rupee-sign input-icon"></i>
                      <input type="number" id="expenseAmount" placeholder="0" min="1" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required />
                    </div>
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="expenseDesc">Description</label>
                  <div className="input-wrapper">
                    <i className="fas fa-tag input-icon"></i>
                    <input type="text" id="expenseDesc" placeholder="e.g., Cement, Paint, Labor..." autoComplete="off" value={desc} onChange={e => setDesc(e.target.value)} required />
                  </div>
                </div>
                <button type="submit" className="btn primary-btn">
                  {editingId ? <><i className="fas fa-save"></i> Update Expense</> : <><i className="fas fa-plus"></i> Add Expense</>}
                </button>
              </form>
            </section>
          )}

          {/* Expense History */}
          <section className="expense-history">
            <div className="section-header flex-between">
              <h2>Daily Expenses</h2>
              <div className="sort-control">
                <select value={sortOrder} onChange={e => setSortOrder(e.target.value)} className="glass-select">
                  <option value="desc">Newest First</option>
                  <option value="asc">Oldest First</option>
                </select>
              </div>
            </div>

            <div className="expense-list">
              {expenses.length === 0 ? (
                <div className="empty-state glass">
                  <div className="empty-icon"><i className="fas fa-receipt"></i></div>
                  <h3>No expenses yet</h3>
                  <p>{isAdmin ? "Add your first house expense above to get started." : "The administrator hasn't added any expenses yet."}</p>
                </div>
              ) : (
                Object.keys(grouped).map(dateKey => (
                  <div key={dateKey} className="day-group">
                    <h3 className="day-header">
                      <span className="day-date">{formatDateLabel(dateKey)}</span>
                      <span className="day-total">Daily Total: {formatCurrency(grouped[dateKey].total)}</span>
                    </h3>
                    <div className="day-items">
                      {grouped[dateKey].items.map(exp => (
                        <div key={exp.id} className="expense-item glass hover-glow">
                          <div className="expense-info">
                            <div className="expense-icon"><i className="fas fa-tools"></i></div>
                            <div className="expense-details">
                              <h4 className="expense-name">{exp.desc}</h4>
                              <span className="expense-time">{exp.timestamp}</span>
                            </div>
                          </div>
                          <div className="expense-actions">
                            <span className="expense-amount">-{formatCurrency(exp.amount)}</span>
                            {isAdmin && (
                              <>
                                <button className="edit-btn" title="Edit Expense" onClick={() => handleEdit(exp.id)}>
                                  <i className="fas fa-edit"></i>
                                </button>
                                <button className="delete-btn" title="Delete Expense" onClick={() => handleDelete(exp.id)}>
                                  <i className="fas fa-trash-alt"></i>
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </main>
      </div>
    </>
  );
}

export default App;
