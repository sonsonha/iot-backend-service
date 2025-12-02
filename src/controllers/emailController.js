require('dotenv').config();
const crypto = require('crypto');
const Transporter = require('../config/email');

const generateVerificationCode = () => {
    return crypto.randomBytes(3).toString('hex');
};

const sendVerificationCode = async (email, subject, text) => {
    const mailOptions = {
        from: process.env.EMAIL,
        to: email,
        subject: subject,
        text: text,
    };
    await Transporter.sendMail(mailOptions);
}

const send_code = async (req, res) => {
    try {
        const { email } = req;
        if (!email) {
            return res.status(400).json({
                error: 'Email is required.',
            });
        }
        const code = generateVerificationCode();
        const subject = 'Verification code';
        const text = `Your verification code is ${code}`;
        await sendVerificationCode(email, subject, text);
        return res.status(200).json({
            code,
        });
    }
    catch (error) {
        return res.status(500).json({
            error: 'Server error',
        });
    }
}

module.exports = {
    send_code,
    // confirm_code,
};