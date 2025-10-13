// modules/auth/userAuth/userAuth.controller.js

const model = require('./userAuth.model');
const { APIError } = require('../../../utils/errorHandler');
const asyncHandler = require('../../../utils/asyncHandler'); 

// ⭐ NEW IMPORTS for OTP and Email
const otpModel = require('../otp/otp.model'); 
const { generateOtp, getOtpExpiryTime } = require('../otp/otp.utils'); 

const { 
    sendRegistrationRequestToAdmin,
    sendRegistrationConfirmationToUser, 
    sendOtpVerificationEmail,
    sendOtpLoginEmail // ⭐ NEW IMPORT
} = require('../../../utils/emailService'); 
const { hashPassword, comparePassword } = require('../../../utils/passwordUtils');
const { generateAuthTokens } = require('../../../middleware/auth');


// -------------------------------------------------------------
// CONFIGURATION: OTP Resend Cooldown (1 minute 30 seconds)
// -------------------------------------------------------------
// 1.5 minutes * 60 seconds/minute * 1000 milliseconds/second
const OTP_RESEND_COOLDOWN_MS = 90 * 1000; 

// -------------------------------------------------------------
// A. Registration Request (POST /api/auth/local/register)
// -------------------------------------------------------------

const registerRequest = asyncHandler(async (req, res, next) => {
    const { fullName, email, justificationMessage, password } = req.body;

    // INPUT VALIDATION (Basic check)
    if (!fullName || !email || !password) {
        throw new APIError('Full Name, Email, and Password are required.', 400);
    }
    
    // 1. Existing User Check (Check against 'user' table and 'registration_requests' table)
    const existing = await model.checkExistingUser(email);
    
    if (existing) {
        if (existing.type === 'user') {
            throw new APIError('A user with this email already exists and is active.', 409); 
        }
        
        // 🛑 NEW COOLDOWN LOGIC 🛑
        if (existing.type === 'request') {
            const requestId = existing.data.request_id;
            const status = existing.data.status;
            
            if (status === 'PENDING') {
                throw new APIError('Your registration request is already submitted and pending administrator approval.', 409);
            }

            // यदि स्टेटस PENDING_VERIFICATION है, तो कूलडाउन चेक करें
            if (status === 'PENDING_VERIFICATION') {
                
                // Fetch the creation time of the existing OTP record
                const otpRecord = await otpModel.fetchOtpCreationTime(requestId);

                if (otpRecord && otpRecord.created_at) {
                    const timeElapsedMs = new Date().getTime() - otpRecord.created_at.getTime();
                    
                    if (timeElapsedMs < OTP_RESEND_COOLDOWN_MS) {
                        const timeRemainingSeconds = Math.ceil((OTP_RESEND_COOLDOWN_MS - timeElapsedMs) / 1000);
                        const timeRemainingMinutes = Math.ceil(timeRemainingSeconds / 60);

                        throw new APIError(`A verification code was recently sent. Please wait ${timeRemainingMinutes} minute(s) before requesting a new one.`, 429); // 429 Too Many Requests
                    }
                }
                
                // यदि कूलडाउन बीत गया है, तो नया OTP जेनरेट करके भेजें (और DB में अपडेट करें)
            } else {
                // अन्य लंबित स्टेटस को ब्लॉक करें
                throw new APIError('A pending registration request for this email already exists.', 409);
            }
        }
    }
    
    // HASH PASSWORD
    const hashedPassword = await hashPassword(password);

    const requestData = { 
        fullName, 
        email, 
        justificationMessage, 
        password: hashedPassword 
    };
    
    // 2. Table में PENDING_VERIFICATION स्टेटस के साथ Save करें या UPDATE करें (यदि PENDING_VERIFICATION में है और कूलडाउन समाप्त)
    let currentRequestId = (existing && existing.data.request_id) || null;
    let newRequest;

    if (currentRequestId) {
        // यदि कूलडाउन बीत गया है, तो पुरानी रिक्वेस्ट को अपडेट करें (ताकि history/request_id वही रहे)
        newRequest = await model.updateRegistrationRequest(currentRequestId, requestData, 'PENDING_VERIFICATION');
    } else {
        // नई रिक्वेस्ट बनाएं
        newRequest = await model.createRegistrationRequest(requestData, 'PENDING_VERIFICATION');
    }
    
    // 3. नया OTP जेनरेट और सेव करें
    const otpCode = generateOtp(6);
    const otpExpiresAt = getOtpExpiryTime(5); // 5 मिनट एक्सपायरी

    // otpModel.saveOrUpdateOtp लॉजिक पहले से ही attempts को 0 पर सेट करता है
    await otpModel.saveOrUpdateOtp(newRequest.request_id, otpCode, otpExpiresAt);

    // 4. OTP ईमेल भेजें
    sendOtpVerificationEmail({
        email: requestData.email,
        fullName: requestData.fullName,
        otpCode: otpCode
    }).catch(err => console.error("OTP Email failed:", err.message));
    
    // 5. सफलता प्रतिक्रिया
    res.status(202).json({
        status: 'pending_email_verification',
        message: 'Registration request initiated. Please check your email for the OTP to complete the verification.',
        data: { requestId: newRequest.request_id, email: newRequest.email }
    });
});


