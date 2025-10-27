// database/db.js (FINAL ZT FIX - Correct Exports & Local Connection)

const pgp = require('pg-promise')({
    capSQL: true, 
    query: (e) => {
        if (process.env.NODE_ENV === 'development') {
             // console.log('QUERY:', e.query); 
        }
    }
});

const config = require('../src/config/index');

// 💡 कनेक्शन स्ट्रिंग में 'postgres' यूज़र को फ़ोर्स करें
// यहाँ आपको 'YOUR_ACTUAL_PASSWORD' को अपने PostgreSQL पासवर्ड से बदलना होगा।
const localConnectionString = `postgresql://postgres:YOUR_ACTUAL_PASSWORD@localhost:5432/${config.DB.DB_NAME || 'jit_qc_prod_db'}`;

const cn = {
    // क्लाउड URL को प्राथमिकता दें, लेकिन लोकल URL को फ़ॉलबैक के रूप में उपयोग करें
    connectionString: config.DB.DATABASE_URL || localConnectionString,
    
    // SSL कॉन्फ़िगरेशन
    ssl: config.DB.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: 10 
};

// CRITICAL check
if (!cn.connectionString) {
    console.error("❌ CRITICAL ERROR: Missing DATABASE_URL or required local DB credentials.");
    process.exit(1);
}

const db = pgp(cn);

/**
 * DB Connection Check: (यह export किया जाएगा)
 */
async function initializeDB() {
    console.log('--- ⏳ Performing Database Pre-Flight Check... ---');
    try {
        const client = await db.connect(); 
        client.done(); 
        console.log("✅ Database connection established successfully.");
    } catch (error) {
        console.error("❌ Database Connection Failed. Check environment variables and host status.");
        throw new Error(`DB Connection Failed: ${error.message}`); 
    }
}

// 🚀 FINAL EXPORT: केवल db, pgp, और initializeDB को एक्सपोर्ट करें।
module.exports = {
    db, 
    pgp,
    initializeDB // 👈 dropAllTables यहाँ से हटा दिया गया है
};