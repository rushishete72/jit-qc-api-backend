// server.js (THE FINAL, MINIMAL LAUNCHER FILE)

// -------------------------------------------------------------------------
// 0. CONFIGURATION & IMPORTS
// -------------------------------------------------------------------------

/**
 * @description 1. ENV वेरिएबल्स को सबसे पहले लोड करें। यह सुनिश्चित करता है कि
 * पोर्ट, DB क्रेडेंशियल्स और JWT सीक्रेट सहित सभी आवश्यक कॉन्फ़िगरेशन
 * एप्लिकेशन लॉजिक के चलने से पहले उपलब्ध हों।
 */
require('dotenv').config(); 

// 2. Express App Builder और DB Initialize फ़ंक्शन्स को इंपोर्ट करें
const app = require('./src/app');
const { initializeDB } = require('./database/db'); 

// 3. Environment Variables या Fallbacks सेट करें
const PORT = process.env.PORT || 4000; 
const NODE_ENV = process.env.NODE_ENV || 'development';

// -------------------------------------------------------------------------
// 1. SERVER START SEQUENCE
// -------------------------------------------------------------------------

/**
 * @function startServer
 * @description JIT/QC API सर्वर की मुख्य लॉन्चिंग प्रक्रिया।
 * यह डेटाबेस की स्थिति की जाँच करती है, फिर Express सर्वर को शुरू करती है।
 * @async
 * @returns {Promise<void>} 
 * @throws {Error} यदि DB कनेक्शन विफल हो जाता है या कोई अन्य गंभीर त्रुटि होती है,
 * तो प्रक्रिया 1 कोड के साथ बंद हो जाती है।
 */
async function startServer() {
    console.log(`\n--- JIT/QC API STARTUP SEQUENCE (ENV: ${NODE_ENV}) ---`);
    
    try {
        // 1. DB को इनिशियलाइज़ करें (कनेक्शन की जाँच करें)।
        await initializeDB(); 

        // 🔑 FIX: Express सर्वर को केवल तभी सुनना शुरू करें जब NODE_ENV 'test' न हो।
        if (NODE_ENV !== 'test') {
            // 2. Express सर्वर को सुनना शुरू करें
            app.listen(PORT, () => {
                console.log('--------------------------------------------------');
                console.log(`🚀 JIT/QC API Server stable on port ${PORT}.`);
                console.log(`   Running in ${NODE_ENV} mode.`);
                console.log('--------------------------------------------------');
            });
        }
        
    } catch (error) {
        console.error('🛑 CRITICAL: Server failed to start due to pre-flight check error.');
        console.error(error.message);
        // DB कनेक्शन एरर पर बाहर निकलें।
        process.exit(1); 
    }
}


// सर्वर को शुरू करें
startServer();


// Testing के लिए app को export करें
module.exports = app;