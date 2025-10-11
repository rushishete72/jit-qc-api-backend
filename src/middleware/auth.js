/**
 * @fileoverview Authentication and Authorization Middleware for Express.
 * @description यह मॉड्यूल JWT के माध्यम से उपयोगकर्ता को प्रमाणित (authenticate) करता है और
 * JWT पेलोड में मौजूद अनुमतियों (permissions) के आधार पर प्रवेश को अधिकृत (authorize) करता है (Permission-Based Access Control / PBAC)।
 * @module middleware/auth
 */

const jwt = require('jsonwebtoken'); 
// नोट: इस फ़ाइल को अब userModel की आवश्यकता नहीं है क्योंकि परमिशन JWT पेलोड से आ रही हैं!

// 💡 JWT सीक्रेट को .env से प्राप्त करें। डेवलपमेंट में फॉलबैक से बचें।
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    // प्रोडक्शन (Production) में यह एक गंभीर त्रुटि होगी, सर्वर को क्रैश करना उचित है
    console.error('CRITICAL: JWT_SECRET is not set. Exiting application.');
    // process.exit(1); // आप इसे अनकमेंट कर सकते हैं
}


// -------------------------------------------------------------------------
// 1. AUTHENTICATE: JWT टोकन को मान्य करना
// -------------------------------------------------------------------------

/**
 * JWT टोकन को मान्य करता है और टोकन से उपयोगकर्ता डेटा (user_id, email, role, permissions) 
 * को req.user ऑब्जेक्ट में संलग्न करता है।
 * यह सुनिश्चित करता है कि परमिशन को तेज़ लुकअप के लिए Set के रूप में सेव किया जाए।
 * @param {object} req - Express Request Object.
 * @param {object} res - Express Response Object.
 * @param {function} next - Express Next Middleware Function.
 * @returns {void}
 */
const authenticate = (req, res, next) => {
    // 1. Authorization Header की जाँच करें
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
            message: 'Authentication Failed. Missing or malformed Bearer token format.',
            code: 'AUTH_001'
        });
    }

    const token = authHeader.split(' ')[1];
    
    // 2. JWT टोकन को सत्यापित (Verify) करें
    try {
        if (!JWT_SECRET) {
            return res.status(500).json({
                message: 'Server Configuration Error. Please contact administrator (JWT_SECRET missing).',
                code: 'SERVER_001'
            });
        }
        
        const decoded = jwt.verify(token, JWT_SECRET);
        
        const userId = decoded.user_id;
        
        if (!userId) {
             return res.status(401).json({ 
                 message: 'Authentication Failed. Token payload missing user identifier.',
                 code: 'AUTH_003'
             });
        }

        // 💡 बेहतर RBAC लुकअप के लिए, permissions को Array के बजाय Set में कन्वर्ट करें (वैकल्पिक, पर तेज़)
        const permissionsArray = Array.isArray(decoded.permissions) ? decoded.permissions : [];

        /**
         * @typedef {object} AuthenticatedUser
         * @property {number} user_id - The unique ID of the user.
         * @property {string} email - The user's email.
         * @property {string} role_name - The name of the user's role (e.g., 'System_Admin').
         * @property {Set<string>} permissions - Set of permission keys for O(1) fast lookup.
         * @property {Array<string>} permissionsArray - Array of permission keys (if needed).
         */
        /** @type {AuthenticatedUser} */
        req.user = {
            user_id: userId, 
            email: decoded.email,
            role_name: decoded.role_name, // 'role' को 'role_name' करना अधिक स्पष्ट है
            permissions: new Set(permissionsArray), // Set का उपयोग करें
            permissionsArray: permissionsArray // यदि आवश्यक हो तो एरे भी रखें
        };
        
        next(); // सफलतापूर्वक प्रमाणीकृत (Authenticated)
    } catch (error) {
        // 3. त्रुटियों को हैंडल करें (Expired, Invalid Signature)
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                message: 'Token Expired. Please log in again.',
                code: 'AUTH_002'
            });
        }
        // अन्य JWT त्रुटियाँ (जैसे Invalid Signature)
        return res.status(401).json({ 
            message: 'Authentication Failed due to Invalid Token.',
            code: 'AUTH_004'
        });
    }
};

// -------------------------------------------------------------------------
// 2. AUTHORIZE: Permission-Based Access Control (PBAC) लागू करना
// -------------------------------------------------------------------------

/**
 * विशिष्ट अनुमतियों (Permission Keys) के आधार पर एक्सेस कंट्रोल लागू करता है।
 * उपयोगकर्ता के पास आवश्यक अनुमतियों में से **कम से कम एक** होनी चाहिए (OR logic)।
 *
 * @param {string|Array<string>} requiredPermissions - एक सिंगल परमिशन स्ट्रिंग या परमिशन एरे।
 * @returns {function} Express मिडलवेयर फ़ंक्शन।
 */
const authorize = (requiredPermissions) => {
    // सुनिश्चित करें कि यह हमेशा एक एरे है
    const perms = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
    
    return (req, res, next) => {
        // 1. सुनिश्चित करें कि उपयोगकर्ता प्रमाणीकृत है और permissions लोड हैं।
        if (!req.user || !req.user.permissions) {
            return res.status(403).json({ 
                message: 'Authorization Check Failed. User profile or permissions are missing.',
                code: 'AUTH_005'
            });
        }

        // 2. चेक करें कि उपयोगकर्ता के पास आवश्यक अनुमतियाँ हैं या नहीं
        const userHasRequiredPermission = perms.some(
            permissionKey => req.user.permissions.has(permissionKey) // Set.has() का उपयोग तेज़ है
        );

        if (userHasRequiredPermission) {
            next(); // एक्सेस की अनुमति
        } else {
            // 3. पहुँच निषेध (Access Denied)
            console.warn(`AUTH FAIL: User ${req.user.user_id} (Role: ${req.user.role_name}) was denied access to ${req.originalUrl}. Missing Permissions: ${perms.join(', ')}`);
            
            return res.status(403).json({ 
                message: 'Authorization Failed. Insufficient permissions to access this resource.',
                required: perms,
                code: 'AUTH_006'
            });
        }
    };
};

module.exports = {
    authenticate, 
    authorize,
    // requireAuth को authenticate का उपनाम (alias) दें
    requireAuth: authenticate
};