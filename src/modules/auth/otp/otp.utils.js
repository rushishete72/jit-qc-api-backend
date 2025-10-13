// src/modules/auth/otp/otp.utils.js

/**
 * 6-digit का रैंडम OTP कोड जेनरेट करता है (संख्यात्मक स्ट्रिंग के रूप में)।
 * @returns {string} 6-digit OTP code.
 */const { hashPassword, comparePassword } = require('../../../utils/passwordUtils'); 
function generateOtp(length = 6) {
    // Math.random() [0, 1) के बीच में देता है
    // Math.pow(10, length) - 1 सबसे बड़ी 'length' डिजिट संख्या है (e.g., 999999)
    // Math.pow(10, length - 1) सबसे छोटी 'length' डिजिट संख्या है (e.g., 100000)
    
    // यह सुनिश्चित करता है कि हमें हमेशा 6-डिजिट की संख्या मिले
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    
    const otp = Math.floor(Math.random() * (max - min + 1)) + min;
    
    return otp.toString();
}

/**
 * OTP की समाप्ति का समय (Expiry Time) जेनरेट करता है।
 * @param {number} minutes - कितने मिनट बाद OTP समाप्त होगा।
 * @returns {Date} Expiry timestamp.
 */
function getOtpExpiryTime(minutes = 15) {
    return new Date(Date.now() + minutes * 60000);
}

/**
 * मौजूदा OTP रिकॉर्ड की निर्माण तिथि फ़ेच करता है।
 * @param {number} requestId - registration_requests टेबल से ID.
 * @returns {Promise<{ created_at: Date } | null>} - Creation timestamp as Date object.
 */
async function fetchOtpCreationTime(requestId) {
    const query = 'SELECT created_at FROM user_otp WHERE user_id = $1';
    return db.oneOrNone(query, requestId);
}


module.exports = {
    fetchOtpCreationTime,
    generateOtp,
    getOtpExpiryTime,
};