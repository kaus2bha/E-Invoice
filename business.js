const express = require('express');
const router = express.Router();
const Business = require('../models/Business');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Create business
router.post('/', auth, async (req, res) => {
    try {
        console.log('Received business data:', req.body); // Debug log
        const { name, gstNumber, address } = req.body;
        
        if (!name || !gstNumber || !address) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Check if business with GST already exists
        const existingBusiness = await Business.findOne({ gstNumber });
        if (existingBusiness) {
            return res.status(400).json({ message: 'Business with this GST number already exists' });
        }

        const business = new Business({
            name,
            gstNumber,
            address,
            owner: req.user._id
        });

        await business.save();
        console.log('Business saved:', business); // Debug log

        // Update user with business reference
        const user = await User.findById(req.user._id);
        user.business = business._id;
        await user.save();
        console.log('User updated with business:', user); // Debug log

        res.status(201).json(business);
    } catch (error) {
        console.error('Business creation error:', error); // Debug log
        res.status(500).json({ message: 'Error creating business', error: error.message });
    }
});

// Get business details
router.get('/', auth, async (req, res) => {
    try {
        const business = await Business.findOne({ owner: req.user._id });
        if (!business) {
            return res.status(404).json({ message: 'Business not found' });
        }
        res.json(business);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching business details' });
    }
});

module.exports = router; 