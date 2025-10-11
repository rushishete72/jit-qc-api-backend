/**
 * @fileoverview यह यूटिलिटी फ़ंक्शन Express के एसिंक्रोनस (asynchronous) 
 * रूट हैंडलर्स को रैप करता है।
 * यह Express में `try-catch` ब्लॉक की आवश्यकता को समाप्त करता है, 
 * क्योंकि यह स्वचालित रूप से किसी भी त्रुटि को पकड़ता है 
 * और उसे ग्लोबल एरर हैंडलिंग मिडिलवेयर (`next`) में भेज देता है।
 */

/**
 * Express async route handler wrapper. 
 * This utility function automatically catches errors from asynchronous functions 
 * and passes them to the Express error handling middleware (next).
 * * @param {Function} fn - एसिंक्रोनस Express रूट हैंडलर फ़ंक्शन (async (req, res, next) => { ... })
 * @returns {Function} - एक नया Express मिडिलवेयर फ़ंक्शन जो त्रुटियों को संभालता है।
 */
const asyncHandler = (fn) => (req, res, next) => {
    /**
     * @description रूट हैंडलर फ़ंक्शन (`fn`) को चलाता है,
     * और यदि वह एक Promise देता है (जो कि async फ़ंक्शन करता है),
     * तो यह सुनिश्चित करता है कि Promise का समाधान किया जाए।
     * यदि Promise रिजेक्ट हो जाता है (त्रुटि होती है), तो त्रुटि को 
     * सीधे Express के `next()` फ़ंक्शन में पास कर दिया जाता है।
     */
    Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * @exports {Function} asyncHandler - Express एसिंक्रोनस रूट हैंडलर को रैप करने के लिए फ़ंक्शन।
 */
module.exports = asyncHandler;