const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const signature = event.headers['x-razorpay-signature'];
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET; // Set this in Netlify env vars

        // Optional signature verification for production security
        if (webhookSecret) {
            const expectedSignature = crypto
                .createHmac('sha256', webhookSecret)
                .update(event.body)
                .digest('hex');

            if (expectedSignature !== signature) {
                return { statusCode: 400, body: JSON.stringify({ error: 'Invalid webhook signature' }) };
            }
        }

        const payload = JSON.parse(event.body);

        // Check if the event is a successful payment
        if (payload.event === 'payment.captured' || payload.event === 'order.paid') {
            const paymentEntity = payload.payload.payment.entity;
            const email = paymentEntity.notes ? paymentEntity.notes.userEmail : null;

            if (email) {
                // Update user status to paid in Supabase
                await supabase
                    .from('users')
                    .update({ is_paid: true })
                    .eq('email', email);
            }
        }

        return { statusCode: 200, body: JSON.stringify({ status: 'ok' }) };
    } catch (error) {
        console.error('Webhook processing error:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Webhook error' }) };
    }
};