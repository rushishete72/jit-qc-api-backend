// utils/errorHandler.js

/**
 * कस्टम API त्रुटि क्लास (Custom API Error Class).
 * यह क्लास हमें HTTP स्टेटस कोड और एक स्पष्ट संदेश के साथ त्रुटियाँ फेंकने (throw) की अनुमति देती है।
 */
class APIError extends Error {
    /**
     * @param {string} message - उपयोगकर्ता को दिखाने वाला त्रुटि संदेश।
     * @param {number} statusCode - मानक HTTP स्टेटस कोड (e.g., 400, 401, 403, 404, 409).
     */
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true; // क्लाइंट-साइड त्रुटियों के लिए (e.g., Bad Request, Unauthorized)

        // Stack Trace को कैप्चर करें (Capture stack trace)
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Express Error Handling Middleware.
 * यह Express में सभी त्रुटियों को पकड़ता है और उन्हें एक JSON प्रतिक्रिया में बदलता है।
 */
const errorHandler = (err, req, res, next) => {
    // 1. यदि यह पहले से एक APIError नहीं है (e.g., एक अनियंत्रित त्रुटि),
    // तो इसे 500 Internal Server Error में बदलें।
    let error = err;
    if (!(error instanceof APIError)) {
        error = new APIError(
            'Internal Server Error. Please try again later.',
            500
        );
    }
    
    // यदि DB त्रुटि या कोई अन्य तकनीकी त्रुटि है
    if (error.statusCode === 500 && process.env.NODE_ENV === 'development') {
        console.error('SERVER ERROR:', err.stack); 
    }

    // 2. क्लाइंट को JSON प्रतिक्रिया भेजें
    res.status(error.statusCode).json({
        status: error.status,
        message: error.message,
        // Development में Stack Trace दिखाएँ
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};

module.exports = {
    APIError,
    errorHandler,
};