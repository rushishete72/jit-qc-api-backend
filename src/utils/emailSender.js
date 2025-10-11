/**
 * @fileoverview यह फ़ाइल Nodemailer का उपयोग करके एक मजबूत (robust) और 
 * कॉन्फ़िगरेबल ईमेल भेजने वाली सेवा प्रदान करती है।
 * यह पर्यावरण (environment) चर (variables) के आधार पर SMTP ट्रांसपोर्टर को 
 * सशर्त रूप से (conditionally) इनिशियलाइज़ करता है और त्रुटि प्रबंधन (error handling) 
 * शामिल करता है।
 */

const nodemailer = require('nodemailer');
// Note: Assuming ErrorHandler is a class/function exported by './errorHandler'
const { ErrorHandler } = require('./errorHandler'); 

// 💡 .env से सेटिंग्स लोड करें (Production Ready Logic)
const EMAIL_HOST = process.env.EMAIL_HOST;
const EMAIL_PORT = process.env.EMAIL_PORT;
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
/**
 * @type {string} EMAIL_FROM - ईमेल भेजने के लिए उपयोग किया जाने वाला 'from' पता।
 * यदि .env में परिभाषित नहीं है, तो EMAIL_USER का उपयोग करता है।
 */
const EMAIL_FROM = process.env.EMAIL_FROM || EMAIL_USER;

/**
 * @type {nodemailer.Transporter|null} transporter - Nodemailer SMTP ट्रांसपोर्टर इंस्टेंस।
 * यदि आवश्यक क्रेडेंशियल्स अनुपलब्ध हैं तो यह `null` रहता है।
 */
let transporter = null;

if (EMAIL_HOST && EMAIL_USER && EMAIL_PASS) {
    try {
        /**
         * @description Nodemailer ट्रांसपोर्टर को SMTP सेटिंग्स के साथ बनाता है।
         */
        transporter = nodemailer.createTransport({
            host: EMAIL_HOST,
            port: Number(EMAIL_PORT),
            // पोर्ट 465 (SMTPS) के लिए 'secure' true होता है, अन्यथा false
            secure: EMAIL_PORT === '465', 
            auth: {
                user: EMAIL_USER,
                pass: EMAIL_PASS,
            },
            // 🔒 Dev/Test में self-signed certificate त्रुटियों से बचने के लिए tls सेटिंग्स।
            tls: {
                rejectUnauthorized: false
            }
        });
    } catch (e) {
        console.error('Email Transporter initialization failed:', e.message);
        transporter = null;
    }
} else {
    console.warn('⚠️ Email Service Disabled: Missing EMAIL_HOST, EMAIL_USER, or EMAIL_PASS in .env. Emails will be skipped.');
}


/**
 * सामान्यीकृत ईमेल भेजने वाला फ़ंक्शन।
 * @async
 * @function sendEmail
 * @param {object} options - ईमेल विकल्प।
 * @param {string} options.to - प्राप्तकर्ता (Recipient) ईमेल पता।
 * @param {string} options.subject - ईमेल का विषय (Subject)।
 * @param {string} [options.text] - प्लेन-टेक्स्ट बॉडी।
 * @param {string} [options.html] - HTML बॉडी।
 * @returns {Promise<object>} - संदेश ID या सफलता संदेश के साथ एक ऑब्जेक्ट।
 * @throws {ErrorHandler} यदि ट्रांसपोर्टर लाइव है लेकिन Nodemailer त्रुटि देता है।
 */
const sendEmail = async ({ to, subject, text, html }) => {
    
    // 🛑 CRITICAL CHECK: यदि ट्रांसपोर्टर इनिशियलाइज़ नहीं हुआ है, तो लाइव ईमेल स्किप करें।
    if (!transporter) {
        console.warn(`[EMAIL SKIP] Not sending email to ${to} (Subject: ${subject}). Service is disabled.`);
        // Dev/Test में लॉजिक को पास होने दें
        return { message: 'Email service skipped (Credentials missing).' };
    }

    try {
        const mailOptions = {
            from: EMAIL_FROM,
            to: to,
            subject: subject,
            text: text,
            html: html,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`[EMAIL SUCCESS] Email sent to ${to}. Message ID: ${info.messageId}`);
        return { messageId: info.messageId };

    } catch (error) {
        // Nodemailer त्रुटि को एक नियंत्रित ErrorHandler त्रुटि में बदलें
        console.error(`[EMAIL FAIL] Error sending email to ${to}:`, error.message);
        throw new ErrorHandler(500, `Failed to send email: Check SMTP configuration or network. Details: ${error.message}`);
    }
};

/**
 * @exports {object}
 * @property {Function} sendEmail - बाहरी उपयोग के लिए ईमेल भेजने का फ़ंक्शन।
 */
module.exports = {
    sendEmail,
};