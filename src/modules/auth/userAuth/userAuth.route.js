/**
 * @fileoverview User Authentication Routes.
 * @description यह मॉड्यूल उपयोगकर्ता पंजीकरण (registration), लॉगिन (login), OTP सत्यापन (verification),
 * और पासवर्ड रीसेट (password reset) के लिए एंडपॉइंट्स (endpoints) को परिभाषित करता है।
 * बेस पाथ (Base Path) Express राउटर द्वारा `/api/auth` पर सेट किया गया है।
 * @module modules/auth/userAuth/userAuth.route
 */

const express = require('express');
const router = express.Router();

// ✅ FIX: userAuth.controller से सभी आवश्यक फ़ंक्शंस को आयात करें
const { 
    registerUser,
    loginUser, 
    verifyOtp,
    logoutUser,
    resetPassword
} = require('./userAuth.controller'); 

// -------------------------------------------------------------------------
// Routes Definition
// -------------------------------------------------------------------------

/**
 * Route for user registration. Creates a new user and sends an OTP.
 * @name POST /api/auth/register
 * @function
 * @memberof module:modules/auth/userAuth/userAuth.route
 * @param {Function} registerUser - Controller function to handle registration.
 */
router.post('/register', registerUser);

/**
 * Route for user login (passwordless flow). Sends an OTP to the user's email.
 * @name POST /api/auth/login
 * @function
 * @memberof module:modules/auth/userAuth/userAuth.route
 * @param {Function} loginUser - Controller function to handle login request.
 */
router.post('/login', loginUser);

/**
 * Route for verifying the OTP and issuing a JWT token upon successful verification.
 * @name POST /api/auth/verify-otp
 * @function
 * @memberof module:modules/auth/userAuth/userAuth.route
 * @param {Function} verifyOtp - Controller function to validate the OTP.
 */
router.post('/verify-otp', verifyOtp);

/**
 * Route for resetting the password after successful OTP verification.
 * @name POST /api/auth/reset-password
 * @function
 * @memberof module:modules/auth/userAuth/userAuth.route
 * @param {Function} resetPassword - Controller function to handle password reset.
 */
router.post('/reset-password', resetPassword);

/**
 * Route for user logout. Primarily advises the client to delete the JWT token.
 * @name GET /api/auth/logout
 * @function
 * @memberof module:modules/auth/userAuth/userAuth.route
 * @param {Function} logoutUser - Controller function to signal logout completion.
 */
router.get('/logout', logoutUser); 

module.exports = router;