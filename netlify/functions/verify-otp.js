const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        const { email, otp } = JSON.parse(event.body);

        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !user || user.otp !== otp || Date.now() > user.otp_expires) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Invalid or expired OTP code.' }) };
        }

        // Clear OTP after successful check
        await supabase.from('users').update({ otp: null, otp_expires: null }).eq('email', email);

        // 25 Days active trial check (displayed as 45 days on landing page marketing)
        const TWENTY_FIVE_DAYS_MS = 25 * 24 * 60 * 60 * 1000;
        const isTrialActive = !user.is_paid && (Date.now() - user.trial_start < TWENTY_FIVE_DAYS_MS);

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                token: 'garcos_secure_token_' + Buffer.from(email).toString('base64'),
                isPaid: user.is_paid,
                isTrialActive: isTrialActive
            })
        };
    } catch (error) {
        console.error('Verify OTP error:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error.' }) };
    }
};