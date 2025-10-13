// config/index.js (FINAL ERROR-FREE VERSION)

const dotenv = require('dotenv');

// .env फ़ाइल से मानों को लोड करें। यह Node.js को ENV variables प्रदान करता है।
// यह सुनिश्चित करता है कि आपके सभी क्रेडेंशियल्स process.env में उपलब्ध हों।
dotenv.config({ path: `${process.cwd()}/.env` });

/**
 * एक यूटिलिटी फ़ंक्शन जो यह जांचता है कि महत्वपूर्ण Environment Variable सेट हैं या नहीं।
 * @param {string} key - Environment Variable का नाम।
 * @returns {string} - Variable का मान।
 */
const getRequiredEnv = (key) => {
    const value = process.env[key];
    if (!value) {
        // यदि कोई महत्वपूर्ण env मान गायब है, तो तुरंत क्रैश करें।
        // (जैसे: यदि JWT_SECRET या DATABASE_URL सेट नहीं है)
        throw new Error(`CRITICAL: Environment variable ${key} is not set.`);
    }
    return value;
};

// =======================================================
// Exported Configuration Object
// =======================================================
module.exports = {
    // 1. APPLICATION SETTINGS
    APP: {
        NODE_ENV: process.env.NODE_ENV || 'development',
        PORT: parseInt(process.env.PORT) || 4000,
        HOST: process.env.HOST || 'localhost',
    },

    // 2. SECURITY (JWT) SETTINGS
    SECURITY: {
        // JWT_SECRET अवश्य .env में सेट होना चाहिए।
        JWT_SECRET: getRequiredEnv('JWT_SECRET'),
        JWT_EXPIRY: process.env.JWT_EXPIRY || '1d',
        REFRESH_TOKEN_EXPIRY: process.env.REFRESH_TOKEN_EXPIRY || '7d',
    },

    // 3. DATABASE SETTINGS
    DB: {
        // DATABASE_URL अनिवार्य है (CRITICAL: DATABASE_URL is not set त्रुटि को रोकने के लिए)।
        DATABASE_URL: getRequiredEnv('DATABASE_URL'),
        
        // Local/Dev DB कनेक्शन विवरण
        DB_HOST: process.env.DB_HOST || 'localhost',
        DB_PORT: parseInt(process.env.DB_PORT) || 5432,
        DB_USER: process.env.DB_USER,
        DB_PASSWORD: process.env.DB_PASSWORD,
        DB_NAME: process.env.DB_NAME,
        
        // DB_SSL=true होने पर 'true' लौटेगा
        DB_SSL: process.env.DB_SSL === 'true', 
    },

    // 4. EMAIL SERVICE SETTINGS
    EMAIL: {
        // ये सभी क्रेडेंशियल्स .env में अनिवार्य रूप से मौजूद होने चाहिए।
        HOST: getRequiredEnv('EMAIL_HOST'),
        PORT: parseInt(getRequiredEnv('EMAIL_PORT')),
        USER: getRequiredEnv('EMAIL_USER'),      
        PASSWORD: getRequiredEnv('EMAIL_PASSWORD'), 
        SENDER_NAME: process.env.EMAIL_SENDER_NAME || 'JIT/QC System',
    },

    // 5. GOOGLE OAUTH SETTINGS
    GOOGLE_OAUTH: {
        // ये सभी क्रेडेंशियल्स .env में अनिवार्य रूप से मौजूद होने चाहिए।
        CLIENT_ID: getRequiredEnv('GOOGLE_CLIENT_ID'),
        CLIENT_SECRET: getRequiredEnv('GOOGLE_CLIENT_SECRET'),
        REDIRECT_URI: getRequiredEnv('GOOGLE_REDIRECT_URI'),
    },
};