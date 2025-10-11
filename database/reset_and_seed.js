/**
 * @fileoverview Database Reset and Seeding Script.
 * @description यह स्क्रिप्ट `schema_modules` और `seed_data` फ़ोल्डरों से सभी SQL फ़ाइलों को पढ़ती है, 
 * उन्हें छिपे हुए अक्षरों के लिए साफ़ करती है, प्रत्येक को एक SQL ट्रांजैक्शन में लपेटती है, 
 * और डेटाबेस को रीसेट करने के बाद उन्हें लागू करती है।
 * @module database/reset_and_seed
 */

require('dotenv').config(); 

const fs = require('fs');
const path = require('path');

/** @typedef {import('pg-promise').IMain} pgp.IMain */
/** @typedef {import('pg-promise').IDatabase} pgp.IDatabase */
/** @typedef {{db: pgp.IDatabase, pgp: pgp.IMain, dropAllTables: function, initializeDB: function}} DbUtilities */

/** @type {DbUtilities} */
const { db, pgp, dropAllTables } = require('./db'); 

const SCHEMA_DIR = path.join(__dirname, 'schema_modules'); 
const SEED_DIR = path.join(__dirname, 'seed_data'); 

/**
 * 🚀 SQL फ़ोल्डर से सभी *.sql फ़ाइलों को क्रम से पढ़ता है और उन्हें DB में चलाता है।
 * @async
 * @param {string} dirPath - SQL फ़ोल्डर का पाथ (e.g., SCHEMA_DIR or SEED_DIR)
 * @param {string} moduleName - लॉगिंग के लिए मॉड्यूल का नाम ('Schema' or 'Seed Data')
 * @returns {Promise<void>}
 */
async function runSqlFiles(dirPath, moduleName) {
    console.log(`\n--- 🏗️ Running ${moduleName} from: ${path.basename(dirPath)} ---`);
    
    if (!fs.existsSync(dirPath)) {
        console.warn(`⚠️ Warning: ${moduleName} directory not found: ${dirPath}. Skipping.`);
        return;
    }

    const files = fs.readdirSync(dirPath)
                    .filter(f => f.endsWith('.sql'))
                    .sort(); // Files must be sorted numerically (e.g., 01, 02)

    if (files.length === 0) {
        console.log(`ℹ️ No ${moduleName} files found. Skipping.`);
        return;
    }

    for (const file of files) {
        const filePath = path.join(dirPath, file);
        
        let sql = fs.readFileSync(filePath, 'utf8');

        // 🔑 FIX: BOM और छिपे हुए करैक्टर को हटाकर SQL स्ट्रिंग को साफ़ करें। 
        sql = sql.replace(/^\uFEFF/u, '').replace(/\u00A0/g, ' ').trim(); 

        if (sql.length === 0) {
            console.log(`   -> Skipping: ${file} (Empty or commented out)`);
            continue;
        }

        // 🔑 FIX: फ़ाइल सामग्री को BEGIN/COMMIT ट्रांजैक्शन ब्लॉक में लपेटें
        const transactionSQL = `
            BEGIN;
            ${sql}
            COMMIT;
        `;

        console.log(`   -> Executing: ${file}`);
        
        // db.query() का उपयोग करें, जो मल्टी-कमांड को ट्रांजैक्शन के भीतर स्वीकार करता है।
        try {
            await db.query(transactionSQL); 
        } catch (error) {
            console.error(`\n❌ SQL Error in ${file}: ${error.message}`);
            throw error; // Propagate the error to stop the seeding process
        }
    }
    console.log(`✅ ${moduleName} execution complete. (${files.length} files processed)`);
}


/**
 * 💡 मुख्य फ़ंक्शन: डेटाबेस को रीसेट करता है, मॉड्यूलर स्कीमा लागू करता है, और सीड डेटा डालता है।
 * @async
 * @returns {Promise<void>}
 */
async function resetAndSeedDatabase() {
    console.log('==================================================');
    console.log('🚀 Starting Database Reset, Creation, and Seeding...');
    console.log('==================================================');
    
    if (!db || typeof dropAllTables !== 'function') {
        console.error('❌ CRITICAL ERROR: Database utility functions are not initialized or available.');
        process.exit(1);
    }

    try {
        // 1. डेटाबेस साफ़ करें (DROP ALL TABLES, including custom types/enums)
        await dropAllTables(); 

        // 2. सभी स्कीमा फ़ाइलें क्रम से चलाएँ 
        await runSqlFiles(SCHEMA_DIR, 'Schema');

        // 3. सभी सीड डेटा फ़ाइलें क्रम से चलाएँ
        await runSqlFiles(SEED_DIR, 'Seed Data');

        console.log('\n==================================================');
        console.log('✨ Database is now clean, updated, and fully seeded.');
        console.log('==================================================');

    } catch (error) {
        console.error('\n❌ CRITICAL ERROR during reset/seeding process:', error.message);
        console.error(`\n-- 🔎 Diagnosis: The error likely occurred in the SQL files within ${SCHEMA_DIR} or ${SEED_DIR}.`);
        process.exit(1);
    } finally {
        // डेटाबेस कनेक्शन पूल को बंद करें।
        if (pgp) {
            pgp.end(); 
        }
    }
}

resetAndSeedDatabase();