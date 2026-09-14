const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        const { email, name, otp } = JSON.parse(event.body);
        const cleanEmail = email.toLowerCase().trim();

        const adminEmails = ["genuinerish@gmail.com"];
        if (adminEmails.includes(cleanEmail)) {
            return {
                statusCode: 200,
                body: JSON.stringify({ success: true, hasActiveAccess: true, is_paid: true })
            };
        }

        let { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', cleanEmail)
            .maybeSingle();

        if (error) throw error;

        if (!user) {
            const { data: newUser, error: createErr } = await supabase
                .from('users')
                .insert([{
                    email: cleanEmail,
                    name: name || '',
                    otp: otp || '',
                    is_paid: false
                }])
                .select()
                .single();

            if (createErr) throw createErr;
            user = newUser;
        }

        const hasActiveAccess = !!user.is_paid;

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                hasActiveAccess: hasActiveAccess,
                is_paid: user.is_paid,
                message: 'Verified successfully'
            })
        };
    } catch (err) {
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
};