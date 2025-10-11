/**
 * @fileoverview User Authentication Controller.
 * @description यह मॉड्यूल उपयोगकर्ता प्रमाणीकरण (registration, login, OTP verification)
 * और पासवर्ड रीसेट को नियंत्रित करता है। यह सफलतापूर्वक सत्यापन (verification) पर
 * PBAC (Permission-Based Access Control) डेटा के साथ JWT जारी करता है।
 * @module modules/auth/userAuth/userAuth.controller
 */

// ❌ FIX: userAuthService को हटाया गया
const userAuthModel = require('./userAuth.model');
const jwt = require('jsonwebtoken');
// 🔑 CRITICAL FIX: ErrorHandler को APIError से बदलें ताकि यह utils/errorHandler.js के निर्यात से मेल खाए।
const { APIError } = require('../../../utils/errorHandler'); 
// 🔑 NEW FIX: utils/validation.js से generateOtp को सीधे आयात करें
const { generateOtp } = require('../../../utils/validation'); 

// 💡 .env से कॉन्फ़िग लोड करें
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d'; 

// =========================================================================
// A. UTILITY FUNCTION
// =========================================================================

/**
 * JWT टोकन बनाने के लिए सहायक फ़ंक्शन (PBAC Permissions के साथ)।
 * JWT पेलोड में user_id, email, role, और permissions शामिल हैं।
 * @param {object} profile - userAuthModel.getUserProfileData से प्राप्त डेटा।
 * @param {number} profile.user_id - उपयोगकर्ता की ID.
 * @param {string} profile.email - उपयोगकर्ता का ईमेल.
 * @param {string} profile.role - उपयोगकर्ता की भूमिका का नाम.
 * @param {Array<string>} profile.permissions - उपयोगकर्ता की अनुमतियों की सूची.
 * @returns {string} JWT टोकन।
 * @throws {APIError} यदि JWT_SECRET कॉन्फ़िगर नहीं है।
 */
const createAuthToken = (profile) => {
    // JWT Payload में user_id, role, और permissions को शामिल करना PBAC के लिए महत्वपूर्ण है।
    const payload = {
        user_id: profile.user_id,
        email: profile.email,
        role: profile.role, 
        permissions: profile.permissions, 
    };
    if (!JWT_SECRET) {
        throw new APIError("JWT_SECRET is not configured in environment variables. Critical server error.", 500);
    }
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
};

// =========================================================================
// B. AUTHENTICATION HANDLERS
// =========================================================================

/**
 * 1. /register: नया उपयोगकर्ता बनाता है और OTP भेजता है।
 * @async
 * @param {object} req - Express Request Object
 * @param {object} req.body - Request body containing email, full_name, defaultRoleName.
 * @param {object} res - Express Response Object
 * @param {function} next - Express Next Middleware Function
 * @returns {Promise<void>}
 */

// src/modules/auth/userAuth/userAuth.controller.js

const registerUser = async (req, res, next) => {
    // 🔑 PERMANENT FIX: Skip execution if not called in a valid Express context.
    // This resolves the startup crash caused by an unintended module import/call.
    if (!req || !req.body) {
        return next(); 
    }
    
    // Now, run the actual validation for a real request
    const { email, full_name, defaultRoleName } = req.body; 
    
    if (!email || !full_name) {
        return next(new APIError('Email and Full Name are required for registration.', 400));
    }

    try {
        const user = await userAuthModel.registerUser(email, full_name, defaultRoleName);
        // ... (rest of the successful registration logic)
    } catch (error) {
        next(error);
    }
};
// ... (rest of the controller)

/**
 * 2. /login: मौजूदा उपयोगकर्ता के लिए OTP भेजता है। (Passwordless Login Flow)
 * @async
 * @param {object} req - Express Request Object
 * @param {object} req.body - Request body containing email.
 * @param {object} res - Express Response Object
 * @param {function} next - Express Next Middleware Function
 * @returns {Promise<void>}
 */
