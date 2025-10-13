// server.js (THE FINAL, STABLE LAUNCHER FILE)

// -------------------------------------------------------------------------
// 0. CONFIGURATION & IMPORTS
// -------------------------------------------------------------------------

require('dotenv').config(); 

const app = require('./src/app');
const { initializeDB } = require('./database/db'); 
const { initializeTransporter, setTransporter } = require('./src/utils/emailService'); 

const PORT = process.env.PORT || 4000; 
const NODE_ENV = process.env.NODE_ENV || 'development';

// -------------------------------------------------------------------------
// 1. SERVER START SEQUENCE
// -------------------------------------------------------------------------

async function startServer() {
    console.log(`\n--- JIT/QC API STARTUP SEQUENCE (ENV: ${NODE_ENV}) ---`);
    
    try {
        // 1. DB चेक
        console.log('--- ⏳ Performing Database Pre-Flight Check... ---');
        await initializeDB(); 
        console.log('✅ Database connection established successfully.');

        // 2. Transporter इनिशियलाइज़ेशन (यह ऑपरेशन को ब्लॉक करता है)
        console.log('--- ⏳ Initializing Email Service... ---');
        const t = await initializeTransporter();
        setTransporter(t); 
        
        if (t) {
            console.log('✅ Email Transporter successfully initialized.');
        } else {
             // यह लॉग तभी प्रिंट होगा जब Ethereal पूरी तरह से विफल हो जाए
             console.log('⚠️ WARN: Email Transporter initialized as NULL (Ethereal failed). Email sending will be skipped.');
        }

        // 3. Express सर्वर को सुनना शुरू करें
        if (NODE_ENV !== 'test') {
            app.listen(PORT, () => {
                console.log('--------------------------------------------------');
                console.log(`🚀 JIT/QC API Server stable on port ${PORT}.`);
                console.log(`  Running in ${NODE_ENV} mode.`);
                console.log('--------------------------------------------------');
            });
        }
        
    } catch (error) {
        console.error('🛑 CRITICAL: Server failed to start due to pre-flight check error.');
        console.error(error.message);
        process.exit(1); 
    }
}


startServer();
module.exports = app;