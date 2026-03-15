const INITIAL_BUDGET = 70000;

class ViewerApp {
    constructor() {
        this.expenses = [];
        this.budget = INITIAL_BUDGET;

        // DOM Elements
        this.listEl = document.getElementById('expenseList');

        // Dashboard Stats
        this.balanceEl = document.getElementById('remainingBalance');
        this.budgetEl = document.getElementById('totalBudget');
        this.spentEl = document.getElementById('totalSpent');
        this.progressBar = document.getElementById('budgetProgress');
        this.percentageEl = document.getElementById('spentPercentage');

        // Other Elements
        this.emptyState = document.getElementById('emptyState');
        this.sortOrder = document.getElementById('sortOrder');

        // Login Modal Elements
        this.loginBtn = document.getElementById('loginBtn');
        this.closeLoginBtn = document.getElementById('closeLoginBtn');
        this.loginModal = document.getElementById('loginModal');
        this.loginForm = document.getElementById('loginForm');

        this.init();
    }

    async init() {
        // Event Listeners
        this.sortOrder.addEventListener('change', this.render.bind(this));

        this.loginBtn.addEventListener('click', () => this.loginModal.classList.remove('hidden'));
        this.closeLoginBtn.addEventListener('click', () => this.loginModal.classList.add('hidden'));

        this.loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const user = document.getElementById('username').value;
            const pass = document.getElementById('password').value;

            if (user === 'admin' && pass === 'admin') {
                sessionStorage.setItem('isAdmin', 'true');
                window.location.href = 'admin.html';
            } else {
                alert('Invalid username or password');
            }
        });

        // Auto refresh every 30 seconds
        this.startAutoRefresh();

        // Load data from JSON server
        await this.loadData();

        // Render Initial State
        this.render();
    }

    async loadData() {
        try {
            const res = await fetch('/api/expenses');
            if (res.ok) {
                this.expenses = await res.json();
            } else {
                this.expenses = [];
            }
        } catch (err) {
            console.error('Failed to load expenses', err);
            this.expenses = [];
        }
    }

    startAutoRefresh() {
        setInterval(async () => {
            await this.loadData();
            this.render();
        }, 30000); // 30 seconds
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    }

    formatDateLabel(dateString) {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const isToday = date.toDateString() === today.toDateString();
        const isYesterday = date.toDateString() === yesterday.toDateString();

        const options = { month: 'short', day: 'numeric', year: 'numeric' };

        if (isToday) return `Today, ${date.toLocaleDateString('en-US', options)}`;
        if (isYesterday) return `Yesterday, ${date.toLocaleDateString('en-US', options)}`;

        return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    }

    calculateTotals() {
        return this.expenses.reduce((total, exp) => total + exp.amount, 0);
    }

    updateDashboard() {
        const totalSpent = this.calculateTotals();
        const remaining = this.budget - totalSpent;

        // Update DOM text
        this.budgetEl.textContent = this.formatCurrency(this.budget);
        this.spentEl.textContent = this.formatCurrency(totalSpent);
        this.balanceEl.textContent = this.formatCurrency(remaining);

        // Progress Bar
        let percentage = (totalSpent / this.budget) * 100;
        if (percentage > 100) percentage = 100;

        this.progressBar.style.width = `${percentage}%`;
        this.percentageEl.textContent = `${percentage.toFixed(1)}% spent`;

        // Warning Colors
        if (percentage >= 80) {
            this.progressBar.classList.add('warning');
            this.balanceEl.style.color = 'var(--accent-danger)';
            this.balanceEl.classList.remove('highlight');
        } else {
            this.progressBar.classList.remove('warning');
            this.balanceEl.style.color = '';
            this.balanceEl.classList.add('highlight');
        }
    }

    render() {
        this.updateDashboard();
        this.listEl.innerHTML = '';

        if (this.expenses.length === 0) {
            this.emptyState.classList.remove('hidden');
            return;
        }

        this.emptyState.classList.add('hidden');

        // Sort expenses
        let sortedExpenses = [...this.expenses];
        const order = this.sortOrder.value; // 'desc' or 'asc'

        sortedExpenses.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            if (dateA.getTime() === dateB.getTime()) {
                return order === 'desc' ? b.id - a.id : a.id - b.id; // secondary sort by time added
            }
            return order === 'desc' ? dateB - dateA : dateA - dateB;
        });

        // Group by Date
        const grouped = sortedExpenses.reduce((group, expense) => {
            if (!group[expense.date]) {
                group[expense.date] = {
                    total: 0,
                    items: []
                };
            }
            group[expense.date].items.push(expense);
            group[expense.date].total += expense.amount;
            return group;
        }, {});

        // Render Groups
        const dayTpl = document.getElementById('dayGroupTemplate');
        const itemTpl = document.getElementById('expenseItemTemplate');

        Object.keys(grouped).forEach(dateKey => {
            const groupData = grouped[dateKey];
            const dayFragment = dayTpl.content.cloneNode(true);

            const groupEl = dayFragment.querySelector('.day-group');
            const dayDateEl = dayFragment.querySelector('.day-date');
            const dayTotalEl = dayFragment.querySelector('.day-total');
            const dayItemsEl = dayFragment.querySelector('.day-items');

            dayDateEl.textContent = this.formatDateLabel(dateKey);
            dayTotalEl.textContent = `Daily Total: ${this.formatCurrency(groupData.total)}`;

            // Render Items in group
            groupData.items.forEach(exp => {
                const itemFragment = itemTpl.content.cloneNode(true);
                const itemEl = itemFragment.querySelector('.expense-item');

                itemFragment.querySelector('.expense-name').textContent = exp.desc;
                itemFragment.querySelector('.expense-time').textContent = exp.timestamp;
                itemFragment.querySelector('.expense-amount').textContent = `-${this.formatCurrency(exp.amount)}`;

                dayItemsEl.appendChild(itemFragment);
            });

            this.listEl.appendChild(dayFragment);
        });
    }
}

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    new ViewerApp();
});
