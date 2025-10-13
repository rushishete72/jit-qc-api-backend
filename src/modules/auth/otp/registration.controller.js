// src/modules/auth/registration/registration.controller.js (Example)

// ... other imports

// Import the new OTP module
const otpModel = require('../../auth/otp/otp.model');
const otpUtils = require('../../auth/otp/otp.utils'); 
const emailService = require('../../../utils/emailService'); 


const registerNewUser = asyncHandler(async (req, res) => {
    // ... validation and hashing logic

    // 1. यूज़र को PENDING_VERIFICATION स्टेटस के साथ सेव करें (registration_requests में)
    // NOTE: आपको registration_requests मॉडल में यह फ़ंक्शन जोड़ना होगा
    const requestId = await registrationModel.savePendingVerification({ 
        email, 
        full_name, 
        password_hash
    }); 

    // 2. OTP जेनरेट करें
    const otpCode = otpUtils.generateOtp(6);
    const otpExpiresAt = otpUtils.getOtpExpiryTime(5); // 5 मिनट एक्सपायरी

    // 3. DB में OTP सेव करें (registration_request ID से लिंक करके)
    await otpModel.saveOrUpdateOtp(requestId, otpCode, otpExpiresAt);

    // 4. यूज़र को OTP ईमेल भेजें
    await emailService.sendOtpVerificationEmail({
        email, 
        fullName: full_name,
        otpCode
    });

    res.status(202).json({
        status: 'pending_email_verification',
        message: 'Registration request initiated. Please check your email for the OTP and proceed to the /api/auth/verify-otp endpoint.',
        requestId // Verification के लिए क्लाइंट को यह ID वापस भेजें
    });
});


// ... आपको /api/auth/verify-otp रूट के लिए एक नया कंट्रोलर फ़ंक्शन भी बनाना होगा।