// -------------------------------------------------------------
// B. Registration Verification (POST /api/auth/local/verify-otp)
// -------------------------------------------------------------

const verifyOtpAndPromote = asyncHandler(async (req, res, next) => {
    const { requestId, otp } = req.body;

    if (!requestId || !otp) {
        throw new APIError('Request ID and OTP are required for verification.', 400);
    }

    // 1. OTP को सत्यापित करें
    const isVerified = await otpModel.verifyOtp(requestId, otp);

    if (isVerified) {
        // 2. Request status को PENDING में अपडेट करें
        const requestDetails = await model.promoteRequestToPending(requestId);
        
        if (!requestDetails) {
            throw new APIError('Could not find pending request for final promotion.', 404);
        }

        // 3. Admin और User को अंतिम ईमेल भेजें
        sendRegistrationRequestToAdmin(requestDetails) 
            .catch(err => console.error("Admin Approval Email failed:", err.message)); 
            
        sendRegistrationConfirmationToUser(requestDetails) 
            .catch(err => console.error("User Confirmation Email failed:", err.message)); 
        
        // 4. सफलता प्रतिक्रिया (Success Response)
        res.status(200).json({
            status: 'pending_admin_approval',
            message: 'Email successfully verified. Your registration request has been submitted for administrator approval.',
            data: { requestId: requestId, email: requestDetails.email }
        });
    }
});


// -------------------------------------------------------------
// C. Traditional Password Login (Keep this as fallback/alternative)
// -------------------------------------------------------------

const login = asyncHandler(async (req, res) => {
    // ... (Your existing login logic remains here)
});


// -------------------------------------------------------------
// D. Request OTP Login (POST /api/auth/local/request-otp-login) ⭐ NEW SECTION ⭐
// -------------------------------------------------------------

const requestOtpLogin = asyncHandler(async (req, res, next) => {
    const { email } = req.body;

    if (!email) {
        throw new APIError('Email is required to request login OTP.', 400);
    }
    
    // 1. Check if user is active
    const user = await model.findActiveUserByEmail(email);

    if (!user) {
        // सुरक्षा कारणों से सामान्य त्रुटि संदेश का उपयोग करें
        throw new APIError('Login failed: Invalid email or account is not active.', 401);
    }
    
    const userId = user.user_id;

    // 2. Cooldown Check (Reuse Logic - user_otp table uses user_id as its foreign key)
    const otpRecord = await otpModel.fetchOtpCreationTime(userId);

    if (otpRecord && otpRecord.created_at) {
        const timeElapsedMs = new Date().getTime() - otpRecord.created_at.getTime();
        
        if (timeElapsedMs < OTP_RESEND_COOLDOWN_MS) {
            const timeRemainingSeconds = Math.ceil((OTP_RESEND_COOLDOWN_MS - timeElapsedMs) / 1000);
            const timeRemainingMinutes = Math.ceil(timeRemainingSeconds / 60);

            throw new APIError(`A login code was recently sent. Please wait ${timeRemainingMinutes} minute(s) before requesting a new one.`, 429); 
        } 
    }

    // 3. Generate and Save New OTP (Reuse Logic)
    const otpCode = generateOtp(6);
    const otpExpiresAt = getOtpExpiryTime(5); // 5 minutes expiry

    // Note: Active user_id is used here
    await otpModel.saveOrUpdateOtp(userId, otpCode, otpExpiresAt); 

    // 4. Send OTP Email (Using the new login-specific email function)
    sendOtpLoginEmail({ 
        email: user.email, 
        fullName: user.full_name, 
        otpCode: otpCode,
    }).catch(err => console.error("Login OTP Email failed:", err.message));
    
    // 5. Success response
    res.status(200).json({
        status: 'otp_sent',
        message: 'A one-time login code has been sent to your email.',
        data: { userId: userId, email: user.email }
    });
});


// -------------------------------------------------------------
// E. Verify OTP Login (POST /api/auth/local/verify-otp-login) ⭐ NEW SECTION ⭐
// -------------------------------------------------------------

const verifyOtpLogin = asyncHandler(async (req, res, next) => {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
        throw new APIError('User ID and OTP are required for login verification.', 400);
    }
    
    // 1. Verify the OTP (otpModel.verifyOtp handles attempts, expiry, and record deletion)
    const isVerified = await otpModel.verifyOtp(userId, otp);

    if (isVerified) {
        // 2. Fetch User Data (using the new findUserById)
        const user = await model.findUserById(userId); 
        
        if (!user || !user.is_active) {
             // Verification successful, but user got deactivated in the meantime
             throw new APIError('Login failed: Account not found or is inactive.', 404);
        }

        // 3. Update Last Login (from your original model)
        await model.updateLastLogin(userId);

        // 4. Generate JWT Tokens
        const tokens = generateAuthTokens(user);

        // 5. Success Response
        res.status(200).json({
            status: 'success',
            message: 'Login successful.',
            user: {
                userId: user.user_id,
                fullName: user.full_name,
                email: user.email,
                role: user.role_name
            },
            tokens: tokens
        });
    }
});


module.exports = {
    registerRequest,
    verifyOtpAndPromote, 
    login,
    requestOtpLogin, // ⭐ NEW EXPORT
    verifyOtpLogin,  // ⭐ NEW EXPORT
};