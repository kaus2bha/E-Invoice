const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const auth = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const crypto = require('crypto');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Create payment order
router.post('/create-order', auth, async (req, res) => {
    try {
        const { transactionId } = req.body;
        const transaction = await Transaction.findOne({
            _id: transactionId,
            business: req.user.business
        });

        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        const amount = Math.round((transaction.amount + transaction.gstAmount) * 100); // Convert to paise
        const options = {
            amount,
            currency: 'INR',
            receipt: `rcpt_${transaction._id}`,
            notes: {
                transactionId: transaction._id.toString()
            }
        };

        const order = await razorpay.orders.create(options);
        res.json(order);
    } catch (error) {
        res.status(500).json({ message: 'Error creating payment order' });
    }
});

// Verify payment
router.post('/verify', auth, async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            transactionId
        } = req.body;

        const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
        shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
        const digest = shasum.digest('hex');

        if (digest !== razorpay_signature) {
            return res.status(400).json({ message: 'Invalid payment signature' });
        }

        // Update transaction status
        await Transaction.findByIdAndUpdate(transactionId, {
            status: 'paid',
            paymentDetails: {
                orderId: razorpay_order_id,
                paymentId: razorpay_payment_id,
                signature: razorpay_signature
            }
        });

        res.json({ message: 'Payment verified successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error verifying payment' });
    }
});

module.exports = router; 