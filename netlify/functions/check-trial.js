const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const TRIAL_DURATION_DAYS = 28;

exports.handler = async function (event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        const { email } = JSON.parse(event.body);

        if (!email || !email.includes('@')) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Valid email is required.' }) };
        }

        const normalizedEmail = email.trim().toLowerCase();
        const now = new Date();

        // 1. Look up the email in the single 'users' table
        let { data: user, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('email', normalizedEmail)
            .single();

        // 2. If user does not exist at all, create a new 28-day trial record
        if (!user || fetchError) {
            const trialStart = now;
            const trialExpiry = new Date(now.getTime() + (TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000));

            const { data: newUser, error: insertError } = await supabase
                .from('users')
                .insert([
                    {
                        email: normalizedEmail,
                        is_paid: false,
                        plan: 'trial',
                        trial_started_at: trialStart.toISOString(),
                        trial_expires_at: trialExpiry.toISOString(),
                        created_at: now.toISOString()
                    }
                ])
                .select()
                .single();

            if (insertError) {
                return {
                    statusCode: 200,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        status: 'active',
                        redirect: 'trial-app.html',
                        expiresAt: trialExpiry.toISOString()
                    })
                };
            }

            user = newUser;
        }

        // 3. If user is a paid subscriber -> Send to main calculation suite
        if (user.is_paid || user.plan === 'pro_monthly' || user.plan === 'lifetime_admin') {
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: 'paid',
                    redirect: 'app.html'
                })
            };
        }

        // 4. If user is on a trial, evaluate their 28-day expiration balance
        const trialStart = user.trial_started_at ? new Date(user.trial_started_at) : new Date(user.created_at);
        const trialExpiry = user.trial_expires_at ? new Date(user.trial_expires_at) : new Date(trialStart.getTime() + (TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000));

        if (now <= trialExpiry) {
            // Trial is still active
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: 'active',
                    redirect: 'trial-app.html',
                    expiresAt: trialExpiry.toISOString()
                })
            };
        } else {
            // Trial has expired (> 28 days) -> Redirect to payment/subscription plan
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: 'expired',
                    redirect: 'paymentplan.html',
                    error: 'Your 28-day free trial has expired. Please upgrade to continue.'
                })
            };
        }

    } catch (err) {
        console.error('Check-trial function error:', err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Server error processing trial validation.' })
        };
    }
};