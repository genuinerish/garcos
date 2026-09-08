const Razorpay = require('razorpay');

const razorpay = new Razorpay({
    key_id: process.env.rzp_live_TZ7bnKHOZNNY1m,
    key_secret: process.env.1FfSFqLtJoDiY7xQRcEcX7XM,
});

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        const { email, planType } = JSON.parse(event.body);

        // Plan-specific pricing mapping (amounts in INR paisa: ₹1 = 100 paisa)
        const planPricing = {
            basic: { amount: 39900, name: 'Basic Plan - Monthly' },
            premium: { amount: 45900, name: 'Premium Monthly Plan' },
            pro_quarterly: { amount: 129900, name: '3 Months Quarterly Plan' }
        };

        const selectedPlan = planPricing[planType] || planPricing.premium;

        const options = {
            amount: selectedPlan.amount,
            currency: "INR",
            receipt: `receipt_${Date.now()}_${email.substring(0, 5)}`,
            notes: { email: email, plan: planType }
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