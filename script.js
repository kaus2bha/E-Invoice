// Global variables
let currentUser = null;
let authToken = null;

// Chart variables
let salesTrendChart = null;
let paymentStatusChart = null;
let transactionTypeChart = null;
let monthlyDistributionChart = null;

// Check if user is already logged in
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (token && user) {
        authToken = token;
        currentUser = JSON.parse(user);
        updateUIForLoggedInUser();
        loadTransactions();
    } else {
        showLoginForm();
    }
});

// Authentication Functions
async function login(email, password) {
    try {
        const errorDiv = document.getElementById('loginError');
        errorDiv.classList.add('hidden');
        
        if (!email || !password) {
            errorDiv.textContent = 'Email and password are required';
            errorDiv.classList.remove('hidden');
            return;
        }

        console.log('Attempting login with:', { email });
        
        const response = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Response data:', data);

        if (response.ok) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('token', authToken);
            localStorage.setItem('user', JSON.stringify(currentUser));
            hideLoginForm();
            updateUIForLoggedInUser();
            if (currentUser.business) {
                loadTransactions();
            }
        } else {
            errorDiv.textContent = data.message || 'Login failed';
            errorDiv.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Login error:', error);
        const errorDiv = document.getElementById('loginError');
        errorDiv.textContent = 'Error connecting to server. Please check if the server is running.';
        errorDiv.classList.remove('hidden');
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    authToken = null;
    currentUser = null;
    location.reload();
}

// Business Setup Functions
async function saveBusinessDetails(event) {
    event.preventDefault();
    try {
        const businessData = {
            name: document.getElementById('businessName').value,
            gstNumber: document.getElementById('gstNumber').value,
            address: document.getElementById('businessAddress').value
        };

        console.log('Sending business data:', businessData); // Debug log
        console.log('Auth token:', authToken); // Debug log

        const response = await fetch('http://localhost:3000/api/business', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
                'Accept': 'application/json'
            },
            body: JSON.stringify(businessData)
        });

        console.log('Response status:', response.status); // Debug log
        const data = await response.json();
        console.log('Response data:', data); // Debug log

        if (response.ok) {
            currentUser.business = data._id;
            localStorage.setItem('user', JSON.stringify(currentUser));
            hideBusinessSetupModal();
            loadTransactions();
            alert('Business details saved successfully!');
        } else {
            alert(data.message || 'Error saving business details');
        }
    } catch (error) {
        console.error('Business setup error:', error);
        alert('Error connecting to server. Please check if the server is running.');
    }
}

// Transaction Functions
async function loadTransactions() {
    try {
        const response = await fetch('http://localhost:3000/api/transactions', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        const transactions = await response.json();
        updateTransactionTable(transactions);
        updateDashboardStats(transactions);
    } catch (error) {
        alert('Error loading transactions');
    }
}

async function saveTransaction(event) {
    event.preventDefault();
    const form = document.getElementById('transactionForm');
    const transactionData = {
        type: currentModalType,
        partyName: form.partyName.value,
        partyGST: form.partyGST.value,
        amount: parseFloat(form.amount.value),
        gstRate: parseFloat(form.gstRate.value),
        dueDate: form.dueDate.value,
        notes: form.notes.value
    };

    try {
        const response = await fetch('http://localhost:3000/api/transactions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(transactionData)
        });
        
        if (response.ok) {
            hideModal();
            loadTransactions();
        } else {
            const data = await response.json();
            alert(data.message);
        }
    } catch (error) {
        alert('Error saving transaction');
    }
}

async function updateTransactionStatus(id, status) {
    try {
        const response = await fetch(`http://localhost:3000/api/transactions/${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ status })
        });
        
        if (response.ok) {
            loadTransactions();
        } else {
            const data = await response.json();
            alert(data.message);
        }
    } catch (error) {
        alert('Error updating transaction');
    }
}

// UI Update Functions
function updateTransactionTable(transactions) {
    const tbody = document.getElementById('transactionsList');
    tbody.innerHTML = '';
    
    transactions.forEach(transaction => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-6 py-4">${new Date(transaction.createdAt).toLocaleDateString()}</td>
            <td class="px-6 py-4">${transaction.type}</td>
            <td class="px-6 py-4">${transaction.partyName}</td>
            <td class="px-6 py-4">₹${transaction.amount.toFixed(2)}</td>
            <td class="px-6 py-4">₹${transaction.gstAmount.toFixed(2)}</td>
            <td class="px-6 py-4">
                <span class="px-2 py-1 rounded ${transaction.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
                    ${transaction.status}
                </span>
            </td>
            <td class="px-6 py-4 space-x-2">
                ${transaction.type === 'invoice' ? 
                    `<button onclick="downloadInvoice('${transaction._id}')" 
                        class="text-blue-600 hover:text-blue-900">
                        <i class="bi bi-download"></i> Invoice
                    </button>` : 
                    ''
                }
                ${transaction.status === 'pending' ? 
                    `<button onclick="updateTransactionStatus('${transaction._id}', 'paid')" 
                        class="text-green-600 hover:text-green-900">
                        <i class="bi bi-check-circle"></i> Mark as Paid
                    </button>` : 
                    ''
                }
            </td>
        `;
        tbody.appendChild(row);
    });
}

