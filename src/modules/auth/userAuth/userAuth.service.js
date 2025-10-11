/**
 * @fileoverview User Authentication Service Layer.
 * @description यह मॉड्यूल OTP-आधारित प्रमाणीकरण (authentication) के लिए व्यावसायिक तर्क (business logic) को समाहित करता है,
 * जिसमें OTP जनरेशन, DB स्टोरेज, और ईमेल भेजने का समन्वय (coordination) शामिल है।
 * @module modules/auth/userAuth/userAuth.service
 */

const userAuthModel = require('./userAuth.model');
const { sendEmail } = require('../../../utils/emailSender');
const { EMAIL_TEMPLATES } = require('../../../config/email.constants');
// 🔑 CRITICAL FIX: ErrorHandler को APIError से बदलें।
const { APIError } = require('../../../utils/errorHandler'); 
const { generateOtp } = require('../../../utils/validation'); 

/**
 * 1. एक OTP जेनरेट करता है, उसे DB में स्टोर करता है (Hash करके), और ईमेल भेजता है।
 * DB या ईमेल त्रुटि होने पर OTP रिकॉर्ड को हटाकर विफलताओं को संभालता है।
 * @async
 * @param {object} user - उपयोगकर्ता ऑब्जेक्ट जिसमें user_id और email शामिल है।
 * @param {number} user.user_id - उपयोगकर्ता की ID।
 * @param {string} user.email - उपयोगकर्ता का ईमेल।
 * @returns {Promise<object>} सफलता का ऑब्जेक्ट जिसमें success: true और generated otp: otp शामिल है।
 * @throws {APIError} यदि OTP निर्माण या ईमेल भेजने में गंभीर त्रुटि होती है।
 */
const sendOtpVerificationEmail = async (user) => {
    // 💡 IMPROVEMENT: OTP को सीधे return करें ताकि इसे टेस्ट स्क्रिप्ट में पकड़ा जा सके।
    const otpCode = generateOtp(); 
    const { user_id, email } = user;

    try {
        // Model layer handles OTP hashing before storing
        await userAuthModel.createOtp(user_id, otpCode);

        const template = EMAIL_TEMPLATES.OTP_VERIFICATION;
        // ⚠️ PRODUCTION ALERT: अगर envs सेट नहीं हैं, तो sendEmail फ़ंक्शन शांत रूप से विफल हो जाएगा।
        await sendEmail({
            to: email,
            subject: template.subject,
            text: template.text(otpCode),
            html: template.html(otpCode),
        });

        // 🔑 UPGRADE: OTP Code को टेस्टिंग के लिए वापस भेजें
        return { success: true, message: 'OTP sent successfully to your email.', otp: otpCode };

    } catch (error) {
        // यदि DB या ईमेल भेजने में त्रुटि होती है, तो OTP रो को हटा दें
        await userAuthModel.deleteOtp(user_id).catch(e => console.error("OTP Cleanup failed during error:", e.message));
        
        // त्रुटि को आगे Controller तक भेजें
        // 🔑 FIX: ErrorHandler के बजाय APIError का उपयोग करें
        if (error instanceof APIError) {
            throw error;
        }
        // 🔑 FIX: ErrorHandler के बजाय APIError का उपयोग करें
        throw new APIError(`OTP sending process failed: ${error.message}`, 500);
    }
};

/**
 * 2. रजिस्ट्रेशन या लॉगिन के लिए OTP flow को संभालता है।
 * यदि उपयोगकर्ता मौजूद नहीं है और यह रजिस्ट्रेशन है, तो वह उसे रजिस्टर करता है।
 * फिर OTP ईमेल भेजता है।
 * @async
 * @param {object} params - फ़्लो के लिए आवश्यक पैरामीटर।
 * @param {string} params.email - उपयोगकर्ता का ईमेल।
 * @param {string} params.fullName - रजिस्ट्रेशन के लिए उपयोगकर्ता का पूरा नाम (यदि लागू हो)।
 * @param {string} params.defaultRoleName - रजिस्ट्रेशन के लिए डिफ़ॉल्ट भूमिका (यदि लागू हो)।
 * @param {boolean} params.isRegistration - इंगित करता है कि यह रजिस्ट्रेशन फ़्लो है या लॉगिन।
 * @returns {Promise<object>} सफलता का ऑब्जेक्ट जिसमें user_id और otp शामिल है।
 * @throws {APIError} यदि उपयोगकर्ता नहीं मिला (लॉगिन में) या खाता निष्क्रिय है।
 */
const handleAuthFlow = async ({ email, fullName, defaultRoleName, isRegistration }) => {
    let user = await userAuthModel.getUserByEmail(email);

    if (!user) {
        if (isRegistration) {
            // उपयोगकर्ता को रजिस्टर करें
            user = await userAuthModel.registerUser(email, fullName, defaultRoleName); // defaultRoleName का उपयोग करें
            console.log(`New user registered: ${user.user_id}`);
        } else {
            // लॉगिन अनुरोध, लेकिन उपयोगकर्ता मौजूद नहीं है
            // 🔑 FIX: ErrorHandler के बजाय APIError का उपयोग करें
            throw new APIError('User not found. Please register first or check your email.', 404);
        }
    }
    
    // सुनिश्चित करें कि उपयोगकर्ता सक्रिय (active) है
    if (!user.is_active) {
        // 🔑 FIX: ErrorHandler के बजाय APIError का उपयोग करें
        throw new APIError('Your account is currently inactive. Please contact support.', 403);
    }
    
    // OTP ईमेल भेजें
    const otpResult = await sendOtpVerificationEmail(user);

    return { 
        message: 'Verification code sent to email.',
        user_id: user.user_id,
        is_verified: user.is_verified,
        otp: otpResult.otp // टेस्टिंग के लिए OTP को वापस भेजें
    };
};

module.exports = {
    handleAuthFlow,
    sendOtpVerificationEmail,
};