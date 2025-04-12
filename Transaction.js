const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['invoice', 'receipt', 'expense'],
    required: true
  },
  partyName: {
    type: String,
    required: true
  },
  partyGST: String,
  amount: {
    type: Number,
    required: true
  },
  gstRate: {
    type: Number,
    default: 0
  },
  gstAmount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['paid', 'pending'],
    default: 'pending'
  },
  dueDate: Date,
  notes: String,
  business: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema); 