function updateDashboardStats(transactions) {
    let totalRevenue = 0;
    let outstandingAmount = 0;
    let totalGST = 0;
    let totalExpenses = 0;

    transactions.forEach(t => {
        if (t.type === 'invoice') {
            totalRevenue += t.amount;
            if (t.status === 'pending') {
                outstandingAmount += t.amount;
            }
            totalGST += t.gstAmount;
        } else if (t.type === 'expense') {
            totalExpenses += t.amount;
        }
    });

    document.getElementById('totalRevenue').textContent = `₹${totalRevenue.toFixed(2)}`;
    document.getElementById('outstandingAmount').textContent = `₹${outstandingAmount.toFixed(2)}`;
    document.getElementById('gstPayable').textContent = `₹${totalGST.toFixed(2)}`;
    document.getElementById('totalExpenses').textContent = `₹${totalExpenses.toFixed(2)}`;
}

// Modal Functions
let currentModalType = null;

function showModal(type) {
    currentModalType = type;
    document.getElementById('modalTitle').textContent = `New ${type.charAt(0).toUpperCase() + type.slice(1)}`;
    document.getElementById('transactionModal').classList.remove('hidden');
    document.getElementById('transactionForm').reset();
}

function hideModal() {
    document.getElementById('transactionModal').classList.add('hidden');
    currentModalType = null;
}

function showBusinessSetup() {
    document.getElementById('businessSetupModal').classList.remove('hidden');
}

function hideBusinessSetupModal() {
    document.getElementById('businessSetupModal').classList.add('hidden');
}

// Event Listeners
document.getElementById('businessSetupForm').addEventListener('submit', saveBusinessDetails);
document.getElementById('transactionForm').addEventListener('submit', saveTransaction);

// Theme Toggle
document.getElementById('toggleTheme').addEventListener('click', () => {
    document.body.classList.toggle('dark');
    const icon = document.querySelector('#toggleTheme i');
    icon.classList.toggle('bi-moon-stars');
    icon.classList.toggle('bi-sun');
});

// User Menu Toggle
function toggleUserMenu() {
    document.getElementById('userDropdown').classList.toggle('hidden');
}

// Search and Filter
document.getElementById('searchTransaction').addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const rows = document.querySelectorAll('#transactionsList tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
});

document.getElementById('filterStatus').addEventListener('change', (e) => {
    const status = e.target.value;
    const rows = document.querySelectorAll('#transactionsList tr');
    
    rows.forEach(row => {
        if (status === 'all') {
            row.style.display = '';
        } else {
            const rowStatus = row.querySelector('td:nth-child(6)').textContent.trim().toLowerCase();
            row.style.display = rowStatus === status ? '' : 'none';
        }
    });
});

function updateUIForLoggedInUser() {
    document.getElementById('userName').textContent = currentUser.name;
    
    // Check if user has business setup
    if (!currentUser.business) {
        showBusinessSetup();
    }
}

// Add this with the other UI functions
function showLoginForm() {
    hideRegisterForm();
    document.getElementById('loginForm').classList.remove('hidden');
}

function hideLoginForm() {
    document.getElementById('loginForm').classList.add('hidden');
}

// Add these functions with the other UI functions
function showRegisterForm() {
    hideLoginForm();
    document.getElementById('registerForm').classList.remove('hidden');
}

function hideRegisterForm() {
    document.getElementById('registerForm').classList.add('hidden');
}

// Add registration function
async function register() {
    try {
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;

        const response = await fetch('http://localhost:3000/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();
        if (response.ok) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('token', authToken);
            localStorage.setItem('user', JSON.stringify(currentUser));
            hideRegisterForm();
            updateUIForLoggedInUser();
        } else {
            alert(data.message);
        }
    } catch (error) {
        alert('Error registering user');
    }
}

// Add these functions to script.js

