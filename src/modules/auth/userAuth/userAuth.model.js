/**
 * @fileoverview User Authentication Model (Database Operations).
 * @description यह मॉड्यूल उपयोगकर्ता, भूमिका (roles), और OTP प्रबंधन के लिए सभी डेटाबेस
 * इंटरैक्शन (PostgreSQL के साथ pg-promise का उपयोग करके) को संभालता है।
 * यह सुनिश्चित करता है कि DB परिनियोजन (deployment) के दौरान आवश्यक डिफ़ॉल्ट भूमिकाएँ मौजूद हों।
 * @module modules/auth/userAuth/userAuth.model
 */

// पाथ फिक्स (4 levels up)
const { db, pgp } = require('../../../../database/db'); 
const bcrypt = require('bcryptjs'); 
const { APIError } = require('../../../utils/errorHandler'); 

const OTP_SALT_ROUNDS = 10; 

// =========================================================================
// B. CRITICAL SETUP: डिफ़ॉल्ट रोल सुनिश्चित करें (FINAL FIX)
// =========================================================================

/** * CRITICAL: सुनिश्चित करता है कि 'Client' जैसा डिफ़ॉल्ट रोल मौजूद है।
 * यदि भूमिका (role) मौजूद नहीं है, तो उसे बनाता है।
 * @async
 * @param {string} roleName - वह भूमिका नाम जिसे सुनिश्चित किया जाना है (जैसे 'Client')।
 * @returns {Promise<void>}
 * @throws {APIError} यदि डेटाबेस में 'roles' तालिका मौजूद नहीं है।
 */


const ensureDefaultRoleExists = async (roleName) => {
    try {
        // ✅ FIX: The query is collapsed into a single line to eliminate leading whitespace errors.
        const query = `INSERT INTO roles (role_name) VALUES ($1) ON CONFLICT (role_name) DO NOTHING;`;
        
        await db.none(query, [roleName]);
        console.log(`[DB Setup] Ensured default role '${roleName}' exists.`);
        
    } catch (error) {
        // The error handling remains correct to check for the missing 'roles' table.
        console.error("CRITICAL SQL ERROR during ensureDefaultRoleExists:", error.message || error); 
        throw new APIError(`Database setup failed for role '${roleName}'. The 'roles' table might be missing.`, 500);
    }
};

// =========================================================================
// A. USER & OTP MANAGEMENT
// (No changes needed below this line for the current error)
// =========================================================================

/** * 1. उपयोगकर्ता को ईमेल द्वारा ढूंढता है।
 * @async
 * @param {string} email - उपयोगकर्ता का ईमेल।
 * @returns {Promise<object|null>} उपयोगकर्ता ऑब्जेक्ट जिसमें user_id, email, full_name, role शामिल है, या null यदि नहीं मिला।
 */
const getUserByEmail = async (email) => {
    const query = `
        SELECT u.user_id, u.email, u.full_name, r.role_name AS role, u.is_active, u.is_verified
        FROM users u
        JOIN roles r ON u.role_id = r.role_id
        WHERE u.email = $1 AND u.is_active = TRUE
    `;
    return db.oneOrNone(query, [email]);
};

/** * 2. एक नया उपयोगकर्ता रजिस्टर करता है।
 * @async
 * @param {string} email - उपयोगकर्ता का ईमेल (unique).
 * @param {string} fullName - उपयोगकर्ता का पूरा नाम।
 * @param {string} [defaultRoleName='Client'] - डिफ़ॉल्ट भूमिका नाम।
 * @returns {Promise<object>} नए उपयोगकर्ता का प्रोफ़ाइल डेटा।
 * @throws {APIError} यदि ईमेल पहले से मौजूद है (409) या DB विफल हो जाता है (500)।
 */

const registerUser = async (email, fullName, defaultRoleName = 'Client') => {
    try {
        // पहले डिफ़ॉल्ट भूमिका सुनिश्चित करें (जो अब ठीक हो गया है)
//         await ensureDefaultRoleExists(defaultRoleName);

        // यह क्वेरी अभी भी role_id, full_name, user_id पर निर्भर करती है
       const query = `
            WITH RoleID AS (SELECT role_id FROM roles WHERE role_name = $3) 
            INSERT INTO users (email, full_name, role_id, is_active, is_verified) 
            SELECT $1, $2, RoleID.role_id, TRUE, FALSE FROM RoleID 
            RETURNING user_id, email, full_name, role_id
        `;
        
        
        const newUser = await db.one(query, [email, fullName || email.split('@')[0], defaultRoleName]); 
        
        return getUserByEmail(newUser.email);
        
    } catch (e) {
        if (e.code === '23505') { 
            throw new APIError("Registration failed: A user with this email already exists.", 409);
        }
        console.error("ACTUAL DATABASE ERROR during registerUser:", e.message || e);
        throw new APIError("User registration failed at database level. Check the schema.", 500);
    }
};

/** * 3. एक नया OTP बनाता है या किसी मौजूदा OTP को अपडेट करता है।
 * OTP को एन्क्रिप्ट (hash) करके 5 मिनट की समाप्ति (expiration) के साथ संग्रहीत करता है।
 * @async
 * @param {number} userId - वह उपयोगकर्ता जिसके लिए OTP बनाया जा रहा है।
 * @param {string} otpCode - 6-अंकों का OTP कोड।
 * @returns {Promise<object>} user_otp रिकॉर्ड।
 */
