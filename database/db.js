// database/db.js (Final Optimized Version)

const pgp = require('pg-promise')({
    // ✅ Custom pgp options for better logging and query formatting
    capSQL: true, 
    query: (e) => {
        if (process.env.NODE_ENV === 'development') {
             // console.log('QUERY:', e.query); // आप चाहें तो query लॉगिंग को अनकमेंट कर सकते हैं
        }
    }
});

const config = require('../src/config/index');

// Connection details from the config module
const cn = {
    // Render/Cloud URL को प्राथमिकता दें, लेकिन यदि local उपयोग कर रहे हैं तो detail fallback यहाँ है
    connectionString: config.DB.DATABASE_URL,
    
    // Fallback details (used implicitly by pg-promise if connectionString is complex/unavailable)
    host: config.DB.DB_HOST,
    port: config.DB.DB_PORT, 
    database: config.DB.DB_NAME,
    user: config.DB.DB_USER,
    password: config.DB.DB_PASSWORD,
    
    // ✅ SSL Configuration for cloud databases like Render
    ssl: config.DB.DB_SSL ? { rejectUnauthorized: false } : false,
    max: 10 
};

// CRITICAL check (handled better by config/index.js now, but good to keep a final check)
if (!cn.connectionString && (!cn.database || !cn.user || !cn.password)) {
    console.error("❌ CRITICAL ERROR: Missing DATABASE_URL or required local DB credentials.");
    // Fail fast
    process.exit(1);
}

const db = pgp(cn);

/**
 * Utility: Securely drops all User-Defined Tables in the public schema (CASCADE).
 * Used by the reset_and_seed script for a clean environment.
 */
async function dropAllTables() {
    console.log('--- 🧹 Dropping all existing user tables (CASCADE) ---');
    
    const query = `
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public' 
        AND tablename NOT LIKE 'pg_%' 
        AND tablename NOT LIKE 'sql_%';
    `;
    
    try {
        const tables = await db.any(query);
        
        if (tables.length === 0) {
            console.log('--- ℹ️ No user tables found to drop. Skipping. ---');
            return;
        }

        const dropQueries = tables.map(t => pgp.as.format('DROP TABLE IF EXISTS "$1^" CASCADE;', t.tablename));
        const finalDropQuery = dropQueries.join('\n');
        
        await db.none(finalDropQuery);
        console.log(`✅ Successfully dropped ${tables.length} tables.`);

    } catch (error) {
        console.error('❌ ERROR during table drop process:', error.message);
        throw error; 
    }
}

/**
 * DB Connection Check: Attempts a connection to verify credentials and reachability.
 * Used at application startup.
 */
async function initializeDB() {
    console.log('--- ⏳ Performing Database Pre-Flight Check... ---');
    try {
        // Use db.connect() to verify connection pool health
        const client = await db.connect(); 
        client.done(); // Release the connection back to the pool
        console.log("✅ Database connection established successfully.");
    } catch (error) {
        console.error("❌ Database Connection Failed. Check environment variables and host status.");
        throw new Error(`DB Connection Failed: ${error.message}`); 
    }
}


module.exports = {
    db, 
    pgp,
    dropAllTables, 
    initializeDB
};