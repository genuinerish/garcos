const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        const { email, name, otp } = JSON.parse(event.body);
        const cleanEmail = email.toLowerCase().trim();

        // 1. Admin Whitelist Bypass for your main email
        const adminEmails = ["genuinerish@gmail.com"];
        if (adminEmails.includes(cleanEmail)) {
            return {
                statusCode: 200,
                body: JSON.stringify({ success: true, hasActiveAccess: true, trialActive: true })
            };
        }

        const now = new Date();

        // 2. Check if user already exists in Supabase
        let { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', cleanEmail)
            .maybeSingle();

        if (error) throw error;

        // === PASTE / PLACE THIS BLOCK HERE ===
        if (!user) {
            // Automatically calculate 25 days from right now
            const trialEndsAt = new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000);

            const { data: newUser, error: createErr } = await supabase
                .from('users')
                .insert([{
                    email: cleanEmail,
                    name: name || '',
                    trial_ends_at: trialEndsAt.toISOString(), // Stored securely in database
                    is_paid: false
                }])
                .select()
                .single();

            if (createErr) throw createErr;
            user = newUser;
        }

        // Backend checks every login to see if current time is still before trial_ends_at
        const trialActive = user.trial_ends_at ? new Date(user.trial_ends_at) > now : false;
        const hasActiveAccess = trialActive || !!user.is_paid;
        // ======================================

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, hasActiveAccess, trialActive })
        };
    } catch (err) {
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
};