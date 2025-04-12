const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');

// Get all transactions
router.get('/', auth, async (req, res) => {
  try {
    if (!req.user.business) {
      return res.status(400).json({ message: 'Please set up your business first' });
    }

    const transactions = await Transaction.find({ business: req.user.business })
      .sort({ createdAt: -1 });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching transactions' });
  }
});

// Create new transaction
router.post('/', auth, async (req, res) => {
  try {
    if (!req.user.business) {
      return res.status(400).json({ message: 'Please set up your business first' });
    }

    const transaction = new Transaction({
      ...req.body,
      business: req.user.business,
      gstAmount: (req.body.amount * req.body.gstRate) / 100
    });
    
    await transaction.save();
    res.status(201).json(transaction);
  } catch (error) {
    console.error('Transaction creation error:', error);
    res.status(500).json({ message: 'Error creating transaction' });
  }
});

// Update transaction status
router.patch('/:id', auth, async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndUpdate(
      { _id: req.params.id, business: req.user.business },
      { $set: req.body },
      { new: true }
    );
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    res.json(transaction);
  } catch (error) {
    res.status(500).json({ message: 'Error updating transaction' });
  }
});

module.exports = router; 