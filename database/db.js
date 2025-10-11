// database/db.js (SIMPLIFIED FIX)

const pgp = require('pg-promise')({
    capSQL: true, 
    query: (e) => {
        if (process.env.NODE_ENV === 'development') {
            // Log slow queries or basic info here
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
    rejectUnauthorized: false, 
    require: true 
} : false;


// -------------------------------------------------------------------------
// 🔑 CONNECTION CONFIGURATION
// -------------------------------------------------------------------------

const dbConfig = {
    connectionString: connectionString,
    ssl: sslConfig, // URL with explicit SSL configuration
    max: 10 
};

const db = pgp(dbConfig);


/**
 * DB Connection Check: Attempts a connection to verify credentials and reachability.
 * Uses db.connect() to test the pool.
 * @async
 */
async function initializeDB() {
    console.log('--- ⏳ Performing Database Pre-Flight Check... ---');
    try {
        const client = await db.connect(); 
        client.done(); 
        console.log("✅ Database connection established successfully.");
    } catch (error) {
        console.error("❌ Database Connection Failed. Check DATABASE_URL and host status.");
        throw new Error(`DB Connection Failed: ${error.message}`); 
    }
}

/**
 * Utility: Securely drops all User-Defined Tables and types (like ENUMs).
 * @async
 */
async function dropAllTables() {
    console.log('--- 🧹 Dropping all existing user tables and types (CASCADE) ---');
    
    // 1. Drop all custom types/enums (important before dropping tables)
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
        // Construct the DROP TABLE CASCADE statement
        const dropQueries = tableNames.map(t => pgp.as.format('DROP TABLE IF EXISTS "$1^" CASCADE;', t.tablename));
        const finalDropQuery = dropQueries.join('; ');
        
        await db.none(finalDropQuery);
        console.log(`✅ Successfully dropped ${tableNames.length} tables.`);
    } else {
        console.log('--- ℹ️ No user tables found to drop. ---');
    }
}


module.exports = {
    db, 
    pgp, 
    dropAllTables, 
    initializeDB 
};