async function downloadInvoice(transactionId) {
    try {
        const response = await fetch(`http://localhost:3000/api/gst/invoice/${transactionId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (!response.ok) throw new Error('Error generating invoice');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${transactionId}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    } catch (error) {
        alert('Error downloading invoice');
        console.error(error);
    }
}

// GST Report Functions
function showGSTReport() {
    document.getElementById('gstReportModal').classList.remove('hidden');
}

function hideGSTReport() {
    document.getElementById('gstReportModal').classList.add('hidden');
}

async function generateGSTReport() {
    try {
        const monthInput = document.getElementById('gstReportMonth').value;
        if (!monthInput) {
            alert('Please select a month');
            return;
        }

        const [year, month] = monthInput.split('-');
        const response = await fetch(`http://localhost:3000/api/gst/report?month=${month}&year=${year}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const report = await response.json();
        if (!response.ok) throw new Error(report.message);

        // Update summary
        document.getElementById('totalGSTCollected').textContent = `₹${report.totalGSTCollected.toFixed(2)}`;
        document.getElementById('totalGSTPaid').textContent = `₹${report.totalGSTPaid.toFixed(2)}`;
        document.getElementById('netGSTPayable').textContent = `₹${report.summary.gstPayable.toFixed(2)}`;
        document.getElementById('totalTransactions').textContent = report.summary.totalTransactions;

        // Update tables
        updateSuppliesTable('outwardSuppliesTable', report.outwardSupplies);
        updateSuppliesTable('inwardSuppliesTable', report.inwardSupplies);
    } catch (error) {
        alert('Error generating GST report');
        console.error(error);
    }
}

function updateSuppliesTable(tableId, supplies) {
    const tbody = document.querySelector(`#${tableId} tbody`);
    tbody.innerHTML = '';

    supplies.forEach(supply => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-6 py-4">${new Date(supply.date).toLocaleDateString()}</td>
            <td class="px-6 py-4">${supply.partyName}</td>
            <td class="px-6 py-4">${supply.partyGST || '-'}</td>
            <td class="px-6 py-4">₹${supply.amount.toFixed(2)}</td>
            <td class="px-6 py-4">₹${supply.gstAmount.toFixed(2)}</td>
        `;
        tbody.appendChild(row);
    });
}

function showSalesReport() {
    // Set default month to current month
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    document.getElementById('reportMonth').value = `${year}-${month.toString().padStart(2, '0')}`;
    
    document.getElementById('salesReportModal').classList.remove('hidden');
    generateSalesReport();
}

function hideSalesReport() {
    document.getElementById('salesReportModal').classList.add('hidden');
}

async function generateSalesReport() {
    try {
        const period = document.getElementById('reportPeriod').value;
        const monthInput = document.getElementById('reportMonth').value;
        if (!monthInput) {
            alert('Please select a month');
            return;
        }

        const [year, month] = monthInput.split('-');
        console.log('Generating report for:', { period, month, year }); // Debug log

        const response = await fetch(
            `http://localhost:3000/api/reports/report?period=${period}&month=${month}&year=${year}`,
            {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            }
        );

        console.log('Response status:', response.status); // Debug log
        const data = await response.json();
        console.log('Report data:', data); // Debug log

        if (!response.ok) throw new Error(data.message);

        updateSalesCharts(data);
        updateSalesSummary(data.summary);
    } catch (error) {
        console.error('Error generating sales report:', error);
        alert('Error generating sales report: ' + error.message);
    }
}

