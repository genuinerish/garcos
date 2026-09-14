const Razorpay = require('razorpay');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_SECRET_KEY,
});

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const email = body.email || 'customer@garcos.app';
        const planType = body.planType || 'pro_quarterly';

        const order = await razorpay.orders.create({
            amount: 49900, // ₹499 in paise
            currency: 'INR',
            receipt: 'rcpt_' + Date.now(),
            notes: {
                email: email,
                planType: planType,
                planName: 'Garcos Pro Quarterly Plan'
            }
        });

        return {
            statusCode: 200,
            body: JSON.stringify({
                id: order.id,
                amount: order.amount,
                currency: order.currency,
                key_id: process.env.RAZORPAY_KEY_ID
            })
        };
    } catch (err) {
        console.error('Order creation error:', err);
        return { statusCode: 500, body: JSON.stringify({ error: err.message || 'Failed to create order' }) };
    }
};