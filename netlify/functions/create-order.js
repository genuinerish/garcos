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

        const planMapping = {
            basic: { name: 'Garcos Basic Plan', reference: process.env.RAZORPAY_PLAN_ID || 'plan_TbUOSrnylaeScX' },
            premium: { name: 'Garcos Premium Plan', reference: process.env.RAZORPAY_PLAN_ID || 'plan_TbUOSrnylaeScX' },
            pro_quarterly: { name: 'Garcos Quarterly Plan', reference: process.env.RAZORPAY_PLAN_ID || 'plan_TbUOSrnylaeScX' }
        };

        const selectedPlan = planMapping[planType] || planMapping.pro_quarterly;

        // Create a standard Razorpay Order instead of a Subscription if subscription plans aren't active
        const order = await razorpay.orders.create({
            amount: 49900, // Amount in paise (₹499)
            currency: 'INR',
            receipt: 'rcpt_' + Date.now(),
            notes: {
                email: email,
                planType: planType,
                planName: selectedPlan.name
            }
        });

        // Generate a standard checkout configuration or short url payload
        // Alternatively, if using Razorpay Orders, pass order_id back to frontend to open standard checkout modal
        return {
            statusCode: 200,
            body: JSON.stringify({
                id: order.id,
                amount: order.amount,
                currency: order.currency,
                short_url: `https://api.razorpay.com/v1/checkout/embedded?data=${order.id}` // Fallback or handle via checkout.js modal
            })
        };
    } catch (err) {
        console.error('Order creation error details:', err);
        return { statusCode: 500, body: JSON.stringify({ error: err.message || 'Failed to create order' }) };
    }
};