function updateSalesCharts(data) {
    // Sales Trend Bar Chart
    if (salesTrendChart) {
        salesTrendChart.destroy();
    }

    const ctx = document.getElementById('salesTrendChart').getContext('2d');
    salesTrendChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.trend.map(item => item.date),
            datasets: [{
                label: 'Sales Amount',
                data: data.trend.map(item => item.amount),
                backgroundColor: 'rgba(59, 130, 246, 0.8)',
                borderColor: 'rgb(59, 130, 246)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `₹${context.raw.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '₹' + value.toFixed(2);
                        }
                    }
                }
            }
        }
    });

    // Payment Status Pie Chart
    if (paymentStatusChart) {
        paymentStatusChart.destroy();
    }

    const ctx2 = document.getElementById('paymentStatusChart').getContext('2d');
    paymentStatusChart = new Chart(ctx2, {
        type: 'pie',
        data: {
            labels: ['Paid', 'Pending'],
            datasets: [{
                data: [data.summary.paidAmount, data.summary.pendingAmount],
                backgroundColor: [
                    'rgba(34, 197, 94, 0.8)',
                    'rgba(234, 179, 8, 0.8)'
                ],
                borderColor: [
                    'rgb(34, 197, 94)',
                    'rgb(234, 179, 8)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            const total = data.summary.totalAmount;
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${context.label}: ₹${value.toFixed(2)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });

    // Transaction Type Distribution Pie Chart
    if (transactionTypeChart) {
        transactionTypeChart.destroy();
    }

    const typeData = calculateTransactionTypeDistribution(data.transactions);
    const ctx3 = document.getElementById('transactionTypeChart').getContext('2d');
    transactionTypeChart = new Chart(ctx3, {
        type: 'pie',
        data: {
            labels: Object.keys(typeData),
            datasets: [{
                data: Object.values(typeData),
                backgroundColor: [
                    'rgba(59, 130, 246, 0.8)',  // Blue
                    'rgba(34, 197, 94, 0.8)',   // Green
                    'rgba(234, 179, 8, 0.8)'    // Yellow
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            const total = Object.values(typeData).reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${context.label}: ₹${value.toFixed(2)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });

    // Monthly Distribution Pie Chart
    if (monthlyDistributionChart) {
        monthlyDistributionChart.destroy();
    }

    const monthlyData = calculateMonthlyDistribution(data.trend);
    const ctx4 = document.getElementById('monthlyDistributionChart').getContext('2d');
    monthlyDistributionChart = new Chart(ctx4, {
        type: 'pie',
        data: {
            labels: Object.keys(monthlyData),
            datasets: [{
                data: Object.values(monthlyData),
                backgroundColor: [
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(34, 197, 94, 0.8)',
                    'rgba(234, 179, 8, 0.8)',
                    'rgba(236, 72, 153, 0.8)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            const total = Object.values(monthlyData).reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${context.label}: ₹${value.toFixed(2)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Helper functions for data processing
function calculateTransactionTypeDistribution(transactions) {
    return transactions.reduce((acc, t) => {
        acc[t.type] = (acc[t.type] || 0) + t.amount;
        return acc;
    }, {});
}

function calculateMonthlyDistribution(trend) {
    return trend.reduce((acc, t) => {
        const month = new Date(t.date).toLocaleString('default', { month: 'long' });
        acc[month] = (acc[month] || 0) + t.amount;
        return acc;
    }, {});
}

function updateSalesSummary(summary) {
    document.getElementById('totalSales').textContent = `₹${summary.totalAmount.toFixed(2)}`;
    document.getElementById('receivedAmount').textContent = `₹${summary.paidAmount.toFixed(2)}`;
    document.getElementById('pendingAmount').textContent = `₹${summary.pendingAmount.toFixed(2)}`;
    document.getElementById('totalTransactionsCount').textContent = summary.totalTransactions;
}

function showGSTAdvisor() {
    document.getElementById('gstAdvisorModal').classList.remove('hidden');
    generateGSTAdvice();
}

function hideGSTAdvisor() {
    document.getElementById('gstAdvisorModal').classList.add('hidden');
}

async function generateGSTAdvice() {
    try {
        const response = await fetch('http://localhost:3000/api/gst-advisor/analysis', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message);

        // Update recommendations
        const recommendationsDiv = document.getElementById('gstRecommendations');
        recommendationsDiv.innerHTML = data.recommendations.map(rec => `
            <div class="p-4 ${rec.priority === 'High' ? 'bg-red-50' : 'bg-yellow-50'} rounded-lg">
                <div class="flex items-start">
                    <div class="flex-shrink-0">
                        <i class="bi ${rec.priority === 'High' ? 'bi-exclamation-triangle text-red-500' : 'bi-info-circle text-yellow-500'}"></i>
                    </div>
                    <div class="ml-3">
                        <h3 class="text-sm font-medium ${rec.priority === 'High' ? 'text-red-800' : 'text-yellow-800'}">${rec.type.replace('_', ' ').toUpperCase()}</h3>
                        <div class="mt-2 text-sm ${rec.priority === 'High' ? 'text-red-700' : 'text-yellow-700'}">
                            <p>${rec.message}</p>
                            ${rec.impact ? `<p class="mt-1 font-semibold">Potential Impact: ₹${rec.impact.toFixed(2)}</p>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        // Update potential savings
        document.getElementById('potentialSavings').textContent = `₹${data.potentialSavings.toFixed(2)}`;

        // Update compliance checks
        const complianceDiv = document.getElementById('complianceChecks');
        complianceDiv.innerHTML = data.complianceChecks.map(check => `
            <div class="flex items-center justify-between p-2 border-b">
                <span>${check.check}</span>
                <span class="px-2 py-1 rounded ${check.status === 'Good' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
                    ${check.status}
                </span>
            </div>
        `).join('');

        // Update input credit optimization
        const inputCreditDiv = document.getElementById('inputCreditOptimization');
        inputCreditDiv.innerHTML = data.inputCreditOptimization.map(item => `
            <div class="p-3 border rounded-lg">
                <div class="flex justify-between items-center">
                    <span class="font-medium">${item.vendor}</span>
                    <span class="text-gray-600">Annual GST: ₹${item.annualGST.toFixed(2)}</span>
                </div>
                <p class="text-sm text-gray-600 mt-1">${item.recommendation}</p>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error generating GST advice:', error);
        alert('Error generating GST optimization advice');
    }
}