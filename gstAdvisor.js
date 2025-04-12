const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');

router.get('/analysis', auth, async (req, res) => {
    try {
        const transactions = await Transaction.find({
            business: req.user.business,
            createdAt: { $gte: new Date(Date.now() - 30*24*60*60*1000) } // Last 30 days
        });

        const analysis = {
            recommendations: [],
            potentialSavings: 0,
            gstBreakdown: {},
            inputCreditOptimization: [],
            complianceChecks: []
        };

        // Analyze GST rates distribution
        const gstRatesUsed = transactions.reduce((acc, t) => {
            acc[t.gstRate] = (acc[t.gstRate] || 0) + 1;
            return acc;
        }, {});

        // Check for potential input credit optimization
        const expenses = transactions.filter(t => t.type === 'expense');
        const missedInputCredits = expenses.filter(t => !t.partyGST && t.gstAmount > 0);

        // Generate recommendations
        if (missedInputCredits.length > 0) {
            const missedAmount = missedInputCredits.reduce((sum, t) => sum + t.gstAmount, 0);
            analysis.recommendations.push({
                type: 'input_credit',
                message: `You could claim ₹${missedAmount.toFixed(2)} in input credits by collecting GST invoices from ${missedInputCredits.length} vendors`,
                impact: missedAmount,
                priority: 'High'
            });
            analysis.potentialSavings += missedAmount;
        }

        // Check for high-value transactions
        const highValueTxns = transactions.filter(t => t.amount > 50000);
        if (highValueTxns.length > 0) {
            analysis.recommendations.push({
                type: 'documentation',
                message: 'Maintain extra documentation for high-value transactions to ensure compliance',
                transactions: highValueTxns.map(t => ({
                    date: t.createdAt,
                    amount: t.amount,
                    gstAmount: t.gstAmount
                })),
                priority: 'Medium'
            });
        }

        // GST rate optimization suggestions
        Object.entries(gstRatesUsed).forEach(([rate, count]) => {
            if (rate > 18 && count > 5) {
                analysis.recommendations.push({
                    type: 'rate_optimization',
                    message: `Consider product classification review for ${count} items at ${rate}% GST rate`,
                    priority: 'Medium'
                });
            }
        });

        // Compliance checks
        analysis.complianceChecks = [
            {
                check: 'Regular Invoice Filing',
                status: transactions.every(t => t.partyGST || t.amount < 50000) ? 'Good' : 'Needs Attention',
                message: 'Ensure all B2B invoices have GST numbers'
            },
            {
                check: 'Input Credit Documentation',
                status: missedInputCredits.length === 0 ? 'Good' : 'Needs Attention',
                message: 'Maintain proper documentation for input credit claims'
            }
        ];

        // Input credit optimization suggestions
        const vendorWiseExpenses = expenses.reduce((acc, t) => {
            acc[t.partyName] = (acc[t.partyName] || 0) + t.gstAmount;
            return acc;
        }, {});

        analysis.inputCreditOptimization = Object.entries(vendorWiseExpenses)
            .map(([vendor, amount]) => ({
                vendor,
                annualGST: amount * 12, // Projected annual GST
                recommendation: amount * 12 > 50000 ? 
                    'High priority: Register this vendor for GST' : 
                    'Monitor GST payments with this vendor'
            }))
            .filter(item => item.annualGST > 20000);

        res.json(analysis);
    } catch (error) {
        console.error('GST Advisor error:', error);
        res.status(500).json({ message: 'Error generating GST analysis' });
    }
});

module.exports = router; 