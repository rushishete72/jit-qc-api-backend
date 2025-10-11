/**
 * @fileoverview यह फ़ाइल Express API के लिए कस्टम त्रुटि प्रबंधन (error handling) 
 * प्रदान करती है। इसमें एक कस्टम `APIError` क्लास और एक केंद्रीकृत 
 * (`errorHandlerMiddleware`) शामिल है जो त्रुटियों को साफ, मानक JSON 
 * प्रतिक्रियाओं (responses) में बदलता है।
 */

/**
 * Express API के लिए कस्टम एरर क्लास।
 * यह क्लास एक विशिष्ट HTTP स्टेटस कोड और मैसेज के साथ एरर को रैप करती है।
 * @extends {Error}
 */
class APIError extends Error {
    /**
     * @constructor
     * @param {string} message - उपयोगकर्ता को दिखाने के लिए एरर मैसेज।
     * @param {number} [statusCode=500] - एरर के लिए उपयुक्त HTTP स्टेटस कोड (e.g., 400, 401, 404).
     */
    constructor(message, statusCode = 500) {
        super(message);
        /** * @property {number} statusCode - HTTP प्रतिक्रिया में उपयोग किया जाने वाला स्टेटस कोड। 
         */
        this.statusCode = statusCode;
        // सुनिश्चित करें कि स्टैक ट्रेस (stack trace) सही ढंग से कैप्चर हो, 
        // इस क्लास के निर्माण को स्टैक से बाहर रखा जाए।
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * एक केंद्रीकृत (centralized) एक्सप्रेस एरर हैंडलर मिडलवेयर।
 * इसे Express पाइपलाइन में अंतिम मिडलवेयर के रूप में जोड़ा जाना चाहिए।
 * @param {Error|APIError} err - Express द्वारा पास किया गया एरर ऑब्जेक्ट।
 * @param {express.Request} req - Express Request ऑब्जेक्ट।
 * @param {express.Response} res - Express Response ऑब्जेक्ट।
 * @param {express.NextFunction} next - अगले मिडलवेयर को कॉल करने के लिए फ़ंक्शन (अनिवार्य नहीं)।
 * @returns {void} - क्लाइंट को JSON प्रतिक्रिया भेजता है।
 */
const errorHandlerMiddleware = (err, req, res, next) => {
    // 500 (Internal Server Error) को डिफ़ॉल्ट स्टेटस कोड मानें
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';

    // विशेष डेटाबेस त्रुटियों को हैंडल करें (उदाहरण के लिए, Mongoose/Joi 'ValidationError')
    if (err.name === 'ValidationError') {
        statusCode = 400;
        // त्रुटियों की सूची को एक पठनीय (readable) स्ट्रिंग में परिवर्तित करें
        message = Object.values(err.errors).map(val => val.message).join(', ');
    }
    // अन्य विशिष्ट एरर हैंडलिंग यहाँ जोड़ी जा सकती है (e.g., JWT errors, DB connection errors)
    
    // डेवलपमेंट में कंसोल पर एरर लॉग करें (NODE_ENV=production में संवेदनशील डेटा छुपाता है)
    if (process.env.NODE_ENV === 'development') {
        console.error('--- API Error Details ---');
        console.error(`Status: ${statusCode}`);
        console.error(`Message: ${message}`);
        console.error('Stack:', err.stack);
        console.error('--------------------------');
    }

    // क्लाइंट को प्रतिक्रिया (Response) भेजें
    res.status(statusCode).json({
        success: false,
        message: message
    });
};

/**
 * @exports {object}
 * @property {APIError} APIError - कस्टम त्रुटि क्लास।
 * @property {Function} errorHandlerMiddleware - ग्लोबल एरर हैंडलिंग मिडलवेयर।
 */
module.exports = {
    APIError,
    errorHandlerMiddleware
};