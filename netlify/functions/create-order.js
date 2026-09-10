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
            basic: { amount: 39900, name: 'Garcos Basic Plan', reference: 'plan_basic_monthly' },
            premium: { amount: 45900, name: 'Garcos Premium Plan', reference: 'plan_premium_monthly' },
            pro_quarterly: { amount: 129900, name: 'Garcos Quarterly Plan', reference: 'plan_pro_quarterly' }
        };

        const selectedPlan = planMapping[planType] || planMapping.premium;

        const options = {
            amount: selectedPlan.amount,
            currency: "INR",
            receipt: `rcpt_${Date.now()}_${planType}`,
            notes: {
                email: email,
                planType: planType,
                planName: selectedPlan.name,
                planReference: selectedPlan.reference
            }
        };

        const order = await razorpay.orders.create(options);

        return {
            statusCode: 200,
            body: JSON.stringify({
                id: order.id,
                amount: order.amount,
                currency: order.currency,
                keyId: process.env.RAZORPAY_KEY_ID
            })
        };
    } catch (err) {
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
};