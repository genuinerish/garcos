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
        const planType = body.planType || 'pro_monthly';

        // Use your verified Razorpay Plan ID for Autopay
        const subscription = await razorpay.subscriptions.create({
            plan_id: 'plan_TbUOSrnylaeScX',
            total_count: 12,
            customer_notify: 1,
            notes: {
                email: email,
                planType: planType,
                planName: 'Garcos Pro Monthly'
            }
        });

        return {
            statusCode: 200,
            body: JSON.stringify({
                id: subscription.id,
                short_url: subscription.short_url,
                key_id: process.env.RAZORPAY_KEY_ID
            })
        };
    } catch (err) {
        console.error('Subscription creation error:', err);
        return { statusCode: 500, body: JSON.stringify({ error: err.message || 'Failed to create subscription' }) };
    }
};