const createOtp = async (userId, otpCode) => {
    const expirationTime = new Date(Date.now() + 5 * 60000); 
    const hashedOtp = await bcrypt.hash(otpCode, OTP_SALT_ROUNDS);

    const query = `
        INSERT INTO user_otp (user_id, otp_code, expires_at, attempts)
        VALUES ($1, $2, $3, 0) 
        ON CONFLICT (user_id) DO UPDATE
        SET otp_code = EXCLUDED.otp_code, expires_at = EXCLUDED.expires_at, attempts = 0, created_at = NOW()
        RETURNING *
    `;
    return db.one(query, [userId, hashedOtp, expirationTime]);
};

// -------------------------------------------------------------------------
// (अन्य सभी मॉडल फ़ंक्शंस जैसे validateOtp, getUserProfileData, आदि यहाँ अपरिवर्तित रहेंगे)
// -------------------------------------------------------------------------

/** * 4. OTP को मान्य करता है।
 * ट्रांजैक्शन (Transaction) में OTP, इसकी समाप्ति (expiry) और प्रयासों (attempts) की जाँच करता है।
 * सफल सत्यापन पर उपयोगकर्ता को `is_verified` पर सेट करता है और OTP रिकॉर्ड हटाता है।
 * @async
 * @param {number} userId - उपयोगकर्ता की ID।
 * @param {string} inputOtpCode - उपयोगकर्ता द्वारा दर्ज किया गया OTP कोड।
 * @returns {Promise<object|null>} यदि मान्य है तो उपयोगकर्ता रिकॉर्ड, अन्यथा null।
 * @throws {APIError} यदि प्रयास सीमा पार हो जाती है या OTP समाप्त हो जाता है।
 */
const validateOtp = async (userId, inputOtpCode) => { 
    const MAX_OTP_ATTEMPTS = 5; 
    // ... (लॉजिक अपरिवर्तित)
    return db.tx(async t => {
        const otpRecord = await t.oneOrNone('SELECT attempts, expires_at, otp_code AS stored_otp_hash FROM user_otp WHERE user_id = $1', [userId]);

        if (!otpRecord) return null; 
        
        if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
            await t.none('DELETE FROM user_otp WHERE user_id = $1', [userId]);
            throw new APIError('OTP attempts limit exceeded. Please generate a new OTP.', 401);
        }

        if (otpRecord.expires_at < new Date()) {
            await t.none('UPDATE user_otp SET attempts = attempts + 1 WHERE user_id = $1', [userId]);
            throw new APIError('OTP has expired. Please request a new one.', 401);
        }
        
        const isMatch = await bcrypt.compare(inputOtpCode, otpRecord.stored_otp_hash);

        if (!isMatch) {
            await t.none('UPDATE user_otp SET attempts = attempts + 1 WHERE user_id = $1', [userId]);
            return null; 
        }
        
        await t.none('UPDATE users SET is_verified = TRUE, updated_at = NOW() WHERE user_id = $1', [userId]);
        await t.none('DELETE FROM user_otp WHERE user_id = $1', [userId]);

        return t.oneOrNone('SELECT user_id FROM users WHERE user_id = $1', [userId]);
    });
};

/** * 5. JWT Payload के लिए उपयोगकर्ता प्रोफ़ाइल डेटा और सभी संबंधित अनुमतियाँ (permissions) प्राप्त करें।
 * @async
 * @param {number} userId - उपयोगकर्ता की ID।
 * @returns {Promise<object|null>} उपयोगकर्ता प्रोफ़ाइल (user_id, email, full_name, role, permissions[])।
 */
const getUserProfileData = async (userId) => {
    const query = `
        SELECT 
            u.user_id, u.email, u.full_name, r.role_name AS role, u.is_verified, 
            COALESCE(ARRAY_AGG(p.permission_key) FILTER (WHERE p.permission_key IS NOT NULL), '{}') AS permissions
        FROM 
            users u
        JOIN 
            roles r ON u.role_id = r.role_id
        LEFT JOIN
            role_permissions rp ON r.role_id = rp.role_id
        LEFT JOIN
            permissions p ON rp.permission_id = p.permission_id
        WHERE 
            u.user_id = $1 AND u.is_active = TRUE
        GROUP BY
            u.user_id, u.email, u.full_name, r.role_name, u.is_verified
    `;
    return db.oneOrNone(query, [userId]);
};

/** * 6. उपयोगकर्ता के पासवर्ड को HASH करता है और DB में अपडेट करता है।
 * @async
 * @param {number} userId - उपयोगकर्ता की ID।
 * @param {string} newPassword - नया सादा पाठ (plain text) पासवर्ड।
 * @returns {Promise<void>}
 * @throws {APIError} यदि उपयोगकर्ता नहीं मिला।
 */
const updateUserPassword = async (userId, newPassword) => {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    const query = `
        UPDATE users SET password_hash = $2, updated_at = NOW() 
        WHERE user_id = $1
        RETURNING user_id
    `;
    const result = await db.result(query, [userId, passwordHash]);

    if (result.rowCount === 0) {
        throw new APIError('User not found or no changes made to password.', 404);
    }
};

/** * 7. OTP रो को डिलीट करें। (आमतौर पर सफल सत्यापन या रीसेट के बाद)।
 * @async
 * @param {number} userId - वह उपयोगकर्ता जिसका OTP हटाना है।
 * @returns {Promise<void>}
 */
const deleteOtp = async (userId) => {
    return db.none('DELETE FROM user_otp WHERE user_id = $1', [userId]);
};


// =========================================================================
// FINAL EXPORTS 
// =========================================================================

module.exports = {
    getUserByEmail,
    registerUser,
    createOtp,
    validateOtp, 
    deleteOtp, 
    getUserProfileData,
    updateUserPassword,
};