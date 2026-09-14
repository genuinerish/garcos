const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const payload = JSON.parse(event.body);
        console.log("RAZORPAY WEBHOOK PAYLOAD:", JSON.stringify(payload, null, 2));

        const signature = event.headers['x-razorpay-signature'];
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

        if (webhookSecret && signature) {
            const expectedSignature = crypto
                .createHmac('sha256', webhookSecret)
                .update(event.body)
                .digest('hex');

            if (expectedSignature !== signature) {
                console.error("Invalid webhook signature!");
                return { statusCode: 400, body: JSON.stringify({ error: 'Invalid webhook signature' }) };
            }
        }

        const eventType = payload.event;
        const paymentEntity = payload.payload?.payment?.entity || payload.payload?.order?.entity;

        let email = paymentEntity?.notes?.email || paymentEntity?.notes?.userEmail || paymentEntity?.email || paymentEntity?.customer?.email;
        let phone = paymentEntity?.contact || paymentEntity?.customer?.contact;
        let isPaid = (eventType === 'payment.captured' || eventType === 'order.paid' || eventType === 'subscription.charged');

        console.log("Extracted -> Email:", email, "Phone:", phone, "IsPaid:", isPaid);

        if (email) {
            const updateData = { is_paid: isPaid };

            if (phone) {
                updateData.phone = phone;
            }

            if (isPaid) {
                const now = new Date();
                const renewalDate = new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000);

                updateData.joined_date = now.toISOString();
                updateData.renewal_date = renewalDate.toISOString();
            }

            const { error: updateError } = await supabase
                .from('users')
                .update(updateData)
                .eq('email', email.toLowerCase().trim());

            if (updateError) {
                console.error('Supabase update error:', updateError);
            } else {
                console.log('Successfully updated user in Supabase:', email);
            }
        } else {
            console.warn("No email found in webhook payload!");
        }

        return { statusCode: 200, body: JSON.stringify({ status: 'ok' }) };
    } catch (error) {
        console.error('Webhook processing error:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Webhook error' }) };
    }
};