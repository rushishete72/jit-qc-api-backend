// src/middleware/auth.js

const jwt = require('jsonwebtoken');
const { APIError } = require('../utils/errorHandler');
const config = require('../config');
// ⭐ 1. नया RBAC मॉडल आयात (Import) करें
const { getPermissionsByRoleId } = require('../modules/rbac/rbac.model'); 
const asyncHandler = require('../utils/asyncHandler'); 

// ---------------------------------------------------------
// A. JWT Generation Logic (PREVIOUSLY MISSING DEFINITION)
// ---------------------------------------------------------

/**
 * Access Token और Refresh Token बनाता है।
 * @param {object} user - वह उपयोगकर्ता ऑब्जेक्ट जिसमें user_id, role_id, और full_name शामिल हैं।
 * @returns {object} {accessToken, refreshToken}
 */
const generateAuthTokens = (user) => {
    // 1. Access Token: छोटी अवधि (short-lived)
    const accessToken = jwt.sign(
        { 
            userId: user.user_id, // Note the casing userId
            roleId: user.role_id, 
            fullName: user.full_name 
        },
        config.SECURITY.JWT_SECRET,
        { expiresIn: config.SECURITY.JWT_EXPIRY }
    );

    // 2. Refresh Token: लंबी अवधि (long-lived)
    const refreshToken = jwt.sign(
        { userId: user.user_id },
        config.SECURITY.JWT_SECRET,
        { expiresIn: config.SECURITY.REFRESH_TOKEN_EXPIRY }
    );

    return { accessToken, refreshToken };
};


// ---------------------------------------------------------
// B. Authentication Middleware (JWT Check) (PREVIOUSLY MISSING DEFINITION)
// ---------------------------------------------------------

/**
 * जांचता है कि अनुरोध (request) में एक वैध Access Token है या नहीं।
 * यदि वैध है, तो payload को req.user में संलग्न (attach) करता है।
 */
const authenticate = (req, res, next) => {
    // 1. Authorization Header से टोकन प्राप्त करें
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(new APIError('Authentication required. Token missing.', 401));
    }

    const token = authHeader.split(' ')[1];

    // 2. टोकन को सत्यापित करें
    try {
        const payload = jwt.verify(token, config.SECURITY.JWT_SECRET);
        
        // payload को req.user में संलग्न करें
        req.user = payload; 
        
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return next(new APIError('Token expired. Please re-authenticate or refresh.', 401));
        }
        return next(new APIError('Invalid token.', 401));
    }
};


// ---------------------------------------------------------
// C. Authorization Middleware (RBAC Check) - (YOUR CODE)
// ---------------------------------------------------------

/**
 * जाँचता है कि प्रमाणित (authenticated) उपयोगकर्ता के पास अनुरोधित अनुमति (permission) है या नहीं।
 * @param {string} requiredPermission - आवश्यक अनुमति कोड (e.g., 'USER_APPROVE').
 */
const authorize = (requiredPermission) => asyncHandler(async (req, res, next) => {
    
    // 1. सुनिश्चित करें कि उपयोगकर्ता प्रमाणित है और payload मौजूद है
    if (!req.user || !req.user.roleId) {
        return next(new APIError('Authorization failed. User data missing.', 403));
    }

    // ⭐ 2. Performance Improvement: req.user में Permissions को Cache करें
    // यदि permissions पहले से लोड नहीं हैं, तो उन्हें fetch करें
    if (!req.user.permissions) {
        const permissions = await getPermissionsByRoleId(req.user.roleId);
        req.user.permissions = permissions; // इसे req.user में स्टोर करें
    }
    
    // 3. अंतिम चेक: क्या यूज़र के पास आवश्यक परमिशन है?
    // हम मान लेंगे कि Super Admin (roleId: 1) को सभी परमिशन हैं
    if (req.user.roleId === 1 || req.user.permissions.includes(requiredPermission)) {
        return next();
    }
    
    // 4. यदि उपयोगकर्ता के पास अनुमति नहीं है
    return next(new APIError(`Access denied. Missing permission: ${requiredPermission}.`, 403));
});


// ---------------------------------------------------------
// D. Exports (CRITICAL)
// ---------------------------------------------------------

module.exports = {
    generateAuthTokens,
    authenticate,
    authorize,
};