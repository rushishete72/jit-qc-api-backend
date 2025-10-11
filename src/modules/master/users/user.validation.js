/**
 * @fileoverview Centralized Data Validation Utilities.
 * @description यह मॉड्यूल विभिन्न API एंडपॉइंट्स के लिए इनपुट डेटा को मान्य (validate) करने के लिए
 * केंद्रीयकृत हेल्पर फ़ंक्शंस प्रदान करता है, विशेष रूप से ID पैरामीटर्स और CRUD डेटा के लिए।
 * @module utils/validation
 */

// 🔑 UPGRADE: ID वैलिडेशन को केंद्रीयकृत करें

/**
 * URL पैरामीटर से ID को पार्स और मान्य करता है।
 * @function handleIdValidation
 * @param {string | number} id - URL पैरामीटर से प्राप्त ID मान (स्ट्रिंग के रूप में प्राप्त होने की संभावना)।
 * @param {string} [paramName='ID'] - उस पैरामीटर का नाम जिसे मान्य किया जा रहा है (जैसे 'Role ID', 'User ID')।
 * @returns {{error: string} | {id: number}} - यदि अमान्य है तो त्रुटि संदेश के साथ एक ऑब्जेक्ट, अन्यथा पार्स की गई संख्यात्मक ID के साथ एक ऑब्जेक्ट।
 * @throws {object} यदि ID संख्यात्मक नहीं है या सकारात्मक पूर्णांक नहीं है।
 */
const handleIdValidation = (id, paramName = 'ID') => {
    const parsedId = parseInt(id, 10);
    if (isNaN(parsedId) || parsedId <= 0) {
        return { error: `Invalid ${paramName} provided in the URL. Must be a positive integer.` };
    }
    return { id: parsedId };
};

/**
 * रोल क्रिएशन डेटा के लिए सत्यापन लॉजिक।
 * @function validateRoleCreation
 * @param {object} data - req.body. अपेक्षा है कि इसमें `role_name` और वैकल्पिक रूप से `description` हो।
 * @returns {string | null} - त्रुटि संदेश या null यदि मान्य हो।
 * @detail यह फ़ंक्शन `role_name` की उपस्थिति और न्यूनतम लंबाई (3 वर्ण) और `description` की अधिकतम लंबाई (255 वर्ण) की जाँच करता है।
 */
const validateRoleCreation = (data) => {
    if (!data.role_name || data.role_name.trim().length < 3) {
        return 'Role name is required and must be at least 3 characters long.';
    }
    if (data.description && data.description.length > 255) {
        return 'Description cannot exceed 255 characters.';
    }
    // Note: is_active (boolean) के लिए जाँच मॉडल द्वारा संभाली जाती है या यदि प्रदान की जाती है तो उसे boolean होना चाहिए।
    return null;
};

/**
 * नए यूजर के लिए आवश्यक फ़ील्ड और फॉर्मेट की जाँच करता है।
 * @function validateUserCreation
 * @param {object} data - req.body. अपेक्षा है कि इसमें `username`, `password`, `full_name`, और `role_id` हो।
 * @returns {string | null} - त्रुटि संदेश या null यदि मान्य हो।
 * @detail यह फ़ंक्शन सुनिश्चित करता है कि username (न्यूनतम 4 वर्ण), password (न्यूनतम 8 वर्ण), full_name (न्यूनतम 3 वर्ण), और role_id (संख्यात्मक) मौजूद और मान्य हैं।
 */
const validateUserCreation = (data) => {
    if (!data.username || data.username.length < 4) {
        return 'Username is required and must be at least 4 characters.';
    }
    if (!data.password || data.password.length < 8) {
        return 'Password is required and must be at least 8 characters long.';
    }
    if (!data.full_name || data.full_name.length < 3) {
        return 'Full Name is required.';
    }
    // role_id को parseInt करके जाँच करता है कि यह एक मान्य संख्या है
    if (!data.role_id || isNaN(parseInt(data.role_id, 10))) {
        return 'Valid Role ID is required.';
    }
    // अन्य फ़ील्ड, जैसे email/phone का regex validation यहाँ जोड़ा जा सकता है।

    return null;
};

/**
 * यूजर अपडेट डेटा (PUT/PATCH) के लिए जाँच करता है।
 * @function validateUserUpdate
 * @param {object} data - req.body.
 * @returns {string | null} - त्रुटि संदेश या null यदि मान्य हो।
 * @detail यह फ़ंक्शन सुनिश्चित करता है कि अपडेट के लिए कम से कम एक मान्य फ़ील्ड (`username`, `employee_id`, `full_name`, `email`, `phone`, `role_id`, `is_active`) मौजूद हो और `role_id` संख्यात्मक हो।
 */
const validateUserUpdate = (data) => {
    // पासवर्ड को छोड़कर कम से कम एक फ़ील्ड अपडेट के लिए मौजूद होना चाहिए
    const fields = ['username', 'employee_id', 'full_name', 'email', 'phone', 'role_id', 'is_active'];
    const hasData = fields.some(field => data.hasOwnProperty(field));
    
    if (!hasData) {
        return 'No valid fields provided for update.';
    }
    
    if (data.role_id && isNaN(parseInt(data.role_id, 10))) {
        return 'Role ID must be a valid number.';
    }

    // यहाँ प्रत्येक फ़ील्ड के लिए अलग से फ़ॉर्मेट की जाँच की जा सकती है।
    return null;
};

/**
 * जाँच करता है कि दिया गया मान संख्यात्मक है या नहीं।
 * @function isNumeric
 * @param {*} value - जाँच किया जाने वाला मान।
 * @returns {boolean} - यदि मान संख्यात्मक है तो `true`।
 */
const isNumeric = (value) => !isNaN(parseFloat(value)) && isFinite(value);


module.exports = {
    handleIdValidation, // 🔑 UPGRADE: Centralized Helper
    validateRoleCreation,
    validateUserCreation,
    validateUserUpdate,
    isNumeric,
};