const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const signature = event.headers['x-razorpay-signature'];
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

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
        const eventType = payload.event;

        let email = null;
        let phone = null;
        let isPaid = false;

        if (eventType === 'subscription.charged') {
            const subscriptionEntity = payload.payload.subscription.entity;
            const paymentEntity = payload.payload.payment.entity;

            email = (subscriptionEntity.notes && subscriptionEntity.notes.email) ||
                (paymentEntity.notes && paymentEntity.notes.email);

            phone = paymentEntity.contact || subscriptionEntity.customer_phone || null;
            isPaid = true;
        } else if (eventType === 'subscription.halted' || eventType === 'subscription.cancelled' || eventType === 'subscription.completed') {
            const subscriptionEntity = payload.payload.subscription.entity;
            email = subscriptionEntity.notes && subscriptionEntity.notes.email;
            isPaid = false;
        } else if (eventType === 'payment.captured' || eventType === 'order.paid') {
            const paymentEntity = payload.payload.payment.entity;
            email = paymentEntity.notes && (paymentEntity.notes.email || paymentEntity.notes.userEmail);
            phone = paymentEntity.contact || null;
            isPaid = true;
        }

        if (email) {
            const updateData = { is_paid: isPaid };

            if (phone) {
                updateData.phone = phone;
            }

            if (isPaid) {
                const now = new Date();
                const renewalDate = new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000); // Add 28 days

                updateData.joined_date = now.toISOString();
                updateData.renewal_date = renewalDate.toISOString();
            }

            await supabase
                .from('users')
                .update(updateData)
                .eq('email', email.toLowerCase());
        }

        return { statusCode: 200, body: JSON.stringify({ status: 'ok' }) };
    } catch (error) {
        console.error('Webhook processing error:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Webhook error' }) };
    }
};