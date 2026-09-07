const Razorpay = require('razorpay');

const razorpay = new Razorpay({
    key_id: process.env.rzp_live_TZ7bnKHOZNNY1m,
    key_secret: process.env.1FfSFqLtJoDiY7xQRcEcX7XM
});

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        const { email, planType } = JSON.parse(event.body);

        // Map subscription plans to correct amounts in paise (₹1 = 100 paise)
        let amountInPaise = 39900; // Default to Pro Monthly (₹399)
        let planName = 'Pro Monthly Plan';

        if (planType === 'basic') {
            amountInPaise = 36900; // ₹369.00
            planName = 'Basic Plan';
        } else if (planType === 'pro_quarterly') {
            amountInPaise = 229900; // ₹2,299.00
            planName = 'Quarterly Pro Plan';
        }

        const options = {
            amount: amountInPaise,
            currency: "INR",
            receipt: "receipt_" + Date.now(),
            notes: { userEmail: email, plan: planName }
        };

        const order = await razorpay.orders.create(options);

        return {
            statusCode: 200,
            body: JSON.stringify(order)
        };
    } catch (error) {
        console.error('Razorpay order creation error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to create payment order.' })
        };
    }
};