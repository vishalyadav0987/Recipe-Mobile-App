const nodemailer = require('nodemailer');
const { 
  VERIFICATION_EMAIL_TEMPLATE, 
  WELCOME_EMAIL_TEMPLATE, 
  PASSWORD_RESET_REQUEST_TEMPLATE, 
  PASSWORD_RESET_SUCCESS_TEMPLATE 
} = require('./emailTemplate');

const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.SMTP_EMAIL,  // your gmail
        pass: process.env.SMTP_APP_PASSWORD  // app password (not your Gmail password)
    }
});

// Sender Info
const sender = '"Your App Name" <your_email@gmail.com>';  // same email jo SMTP me use kiya hai

const sendVerificationEmail = async (email, verificationToken) => {
    try {
        const mailOptions = {
            from: sender,
            to: email,
            subject: "Verify your email",
            html: VERIFICATION_EMAIL_TEMPLATE.replace("{verificationCode}", verificationToken)
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("Verification email sent:", info.messageId);
        return info;
    } catch (error) {
        console.error("Error sending verification email", error);
        throw new Error(`Error sending verification email: ${error.message}`);
    }
};

const sendWelcomeEmail = async (email, sendingToName) => {
    try {
        const mailOptions = {
            from: sender,
            to: email,
            subject: "Welcome User",
            html: WELCOME_EMAIL_TEMPLATE.replace("{userName}", sendingToName)
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("Welcome email sent:", info.messageId);
        return info;
    } catch (error) {
        console.error("Error sending welcome email", error);
        throw new Error(`Error sending welcome email: ${error.message}`);
    }
};

const sendForgetPasswordEmail = async (email, resetUrl) => {
    try {
        const mailOptions = {
            from: sender,
            to: email,
            subject: "Reset Password Link",
            html: PASSWORD_RESET_REQUEST_TEMPLATE.replace("{resetURL}", resetUrl)
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("Forget password email sent:", info.messageId);
        return info;
    } catch (error) {
        console.error("Error sending forget password email", error);
        throw new Error(`Error sending forget password email: ${error.message}`);
    }
};

const sendResetPasswordSuccessfullEmail = async (email) => {
    try {
        const mailOptions = {
            from: sender,
            to: email,
            subject: "Password Reset Successfully",
            html: PASSWORD_RESET_SUCCESS_TEMPLATE
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("Password reset success email sent:", info.messageId);
        return info;
    } catch (error) {
        console.error("Error sending reset success email", error);
        throw new Error(`Error sending reset success email: ${error.message}`);
    }
};

module.exports = {
    sendVerificationEmail,
    sendWelcomeEmail,
    sendForgetPasswordEmail,
    sendResetPasswordSuccessfullEmail
};