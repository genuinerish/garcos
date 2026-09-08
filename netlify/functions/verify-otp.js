const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        const { email, otp } = JSON.parse(event.body);

        // Hardcode your admin email here for permanent free access
        const adminEmails = ["your-admin-email@gmail.com"]; // Replace with your actual admin Gmail
        if (adminEmails.includes(email.toLowerCase())) {
            return {
                statusCode: 200,
                body: JSON.stringify({ success: true, hasActiveAccess: true, trialActive: true })
            };
        }

        // Standard user verification logic below...
        let { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        const now = new Date();

        if (!user) {
            const trialEndsAt = new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000);
            const { data: newUser, createErr } = await supabase
                .from('users')
                .insert([{ email: email, trial_ends_at: trialEndsAt.toISOString(), is_paid: false }])
                .select()
                .single();

            if (createErr) throw createErr;
            user = newUser;
        }

        const trialActive = new Date(user.trial_ends_at) > now;
        const hasActiveAccess = trialActive || user.is_paid;

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, hasActiveAccess, trialActive })
        };
    } catch (err) {
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
};