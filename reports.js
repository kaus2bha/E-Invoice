const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');

router.get('/report', auth, async (req, res) => {
    try {
        const { period, month, year } = req.query;
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        const transactions = await Transaction.find({
            business: req.user.business,
            type: 'invoice',
            createdAt: {
                $gte: startDate,
                $lte: endDate
            }
        });

        // Calculate summary
        const summary = {
            totalAmount: 0,
            paidAmount: 0,
            pendingAmount: 0,
            totalTransactions: transactions.length
        };

        transactions.forEach(t => {
            const total = t.amount + t.gstAmount;
            summary.totalAmount += total;
            if (t.status === 'paid') {
                summary.paidAmount += total;
            } else {
                summary.pendingAmount += total;
            }
        });

        // Generate trend data based on period
        let trend = [];
        if (period === 'daily') {
            trend = generateDailyTrend(transactions, startDate, endDate);
        } else if (period === 'weekly') {
            trend = generateWeeklyTrend(transactions, startDate, endDate);
        } else {
            trend = generateMonthlyTrend(transactions, startDate, endDate);
        }

        res.json({
            summary,
            trend,
            transactions
        });
    } catch (error) {
        console.error('Report generation error:', error);
        res.status(500).json({ message: 'Error generating sales report' });
    }
});

function generateDailyTrend(transactions, startDate, endDate) {
    const trend = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
        const dayTransactions = transactions.filter(t => 
            t.createdAt.toDateString() === currentDate.toDateString()
        );

        trend.push({
            date: currentDate.toLocaleDateString(),
            amount: dayTransactions.reduce((sum, t) => sum + t.amount + t.gstAmount, 0)
        });

        currentDate.setDate(currentDate.getDate() + 1);
    }

    return trend;
}

function generateWeeklyTrend(transactions, startDate, endDate) {
    const trend = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
        // Get start and end of week
        const weekStart = new Date(currentDate);
        const weekEnd = new Date(currentDate);
        weekEnd.setDate(weekEnd.getDate() + 6);
        if (weekEnd > endDate) {
            weekEnd.setTime(endDate.getTime());
        }

        const weekTransactions = transactions.filter(t => 
            t.createdAt >= weekStart && t.createdAt <= weekEnd
        );

        trend.push({
            date: `${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`,
            amount: weekTransactions.reduce((sum, t) => sum + t.amount + t.gstAmount, 0)
        });

        currentDate.setDate(currentDate.getDate() + 7);
    }

    return trend;
}

function generateMonthlyTrend(transactions, startDate, endDate) {
    const trend = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
        const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

        const monthTransactions = transactions.filter(t => 
            t.createdAt >= monthStart && t.createdAt <= monthEnd
        );

        trend.push({
            date: monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
            amount: monthTransactions.reduce((sum, t) => sum + t.amount + t.gstAmount, 0)
        });

        currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return trend;
}

// Add error handling middleware
router.use((err, req, res, next) => {
    console.error('Reports route error:', err);
    res.status(500).json({ 
        message: 'Error in reports route', 
        error: err.message 
    });
});

module.exports = router; 