const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
    }
});

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        const { email } = JSON.parse(event.body);
        if (!email || !email.includes('@')) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Valid email is required' }) };
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = Date.now() + 10 * 60 * 1000; // 10 mins expiry

        // Check if user already exists in database
        const { data: existingUser } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (!existingUser) {
            // Create user entry with trial start time
            await supabase.from('users').insert([
                { email, otp, otp_expires: expires, trial_start: Date.now(), is_paid: false }
            ]);
        } else {
            // Update existing user with new OTP
            await supabase
                .from('users')
                .update({ otp, otp_expires: expires })
                .eq('email', email);
        }

        const mailOptions = {
            from: '"Garcos Pro Security" <' + process.env.GMAIL_USER + '>',
            to: email,
            subject: 'Your Garcos Pro Verification OTP',
            text: `Your one-time verification code for Garcos Enterprise Pro is: ${otp}. This code expires in 10 minutes.`
        };

        await transporter.sendMail(mailOptions);

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, message: 'OTP sent successfully to inbox.' })
        };
    } catch (error) {
        console.error('Send OTP error:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to send OTP email.' }) };
    }
};