const loginUser = async (req, res, next) => {
    const { email } = req.body;

    if (!email) {
        return next(new APIError('Email is required for login.', 400));
    }
    
    try {
        const user = await userAuthModel.getUserByEmail(email);

        if (!user) {
            return next(new APIError('User not found or is inactive.', 404));
        }

        // 🔑 FIX: generateOtp() को सीधे call करें
        const otpCode = generateOtp();
        await userAuthModel.createOtp(user.user_id, otpCode);
        
        res.status(200).json({
            message: 'OTP sent to your email for passwordless login.',
            data: {
                user_id: user.user_id,
                email: user.email,
                // DEVELOPMENT HINT: Test OTP
                test_otp: process.env.NODE_ENV !== 'production' ? otpCode : undefined
            }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * 3. /verify-otp: OTP को मान्य करता है और JWT जारी करता है।
 * @async
 * @param {object} req - Express Request Object
 * @param {object} req.body - Request body containing email and otp code.
 * @param {object} res - Express Response Object
 * @param {function} next - Express Next Middleware Function
 * @returns {Promise<void>}
 */
const verifyOtp = async (req, res, next) => {
    const { email, otp: inputOtpCode } = req.body;

    if (!email || !inputOtpCode) {
        return next(new APIError('Email and OTP are required for verification.', 400));
    }
    
    try {
        const user = await userAuthModel.getUserByEmail(email);
        
        if (!user) {
            return next(new APIError('User not found or is inactive.', 404));
        }

        const verificationResult = await userAuthModel.validateOtp(user.user_id, inputOtpCode);

        if (!verificationResult) {
            return next(new APIError('Invalid OTP or OTP expired/attempts exceeded.', 401));
        }
        
        // JWT के लिए आवश्यक प्रोफ़ाइल डेटा और अनुमतियाँ प्राप्त करें
        const profile = await userAuthModel.getUserProfileData(user.user_id);
        
        if (!profile) {
            return next(new APIError('Failed to load user profile after verification.', 500));
        }

        const token = createAuthToken(profile);
        
        res.status(200).json({
            message: 'OTP verified. Login successful.',
            token: token,
            data: {
                user_id: profile.user_id,
                email: profile.email,
                role: profile.role,
                permissions: profile.permissions
            }
        });
        
    } catch (error) {
        next(error);
    }
};

/**
 * 4. /reset-password: OTP सत्यापन के बाद नया पासवर्ड सेट करता है।
 * @async
 * @param {object} req - Express Request Object
 * @param {object} req.body - Request body containing email, newPassword, and otp code.
 * @param {object} res - Express Response Object
 * @param {function} next - Express Next Middleware Function
 * @returns {Promise<void>}
 */
const resetPassword = async (req, res, next) => {
    const { email, newPassword, otp: inputOtpCode } = req.body;

    if (!email || !newPassword || !inputOtpCode) {
        return next(new APIError('Email, OTP, and new password are required for reset.', 400));
    }
    
    try {
        const user = await userAuthModel.getUserByEmail(email);
        
        if (!user) {
            return next(new APIError('User not found or is inactive.', 404));
        }
        
        // 1. OTP को मान्य करें (Validation)
        const verificationResult = await userAuthModel.validateOtp(user.user_id, inputOtpCode);
        
        if (!verificationResult) {
            return next(new APIError('Invalid OTP or OTP expired/attempts exceeded.', 401));
        }
        
        // 2. पासवर्ड अपडेट करें
        await userAuthModel.updateUserPassword(user.user_id, newPassword);
        
        // 3. OTP रो को हटाएँ
        await userAuthModel.deleteOtp(user.user_id);

        res.status(200).json({
            message: 'Password successfully reset. You can now login.',
            data: {
                user_id: user.user_id,
                email: user.email
            }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * 5. /logout: लॉगआउट केवल क्लाइंट-साइड टोकन को हटाने का संकेत देता है।
 * @param {object} req - Express Request Object
 * @param {object} res - Express Response Object
 * @returns {void}
 */
const logoutUser = (req, res) => {
    res.status(200).json({ 
        message: 'Logout successful. Please delete your JWT token client-side.'
    });
};

// =========================================================================
// C. FINAL EXPORTS
// =========================================================================

module.exports = {
    registerUser,
    loginUser,
    verifyOtp,
    logoutUser,
    resetPassword,
};