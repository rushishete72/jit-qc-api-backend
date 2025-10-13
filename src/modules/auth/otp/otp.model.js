// src/modules/auth/otp/otp.model.js

const { db } = require('../../../../database/db'); 
const { APIError } = require('../../../utils/errorHandler');
const { hashPassword, comparePassword } = require('../../../utils/passwordUtils'); 

// अधिकतम OTP प्रयास की सीमा
const MAX_ATTEMPTS = 5;

/**
 * OTP कोड को DB में सेव या अपडेट करता है।
 * @param {number} referenceId - registration_request ID (for registration) या User ID (for login).
 * @param {string} otpCode - जेनरेट किया गया OTP (प्लेन टेक्स्ट).
 * @param {Date} expiresAt - OTP की समाप्ति का समय.
 * @returns {Promise<boolean>}
 */
async function saveOrUpdateOtp(referenceId, otpCode, expiresAt) {
    // ⭐ FIX 1: Hash the OTP before saving (SECURITY STEP)
    const hashedOtp = await hashPassword(otpCode);
    
    const query = `
        INSERT INTO user_otp (reference_id, otp_code, expires_at)
        VALUES ($1, $2, $3)
        ON CONFLICT (reference_id) DO UPDATE 
        SET otp_code = EXCLUDED.otp_code, 
            expires_at = EXCLUDED.expires_at, 
            attempts = 0,
            created_at = CURRENT_TIMESTAMP
        RETURNING reference_id;
    `;
    try {
        // ⭐ FIX 2: Pass the HASHED OTP to the query
        await db.one(query, [referenceId, hashedOtp, expiresAt]); 
        return true; 
    } catch (error) {
        // PostgreSQL Foreign Key Violation Code (23503) - Only relevant if FK is restored
        if (error.code === '23503') { 
            // Now this error is less specific, as reference_id could be two things
            throw new APIError('Cannot save OTP: Reference ID not found or invalid.', 404);
        }
        console.error('Database error in saveOrUpdateOtp:', error);
        throw new APIError('Failed to save OTP data.', 500);
    }
}

/**
 * यूज़र द्वारा सबमिट किए गए OTP को सत्यापित करता है।
 * @param {number} referenceId - registration_requests ID या User ID.
 * @param {string} submittedOtp - यूज़र द्वारा सबमिट किया गया OTP.
 * @returns {Promise<boolean>} - यदि OTP मान्य और सत्यापित है तो true.
 * @throws {APIError} - OTP नहीं मिलने, समाप्त होने, या अमान्य होने पर।
 */
async function verifyOtp(referenceId, submittedOtp) {
    
    // 1. OTP रिकॉर्ड फ़ेच करें
    const record = await db.oneOrNone(
        'SELECT otp_code, expires_at, attempts FROM user_otp WHERE reference_id = $1', 
        referenceId
    );

    if (!record) {
        throw new APIError('Verification code record not found. Please initiate the process again.', 404);
    }

    // 2. attempts चेक करें
    if (record.attempts >= MAX_ATTEMPTS) {
        await db.none('DELETE FROM user_otp WHERE reference_id = $1', referenceId);
        throw new APIError(`Maximum OTP attempts reached (${MAX_ATTEMPTS}). Please request a new OTP.`, 403);
    }
    
    // 3. Expiry चेक करें
    if (new Date() > record.expires_at) {
        await db.none('DELETE FROM user_otp WHERE reference_id = $1', referenceId);
        throw new APIError('OTP expired. Please request a new verification code.', 403);
    }

    // 4. OTP कोड चेक करें (CRITICAL FIX)
    const isMatch = await comparePassword(submittedOtp, record.otp_code);

    if (isMatch) {
        // Verification Successful: OTP रिकॉर्ड डिलीट करें
        await db.none('DELETE FROM user_otp WHERE reference_id = $1', referenceId);
        return true; // सत्यापन सफल
    } else {
        // Incorrect OTP: attempts बढ़ाएँ
        await db.none('UPDATE user_otp SET attempts = attempts + 1 WHERE reference_id = $1', referenceId);
        throw new APIError('Invalid verification code provided. Attempts remaining: ' + (MAX_ATTEMPTS - (record.attempts + 1)), 401);
    }
}

/**
 * मौजूदा OTP रिकॉर्ड की निर्माण तिथि फ़ेच करता है। (Cooldown के लिए)
 * @param {number} referenceId - registration_requests ID या User ID.
 * @returns {Promise<{ created_at: Date } | null>} - Creation timestamp as Date object.
 */
async function fetchOtpCreationTime(referenceId) {
    const query = 'SELECT created_at FROM user_otp WHERE reference_id = $1';
    return db.oneOrNone(query, referenceId);
}


/**
 * OTP रिकॉर्ड को मैन्युअल रूप से हटाता है।
 * @param {number} referenceId - registration_requests ID या User ID.
 * @returns {Promise<void>}
 */
async function removeOtp(referenceId) {
    await db.none('DELETE FROM user_otp WHERE reference_id = $1', referenceId);
}


module.exports = {
    saveOrUpdateOtp,
    verifyOtp,
    removeOtp,
    fetchOtpCreationTime, // ⭐ Exported for Cooldown Logic
};