// File: database/reset_and_seed.js (FINAL ZT FIX - Drop Logic Integrated)

const fs = require('fs');
const path = require('path');
// ✅ FIXED IMPORT: dropAllTables को db.js से import नहीं करते
const { db, pgp, initializeDB } = require('./db'); 

// 🎯 कॉन्फ़िगरेशन
const SCHEMA_DIR = path.join(__dirname, 'schema_modules'); 
const SEED_DIR = path.join(__dirname, 'seed_data');

/**
 * फ़ाइल सिस्टम से सभी .sql फ़ाइलों को पढ़ता है।
 */
function getSqlFiles(dirPath) {
    try {
        const files = fs.readdirSync(dirPath);
        return files
            .filter(file => file.endsWith('.sql'))
            .sort() 
            .map(file => path.join(dirPath, file));
    } catch (error) {
        console.error(`❌ Error reading directory ${dirPath}:`, error.message);
        return [];
    }
}

/**
 * ⚡️ DDL Runner का अपना dropAllTables फ़ंक्शन।
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

        const dropQueries = tables.map(t => pgp.as.format('DROP TABLE IF EXISTS "$1^" CASCADE;', [t.tablename]));
        const finalDropQuery = dropQueries.join('\n');
        
        await db.none(finalDropQuery);
        console.log(`✅ Successfully dropped ${tables.length} tables.`);

    } catch (error) {
        console.error('❌ ERROR during table drop process:', error.message);
        throw error; 
    }
}


/**
 * DDL Runner फ़ंक्शन।
 */
async function executeSchema(files, forceReset = false) {
    if (forceReset) {
        console.log('--- ⚠️ FORCE RESET: Executing Dynamic Drop. ---');
        await dropAllTables(); // 👈 अपनी लोकल ड्रॉप फ़ंक्शन को कॉल करता है
    }
    
    for (const file of files) {
        const fileName = path.basename(file);
        console.log(`--- Executing DDL: ${fileName}`);
        const schemaSQL = fs.readFileSync(file, { encoding: 'utf-8' });
        try {
            await db.none(schemaSQL);
            console.log(`✅ Schema ${fileName} processed.`);
        } catch (error) {
            console.error(`❌ DDL Execution FAILED in file ${fileName}:`, error.message);
            throw error; 
        }
    }
}


/**
 * मुख्य processDatabase फ़ंक्शन।
 */
async function processDatabase(resetAndSeed = true, forceReset = false) {
    console.log('\n--- ⏳ Starting JIT/QC Database Setup... ---');

    // 💡 FIX: initializeDB को db.js से कॉल करें
    try {
        await initializeDB(); 
    } catch (error) {
        console.error('❌ FATAL: Database Connection Failed (Check password in db.js)');
        pgp.end();
        process.exit(1);
    }
    
    // ... बाकी लॉजिक वैसा ही रहेगा
    const schemaFiles = getSqlFiles(SCHEMA_DIR);
    const seedFiles = getSqlFiles(SEED_DIR);

    if (schemaFiles.length === 0) {
        console.error('❌ No schema SQL files found. Exiting.');
        pgp.end();
        process.exit(1);
    }

    try {
        await executeSchema(schemaFiles, forceReset);
        console.log('✅ All Schemas processed successfully (No full drop unless forced).');
        
        if (resetAndSeed) {
            console.log('\n--- 🌱 Executing Seed Data... ---');
            for (const file of seedFiles) {
                const fileName = path.basename(file);
                console.log(`--- Seeding Data: ${fileName}`);
                const seedSQL = fs.readFileSync(file, { encoding: 'utf-8' });
                await db.none(seedSQL);
                console.log(`✅ Seed data ${fileName} loaded successfully.`);
            }
        }
    } catch (error) {
        console.error('❌ Database Setup FAILED!');
        console.error(error);
        process.exit(1);
    } finally {
        pgp.end(); 
        console.log('--- ✅ Database Setup Complete. Connection closed. ---\n');
    }
}

// CLI Execution:
const args = process.argv.slice(2);
const forceReset = args.includes('--force-reset');
const runSeed = !args.includes('--no-seed'); 

processDatabase(runSeed, forceReset);