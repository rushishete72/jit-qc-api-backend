// src/utils/emailService.js (FINAL HARDCODED VERSION - CONFIRMED)

const nodemailer = require('nodemailer');
const config = require('../config/index'); // Assuming config is needed for other utilities
const { APIError } = require('./errorHandler'); 

// ✅ हार्डकोड किए गए क्रेडेंशियल्स
const HARDCODED_EMAIL = 'rushishete72@gmail.com'; 
const HARDCODED_PASSWORD = 'jfyyltmhqkhqajky'; 
const HARDCODED_SENDER_NAME = 'JIT/QC System Admin'; 
const HARDCODED_HOST = 'smtp.gmail.com';
const HARDCODED_PORT = 587;

let transporter;

// -----------------------------------------------------------------
// A. Transporter Initialization
// -----------------------------------------------------------------

const initializeTransporter = () => {
    return new Promise((resolve) => {
        console.log('✅ Nodemailer using Hardcoded Gmail SMTP.');
        
        const gmailTransporter = nodemailer.createTransport({
            host: HARDCODED_HOST, 
            port: HARDCODED_PORT, 
            secure: false, 
            auth: {
                user: HARDCODED_EMAIL,
                pass: HARDCODED_PASSWORD, 
            },
            requireTLS: true, 
            family: 4, 
        });

        resolve(gmailTransporter);
    });
};

// -----------------------------------------------------------------
// B. Generic Email Sender (FIXED to map content keys)
// -----------------------------------------------------------------

// NOTE: sendEmail अब htmlContent और textContent को लेता है।
const sendEmail = async ({ to, subject, htmlContent, textContent }) => {
    if (!transporter) {
        console.warn('⚠️ WARN: Transporter is not set. Skipping email dispatch.');
        return true; 
    }
    
    try {
        const mailOptions = {
            from: `"${HARDCODED_SENDER_NAME}" <${HARDCODED_EMAIL}>`, 
            to,
            subject,
            // ⭐ FIX 1: Nodemailer expects 'html' and 'text' keys
            html: htmlContent, 
            text: textContent
        };

        console.log('📧 Sending Email:', {
            from: mailOptions.from, 
            to: mailOptions.to, 
            subject: mailOptions.subject,
            // Show that content exists, not the whole string
            html: mailOptions.html ? '... (HTML content) ...' : undefined, 
            text: mailOptions.text ? '... (Text content) ...' : undefined,
        });

        const info = await transporter.sendMail(mailOptions);
        
        console.log("✉️ Message sent successfully to:", to);
        return true;
        
    } catch (error) {
        console.error('❌ Failed to send email to:', to, 'Error:', error.message);
        throw new APIError(`Email delivery failed for ${to}. Nodemailer error: ${error.message}`, 500); 
    }
};

// -----------------------------------------------------------------
// C. Specific Email Functions
// -----------------------------------------------------------------

/**
 * 1. एडमिन को सूचित करना 
 */
const sendRegistrationRequestToAdmin = (requestDetails) => {
    const adminEmail = 'rushishete4@outlook.com'; 
    const subject = `[ACTION REQUIRED] New User Registration Request: ${requestDetails.fullName}`; 
    
    const htmlContent = `
        <div style="font-family: sans-serif; line-height: 1.6;">
            <h2>New User Registration Request Awaiting Approval</h2>
            <p>A new user registration request has been submitted by <strong>${requestDetails.fullName}</strong> (${requestDetails.email}).</p>
            <p><strong>Justification:</strong> ${requestDetails.justificationMessage}</p>
            <p>Please log into the admin panel to review and approve/reject this request.</p>
        </div>
    `;

    return sendEmail({
        to: adminEmail,
        subject,
        htmlContent,
        textContent: `New registration request from ${requestDetails.fullName}. Justification: ${requestDetails.justificationMessage}. Please review.`
    });
};


/**
 * 2. उपयोगकर्ता को सूचित करना (Request is PENDING Admin Review)
 */
const sendRegistrationConfirmationToUser = (requestDetails) => {
    const userEmail = requestDetails.email; 
    const subject = `[ACTION REQUIRED] Your JIT/QC Registration Request is Pending`; 
    
    const htmlContent = `
        <div style="font-family: sans-serif; line-height: 1.6;">
            <h2>Registration Request Received</h2>
            <p>Dear ${requestDetails.fullName},</p>
            <p>Thank you for verifying your email. Your registration request has been successfully submitted and is now <strong>Pending Administrator Approval</strong>.</p>
            <p>We will notify you again once the administrator reviews and processes your request.</p>
            <p style="color: #888; font-size: 12px;">Reference ID: ${requestDetails.requestId}</p>
        </div>
    `;

    return sendEmail({
        to: userEmail,
        subject,
        htmlContent,
        textContent: `Your registration request for JIT/QC system has been received. Status: Pending approval.`
    });
};


/**
 * 3. उपयोगकर्ता को सूचित करना (Account Approved)
 */
