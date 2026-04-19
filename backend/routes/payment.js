const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Utility to get razorpay instance
const getRazorpayInstance = () => {
    return new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID || 'dummy_key',
        key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_secret'
    });
};

// Get the public key
router.get('/key', (req, res) => {
    res.json({ key: process.env.RAZORPAY_KEY_ID || 'dummy_key' });
});

// Create an order
router.post('/create-order', async (req, res) => {
    try {
        const { amount } = req.body;
        
        if (!amount) {
            return res.status(400).json({ error: 'Amount is required' });
        }

        const options = {
            amount: amount, // amount in the smallest currency unit
            currency: 'INR',
            receipt: 'receipt_order_' + Date.now()
        };

        const razorpayInstance = getRazorpayInstance();
        const order = await razorpayInstance.orders.create(options);

        res.json(order);
    } catch (error) {
        console.error('Error creating Razorpay order:', error);
        res.status(500).json({ error: 'Failed to create order' });
    }
});

// Verify payment signature
router.post('/verify-signature', (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const secret = process.env.RAZORPAY_KEY_SECRET || 'dummy_secret';
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    
    const expectedSignature = crypto.createHmac('sha256', secret)
                                    .update(body.toString())
                                    .digest('hex');

    if (expectedSignature === razorpay_signature) {
        res.json({ success: true, message: 'Payment verified successfully' });
    } else {
        res.status(400).json({ success: false, message: 'Invalid signature' });
    }
});

module.exports = router;
