// src/modules/auth/userAuth/userAuth.route.js

const express = require('express'); 
const router = express.Router();
// ✅ userAuthController को डीस्ट्रक्चर करने के बजाय सीधे ऑब्जेक्ट के रूप में इम्पोर्ट करें
const userAuthController = require('./userAuth.controller');

// 1. User Registration Request (Admin Approval Flow) - Line 15
router.post('/register', userAuthController.registerRequest);

// 2. Traditional Email/Password Login
router.post('/requestOtpLogin', userAuthController.requestOtpLogin);

router.post('/verifyOtpLogin', userAuthController.verifyOtpLogin);

router.post('/verify-otp', userAuthController.verifyOtpAndPromote);




// --- Future Routes (To be added later) ---
// router.post('/forgot-password', userAuthController.forgotPassword);
// router.post('/reset-password', userAuthController.resetPassword);


module.exports = router;