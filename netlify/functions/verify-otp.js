const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        const { email, name, otp } = JSON.parse(event.body);
        const cleanEmail = email.toLowerCase().trim();

        // 1. Admin Whitelist Bypass
        const adminEmails = ["genuinerish@gmail.com"];
        if (adminEmails.includes(cleanEmail)) {
            return {
                statusCode: 200,
                body: JSON.stringify({ success: true, hasActiveAccess: true, trialActive: true })
            };
        }

        const now = new Date();
        const nowEpoch = now.getTime();

        let { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', cleanEmail)
            .maybeSingle();

        if (error) throw error;

        if (!user) {
            // 25 Days in milliseconds
            const trialDurationMs = 25 * 24 * 60 * 60 * 1000;
            const trialEndsAtDate = new Date(nowEpoch + trialDurationMs);

            const { data: newUser, error: createErr } = await supabase
                .from('users')
                .insert([{
                    email: cleanEmail,
                    name: name || '',
                    otp: otp || '',
                    trial_start: nowEpoch,
                    trial_ends_at: trialEndsAtDate.toISOString(),
                    is_paid: false
                }])
                .select()
                .single();

            if (createErr) throw createErr;
            user = newUser;
        }

        // Check trial status using trial_ends_at or trial_start fallback
        let trialActive = false;
        if (user.trial_ends_at) {
            trialActive = new Date(user.trial_ends_at) > now;
        } else if (user.trial_start) {
            const twentyFiveDaysMs = 25 * 24 * 60 * 60 * 1000;
            trialActive = (nowEpoch - Number(user.trial_start)) < twentyFiveDaysMs;
        }

        const hasActiveAccess = trialActive || !!user.is_paid;

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, hasActiveAccess, trialActive })
        };
    } catch (err) {
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
};