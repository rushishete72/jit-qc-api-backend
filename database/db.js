/**
 * @fileoverview Database Connection Module: Initializes and exports the PostgreSQL connection using pg-promise.
 * @description यह मॉड्यूल पर्यावरण चर (environment variables) से कनेक्शन विवरण लोड करता है, 
 * SSL को क्लाउड होस्टिंग (जैसे Render) के लिए कॉन्फ़िगर करता है, और कनेक्शन जांच 
 * और स्कीमा रीसेट के लिए यूटिलिटीज प्रदान करता है।
 * @module database/db
 */

const pgp = require('pg-promise')({
    /** Enables formatting helpers like $1^ for SQL names */
    capSQL: true, 
    /** Log queries in development mode */
    query: (e) => {
        if (process.env.NODE_ENV === 'development') {
            // FIX: Check for the existence of ctx and duration before accessing to prevent crash.
            if (e.ctx && e.ctx.duration && e.ctx.duration > 100) {
                 console.log(`[DB SLOW] ${e.query.substring(0, 50)}... (${e.ctx.duration.toFixed(2)}ms)`);
            }
        }
    }
});

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    // We enforce the use of DATABASE_URL for simplicity and Render compatibility
    throw new Error("❌ CRITICAL ERROR: DATABASE_URL is not set in environment variables.");
}

const isSSL = process.env.DB_SSL === 'true';

// SSL Configuration for Render/external DBs
const sslConfig = isSSL ? { 
    // Render/Cloud DBs के लिए आवश्यक है
    rejectUnauthorized: false, 
    // कुछ Node.js वर्ज़न को स्पष्ट SSL मोड की आवश्यकता होती है
    require: true 
} : false;


/**
 * @typedef {object} DbConfig
 * @property {string} connectionString - The full secure URL.
 * @property {object|boolean} ssl - SSL configuration for secure connection.
 * @property {number} max - Maximum number of connections in the pool.
 */

// -------------------------------------------------------------------------
// 🔑 CONNECTION CONFIGURATION
// -------------------------------------------------------------------------

/** @type {DbConfig} */
const dbConfig = {
    connectionString: connectionString,
    ssl: sslConfig, // URL with explicit SSL configuration
    max: 10 // Max connections in the pool
};

/** The initialized database connection object. */
const db = pgp(dbConfig);


/**
 * DB Connection Check: Attempts a connection to verify credentials and reachability.
 * @async
 * @returns {Promise<void>} Resolves if connection is successful.
 * @throws {Error} Throws error if connection fails.
 */
async function initializeDB() {
    console.log('--- ⏳ Performing Database Pre-Flight Check... ---');
    try {
        const client = await db.connect(); // Attempts to borrow a connection
        client.done(); // Releases the connection back to the pool
        console.log("✅ Database connection established successfully.");
    } catch (error) {
        console.error("❌ Database Connection Failed. Check DATABASE_URL and host status.");
        // Now show error.message for clear SSL/Host issue diagnosis
        throw new Error(`DB Connection Failed: ${error.message}`); 
    }
}

/**
 * Utility: Securely drops all User-Defined Tables and custom types (like ENUMs) in the public schema (CASCADE).
 * This is primarily used during development/testing for schema resets.
 * @async
 * @returns {Promise<void>} Resolves when all tables are dropped or if none were found.
 * @throws {Error} Throws error if the drop process fails.
 */
async function dropAllTables() {
    console.log('--- 🧹 Dropping all existing user tables and types (CASCADE) ---');
    
    // 1. Drop all custom types/enums (e.g., user_role)
    await db.none(`
        DROP TYPE IF EXISTS user_role CASCADE;
    `);

    // 2. Get and Drop Tables
    const tableNames = await db.any(`
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public' 
        AND tablename NOT LIKE 'pg_%' 
        AND tablename NOT LIKE 'sql_%';
    `);

    if (tableNames.length > 0) {
        // Format drop queries securely using pgp.as.format
        const dropQueries = tableNames.map(t => pgp.as.format('DROP TABLE IF EXISTS "$1^" CASCADE;', t.tablename));
        const finalDropQuery = dropQueries.join('; ');
        
        await db.none(finalDropQuery);
        console.log(`✅ Successfully dropped ${tableNames.length} tables.`);
    } else {
        console.log('--- ℹ️ No user tables found to drop. ---');
    }
}


module.exports = {
    db, // The main database instance
    pgp, // The pg-promise library instance
    dropAllTables, // Utility to clean schema
    initializeDB // Utility to check connection
};