async function sendApprovalConfirmationToUser({ email, fullName }) {
    const subject = `✅ Your JIT/QC Registration has been Approved!`;
    const htmlContent = `
        <div style="font-family: sans-serif; line-height: 1.6;">
            <h2>Account Approved</h2>
            <p>Dear ${fullName},</p>
            <p>Your registration request for the JIT/QC system has been **APPROVED** by the administrator. You can now log in using your registered email and password.</p>
            <p style="margin-top: 20px;">
                <a href="[LOGIN_URL]" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to Login</a>
            </p>
            <p>Welcome aboard!</p>
        </div>
    `;
    
    // ⭐ FIX: Passing htmlContent and textContent
    return sendEmail({ 
        to: email, 
        subject, 
        htmlContent: htmlContent, 
        textContent: `Your account has been approved. You can now log in.` 
    });
}


/**
 * 4. OTP वेरिफिकेशन ईमेल भेजता है। (Registration)
 * @param {string} email - प्राप्तकर्ता का ईमेल।
 * @param {string} fullName - प्राप्तकर्ता का पूरा नाम।
 * @param {string} otpCode - 6-डिजिट का OTP कोड।
 */
async function sendOtpVerificationEmail({ email, fullName, otpCode }) {
    const subject = `🔐 [ACTION REQUIRED] Verify Your Email Address (OTP: ${otpCode})`;

    const htmlContent = `
        <div style="font-family: sans-serif; line-height: 1.6; border: 1px solid #ddd; padding: 20px; max-width: 600px; margin: auto;">
            <h2 style="color: #007bff;">Email Verification Required</h2>
            <p>Dear ${fullName},</p>
            <p>Thank you for registering for the JIT/QC Portal. To ensure that your email address is correct, please use the <strong>One-Time Password (OTP)</strong> below to complete the first stage of your registration.</p>
            
            <div style="text-align: center; margin: 30px 0; padding: 15px; background-color: #f0f8ff; border: 1px dashed #007bff; border-radius: 5px;">
                <p style="font-size: 18px; color: #555; margin-bottom: 5px;">Your Verification Code is:</p>
                <p style="font-size: 32px; font-weight: bold; color: #333; letter-spacing: 5px; margin-top: 5px;">${otpCode}</p>
            </div>
            
            <p>This code is valid for <strong>5 minutes</strong>. Please return to the application to enter the code.</p>
            <p style="font-size: 12px; color: #888;">If you did not initiate this request, please ignore this email. Your password will remain safe.</p>
            
            <hr style="margin-top: 25px;">
            <p style="font-size: 12px; text-align: center; color: #888;">JIT/QC System Administration</p>
        </div>
    `;

    const textContent = `
        JIT/QC System: Email Verification

        Dear ${fullName},

        Your One-Time Password (OTP) for registration is: ${otpCode}

        This code is valid for 5 minutes. Please enter it in the verification screen to proceed.

        If you did not request this, please ignore this email.
    `;

    // ⭐ FIX 2: Correctly passing htmlContent and textContent
    return sendEmail({ 
        to: email, 
        subject, 
        htmlContent: htmlContent, // Correct Key
        textContent: textContent  // Correct Key
    });
}

// ⭐ NEW: OTP Login Email
/**
 * 5. OTP Login ईमेल भेजता है।
 * @param {string} email - प्राप्तकर्ता का ईमेल।
 * @param {string} fullName - प्राप्तकर्ता का पूरा नाम।
 * @param {string} otpCode - 6-डिजिट का OTP कोड।
 */
async function sendOtpLoginEmail({ email, fullName, otpCode }) {
    const subject = `🔑 Your JIT/QC Login Code (OTP: ${otpCode})`;

    const htmlContent = `
        <div style="font-family: sans-serif; line-height: 1.6; border: 1px solid #ddd; padding: 20px; max-width: 600px; margin: auto;">
            <h2 style="color: #007bff;">One-Time Login Code</h2>
            <p>Dear ${fullName},</p>
            <p>You recently requested to log in to the JIT/QC Portal without a password. Please use the <strong>One-Time Password (OTP)</strong> below to proceed with your login.</p>
            
            <div style="text-align: center; margin: 30px 0; padding: 15px; background-color: #fff3e0; border: 1px dashed #ff9800; border-radius: 5px;">
                <p style="font-size: 18px; color: #555; margin-bottom: 5px;">Your Login Code is:</p>
                <p style="font-size: 32px; font-weight: bold; color: #333; letter-spacing: 5px; margin-top: 5px;">${otpCode}</p>
            </div>
            
            <p>This code is valid for <strong>5 minutes</strong>. Please enter it on the login screen.</p>
            <p style="font-size: 12px; color: #888;">If you did not request this login code, please ignore this email.</p>
            
            <hr style="margin-top: 25px;">
            <p style="font-size: 12px; text-align: center; color: #888;">JIT/QC System Administration</p>
        </div>
    `;

    const textContent = `
        JIT/QC System: Login Verification

        Dear ${fullName},

        Your One-Time Login Code (OTP) is: ${otpCode}

        This code is valid for 5 minutes. Please enter it to log in.

        If you did not request this, please ignore this email.
    `;

    return sendEmail({ 
        to: email, 
        subject, 
        htmlContent: htmlContent,
        textContent: textContent
    });
}

// -----------------------------------------------------------------
// D. Exports and Setup
// -----------------------------------------------------------------

module.exports = {
    sendOtpVerificationEmail,
    sendApprovalConfirmationToUser, // Correct Export Name
    sendEmail, // Exporting generic sender for potential outside use
    sendRegistrationRequestToAdmin,
    sendRegistrationConfirmationToUser, 
    initializeTransporter, 
    setTransporter: (t) => { transporter = t; },
    sendOtpLoginEmail, 
};