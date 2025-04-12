const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');

router.get('/dashboard', auth, async (req, res) => {
    try {
        const thirtyDaysAgo = new Date(Date.now() - 30*24*60*60*1000);
        const transactions = await Transaction.find({
            business: req.user.business,
            createdAt: { $gte: thirtyDaysAgo }
        });

        const analytics = {
            revenueGrowth: calculateRevenueGrowth(transactions),
            topCustomers: getTopCustomers(transactions),
            cashFlow: analyzeCashFlow(transactions),
            businessHealth: {
                quickRatio: calculateQuickRatio(transactions),
                profitMargin: calculateProfitMargin(transactions),
                averageCollectionPeriod: calculateCollectionPeriod(transactions)
            }
        };

        res.json(analytics);
    } catch (error) {
        res.status(500).json({ message: 'Error generating analytics' });
    }
});

module.exports = router; 