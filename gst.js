const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');
const PDFDocument = require('pdfkit');
const fs = require('fs');

// Generate GST Report
router.get('/report', auth, async (req, res) => {
    try {
        const { month, year } = req.query;
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        const transactions = await Transaction.find({
            business: req.user.business,
            createdAt: {
                $gte: startDate,
                $lte: endDate
            }
        }).populate('business');

        const report = {
            totalGSTCollected: 0,
            totalGSTPaid: 0,
            inwardSupplies: [],
            outwardSupplies: [],
            summary: {
                gstPayable: 0,
                totalTransactions: transactions.length
            }
        };

        transactions.forEach(t => {
            if (t.type === 'invoice') {
                report.totalGSTCollected += t.gstAmount;
                report.outwardSupplies.push({
                    date: t.createdAt,
                    partyName: t.partyName,
                    partyGST: t.partyGST,
                    amount: t.amount,
                    gstAmount: t.gstAmount
                });
            } else if (t.type === 'expense') {
                report.totalGSTPaid += t.gstAmount;
                report.inwardSupplies.push({
                    date: t.createdAt,
                    partyName: t.partyName,
                    partyGST: t.partyGST,
                    amount: t.amount,
                    gstAmount: t.gstAmount
                });
            }
        });

        report.summary.gstPayable = report.totalGSTCollected - report.totalGSTPaid;
        res.json(report);
    } catch (error) {
        res.status(500).json({ message: 'Error generating GST report' });
    }
});

// Generate PDF Invoice
router.get('/invoice/:id', auth, async (req, res) => {
    try {
        const transaction = await Transaction.findOne({
            _id: req.params.id,
            business: req.user.business
        }).populate('business');

        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        const doc = new PDFDocument();
        const filename = `invoice-${transaction._id}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        doc.pipe(res);

        // Add company logo
        // doc.image('path/to/logo.png', 50, 45, { width: 50 });

        // Add invoice header
        doc.fontSize(20).text('Tax Invoice', 50, 50);
        doc.moveDown();

        // Add business details
        doc.fontSize(12);
        doc.text(`${transaction.business.name}`);
        doc.text(`GSTIN: ${transaction.business.gstNumber}`);
        doc.text(`${transaction.business.address}`);
        doc.moveDown();

        // Add customer details
        doc.text(`Bill To:`);
        doc.text(`${transaction.partyName}`);
        if (transaction.partyGST) {
            doc.text(`GSTIN: ${transaction.partyGST}`);
        }
        doc.moveDown();

        // Add invoice details
        doc.text(`Invoice Date: ${transaction.createdAt.toLocaleDateString()}`);
        doc.text(`Invoice Number: INV-${transaction._id.toString().slice(-6)}`);
        doc.moveDown();

        // Add table header
        const tableTop = 300;
        doc.text('Description', 50, tableTop);
        doc.text('Amount', 200, tableTop);
        doc.text('GST', 300, tableTop);
        doc.text('Total', 400, tableTop);

        // Add table row
        const rowTop = tableTop + 30;
        doc.text('Services/Goods', 50, rowTop);
        doc.text(`₹${transaction.amount.toFixed(2)}`, 200, rowTop);
        doc.text(`₹${transaction.gstAmount.toFixed(2)}`, 300, rowTop);
        doc.text(`₹${(transaction.amount + transaction.gstAmount).toFixed(2)}`, 400, rowTop);

        // Add total
        doc.moveDown(2);
        doc.text(`Total Amount: ₹${(transaction.amount + transaction.gstAmount).toFixed(2)}`, { align: 'right' });

        doc.end();
    } catch (error) {
        res.status(500).json({ message: 'Error generating invoice' });
    }
});

module.exports = router; 