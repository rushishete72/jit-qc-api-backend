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
            // console.log('QUERY:', e.query); 
        }
    }
});

const isSSL = process.env.DB_SSL === 'true';

// 🔑 FIX: SSL कॉन्फ़िगरेशन को `pg-promise` के लिए विशिष्ट रूप से परिभाषित करें।
const sslConfig = isSSL ? { 
    // Render/Cloud DBs के लिए आवश्यक है
    rejectUnauthorized: false, 
    // कुछ Node.js वर्ज़न को स्पष्ट SSL मोड की आवश्यकता होती है
    require: true 
} : false;


/**
 * @typedef {object} ConnectionConfig
 * @property {string} host - Database host name or IP address.
 * @property {number} port - Database port number (default 5432).
 * @property {string} database - Database name.
 * @property {string} user - Database user.
 * @property {string} password - Database password.
 * @property {object|boolean} ssl - SSL configuration for secure connection.
 * @property {number} max - Maximum number of connections in the pool.
 */
/** @type {ConnectionConfig} */
const cn = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432, 
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    // 🔑 FIX: ऊपर परिभाषित मजबूत SSL कॉन्फ़िगरेशन का उपयोग करें
    ssl: sslConfig, 
    max: 10 // Max connections in the pool
};

if (!cn.database || !cn.user || !cn.password) {
    console.error("❌ CRITICAL ERROR: Missing DB_NAME, DB_USER, or DB_PASSWORD in environment variables.");
}

/** The initialized database connection object. */
// 🔑 FIX: DATABASE_URL को प्राथमिकता दें, लेकिन cn को फ़ॉलबैक के रूप में रखें
const connectionString = process.env.DATABASE_URL;

// यदि URL है, तो URL + SSL कॉन्फ़िगरेशन का उपयोग करें
let dbConfig;
if (connectionString) {
    dbConfig = {
        connectionString: connectionString,
        ssl: sslConfig // URL के साथ SSL कॉन्फ़िगरेशन जोड़ें
    };
} else {
    // URL नहीं है, तो cn ऑब्जेक्ट का उपयोग करें
    dbConfig = cn;
}

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
        console.error("❌ Database Connection Failed. Check environment variables and host status.");
        // अब error.message को सीधे दिखाएँ ताकि SSL समस्या स्पष्ट हो
        throw new Error(`DB Connection Failed: ${error.message}`); 
    }
}

/**
 * Utility: Securely drops all User-Defined Tables in the public schema (CASCADE).
 * This is primarily used during development/testing for schema resets.
 * @async
 * @returns {Promise<void>} Resolves when all tables are dropped or if none were found.
 * @throws {Error} Throws error if the drop process fails.
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

        // Format drop queries securely using pgp.as.format to prevent SQL injection
        const dropQueries = tables.map(t => pgp.as.format('DROP TABLE IF EXISTS "$1^" CASCADE;', t.tablename));
        const finalDropQuery = dropQueries.join('\n');
        
        await db.none(finalDropQuery);
        console.log(`✅ Successfully dropped ${tables.length} tables.`);

    } catch (error) {
        console.error('❌ ERROR during table drop process:', error.message);
        throw error; 
    }
}


module.exports = {
    db, // The main database instance
    pgp, // The pg-promise library instance
    dropAllTables, // Utility to clean schema
    initializeDB // Utility to check connection
};