const Razorpay = require('razorpay');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_SECRET_KEY
});

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        const { email, planType } = JSON.parse(event.body);

        // Map subscription plans to correct amounts in paise (₹1 = 100 paise)
        let amountInPaise = 45900; // Default to Premium Monthly (₹459)
        let planName = 'Premium Monthly Plan';

        if (planType === 'basic') {
            amountInPaise = 39900; // ₹399.00
            planName = 'Basic Plan';
        } else if (planType === 'pro_quarterly') {
            amountInPaise = 129900; // ₹1,299.00
            planName = '3 Months Quarterly Plan';
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