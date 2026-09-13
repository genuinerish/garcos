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
        const { email, planType } = JSON.parse(event.body);

        const planMapping = {
            basic: { name: 'Garcos Basic Plan', reference: 'plan_TbUOSrnylaeScX' },
            premium: { name: 'Garcos Premium Plan', reference: 'plan_TbUOSrnylaeScX' },
            pro_quarterly: { name: 'Garcos Quarterly Plan', reference: 'plan_TbUOSrnylaeScX' }
        };

        const selectedPlan = planMapping[planType] || planMapping.premium;

        // Create a Razorpay Subscription for automated recurring billing
        const subscription = await razorpay.subscriptions.create({
            plan_id: selectedPlan.reference,
            total_count: 12,
            customer_notify: 1,
            notes: {
                email: email,
                planType: planType,
                planName: selectedPlan.name
            },
            callback_url: 'https://garcos.netlify.app/app.html',
            redirect: true
        });

        return {
            statusCode: 200,
            body: JSON.stringify({
                subscription_id: subscription.id,
                short_url: subscription.short_url
            })
        };
    } catch (err) {
        console.error('Subscription creation error:', err);
        return { statusCode: 500, body: JSON.stringify({ error: err.message || 'Failed to create subscription' }) };
    }
};