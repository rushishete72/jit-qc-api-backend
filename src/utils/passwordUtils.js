// utils/passwordUtils.js

const bcrypt = require('bcryptjs');

// 10 is a standard, secure, and performant number of salt rounds.
const SALT_ROUNDS = 10; 

/**
 * पासवर्ड को हैश करने के लिए उपयोग किया जाता है।
 * इसका उपयोग रजिस्ट्रेशन (और Admin द्वारा उपयोगकर्ता निर्माण) के दौरान किया जाता है।
 * @param {string} password - सादे-पाठ वाला पासवर्ड।
 * @returns {Promise<string>} - हैश्ड पासवर्ड।
 */
const hashPassword = async (password) => {
    try {
        const salt = await bcrypt.genSalt(SALT_ROUNDS);
        const hash = await bcrypt.hash(password, salt);
        return hash;
    } catch (error) {
        console.error("Error during password hashing:", error);
        throw new Error("Password hashing failed due to an internal error.");
    }
};

/**
 * दिए गए सादे-पाठ वाले पासवर्ड की डेटाबेस में संग्रहीत हैश्ड पासवर्ड से तुलना करता है।
 * इसका उपयोग लॉगिन प्रक्रिया के दौरान किया जाता है।
 * @param {string} password - सादे-पाठ वाला पासवर्ड जो उपयोगकर्ता ने दर्ज किया है।
 * @param {string} hash - डेटाबेस से प्राप्त हैश्ड पासवर्ड।
 * @returns {Promise<boolean>} - यदि पासवर्ड मेल खाता है तो True, अन्यथा False।
 */
const comparePassword = async (password, hash) => {
    try {
        const isMatch = await bcrypt.compare(password, hash);
        return isMatch;
    } catch (error) {
        console.error("Error during password comparison:", error);
        throw new Error("Password comparison failed due to an internal error.");
    }
};


module.exports = {
    hashPassword,
    comparePassword,
};