// src/modules/auth/userAuth/userAuth.model.js

const { db, pgp } = require('../../../../database/db'); 

// -------------------------------------------------------------
// A. Registration Request (Admin Approval Flow)
// -------------------------------------------------------------
 
const checkExistingUser = async (email) => {
    // 1. Users table में जाँचें
    const user = await db.oneOrNone(
        'SELECT user_id, email, is_active FROM users WHERE email = $1',
        [email]
    );
    if (user) {
        return { type: 'user', data: user };
    }

    // 2. Registration_requests table में लंबित अनुरोधों की जाँच करें (PENDING या PENDING_VERIFICATION)
    const request = await db.oneOrNone(
        'SELECT request_id, status FROM registration_requests WHERE email = $1 AND status IN ($2, $3)',
        [email, 'PENDING', 'PENDING_VERIFICATION'] // ⭐ UPDATED: Both statuses are checked
    );
    if (request) {
        // 💡 Note: Controller will handle specific error messages based on status
        return { type: 'request', data: request }; 
    }

    return null;
};


const createRegistrationRequest = async ({ fullName, email , justificationMessage, password }) => {
    // Note: 'password' is the key coming from the controller (holding the hash)

    const query = pgp.helpers.insert(
        { 
            full_name: fullName, 
            email, 
            justification_message: justificationMessage, 
            password_hash: password, 
            status: 'PENDING_VERIFICATION' // ⭐ UPDATED: Initial status is PENDING_VERIFICATION
        },
        null, 
        'registration_requests'
    ) + ' RETURNING request_id, email, full_name, justification_message, password_hash'; // ⭐ Added full_name, justification_message, password_hash for later use
    
    return db.one(query);
};


/**
 * OTP वेरिफिकेशन सफल होने के बाद रिक्वेस्ट को PENDING (Admin Approval) स्टेटस पर प्रमोट करता है।
 * @param {number} requestId - Request ID.
 * @returns {Promise<object>} - Updated request details (for email notifications).
 */
const promoteRequestToPending = async (requestId) => {
    const query = `
        UPDATE registration_requests
        SET status = 'PENDING',
            requested_at = CURRENT_TIMESTAMP -- PENDING स्टेटस सेट होने पर टाइम अपडेट करें
        WHERE request_id = $1 AND status = 'PENDING_VERIFICATION'
        RETURNING request_id, email, full_name, justification_message, password_hash; 
    `;
    // full_name, justification_message, password_hash को email भेजने के लिए रिटर्न किया गया है
    return db.oneOrNone(query, [requestId]);
};

// ⭐ NEW: Active User Search for OTP Login
/**
 * OTP Login के लिए 'users' table में एक्टिव यूज़र की जाँच करता है।
 * @param {string} email - User's email address.
 * @returns {Promise<object | null>} - User details including user_id if active, otherwise null.
 */
const findActiveUserByEmail = async (email) => {
    const query = `
        SELECT 
            user_id, 
            email, 
            full_name,
            role_id
        FROM users 
        WHERE email = $1 AND is_active = TRUE
    `;
    return db.oneOrNone(query, email);
};

/**
 * JWT token generation के लिए Active User को ID से फ़ेच करता है।
 * @param {number} userId - User ID.
 * @returns {Promise<object | null>} - User details.
 */
const findUserById = async (userId) => {
     const query = `
        SELECT 
            u.user_id, 
            u.email, 
            u.full_name, 
            u.is_active,
            r.role_name,
            u.role_id
        FROM users u
        JOIN roles r ON u.role_id = r.role_id
        WHERE u.user_id = $1 AND u.is_active = TRUE
    `;
    return db.oneOrNone(query, userId);
}


// -------------------------------------------------------------
// B. Core Login Functionality
// -------------------------------------------------------------

const findUserByEmailForLogin = async (email) => {
    // ... (Your existing code is fine here)
    const user = await db.oneOrNone(
        `
        SELECT 
            u.user_id, 
            u.email, 
            u.full_name,
            u.password_hash, 
            u.role_id,
            u.is_active,
            u.is_verified,
            r.role_name
        FROM users u
        JOIN roles r ON u.role_id = r.role_id
        WHERE u.email = $1 
        `,
        [email]
    );
    
    return user;
};


// -------------------------------------------------------------
// C. Utility/Update Functions
// -------------------------------------------------------------

const updateLastLogin = async (userId) => {
    await db.none(
        'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE user_id = $1',
        [userId]
    );
};


module.exports = {
    checkExistingUser,
    createRegistrationRequest,
    promoteRequestToPending,
    findUserByEmailForLogin,
    updateLastLogin,
    findActiveUserByEmail, // ⭐ NEW EXPORT
    findUserById,          // ⭐ NEW EXPORT
};