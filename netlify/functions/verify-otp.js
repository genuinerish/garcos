const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        const { email, name, otp } = JSON.parse(event.body);
        const cleanEmail = email.toLowerCase().trim();

        // 1. Admin Whitelist Bypass (Put your exact admin email here)
        const adminEmails = ["genuinerish@gmail.com"];
        if (adminEmails.includes(cleanEmail)) {
            return {
                statusCode: 200,
                body: JSON.stringify({ success: true, hasActiveAccess: true, trialActive: true })
            };
        }

        const now = new Date();

        // 2. Check if user exists
        let { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', cleanEmail)
            .maybeSingle();

        if (error) throw error;

        if (!user) {
            // New user: grant 25-day trial
            const trialEndsAt = new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000);
            const { data: newUser, error: createErr } = await supabase
                .from('users')
                .insert([{
                    email: cleanEmail,
                    name: name || '',
                    trial_ends_at: trialEndsAt.toISOString(),
                    is_paid: false
                }])
                .select()
                .single();

            if (createErr) throw createErr;
            user = newUser;
        } else {
            // Existing user safety check: If trial expired and they aren't paid, give them a fresh trial reset or let them pay.
            // (Optional safeguard: you can also manually update users in Supabase to is_paid = true)
        }

        const trialActive = user.trial_ends_at ? new Date(user.trial_ends_at) > now : false;
        const hasActiveAccess = trialActive || !!user.is_paid;

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, hasActiveAccess, trialActive })
        };
    } catch (err) {
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
};