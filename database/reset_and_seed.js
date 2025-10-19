// resetAndSeedDatabase.js (Generic Version)

const fs = require('fs');
const path = require('path');
const { db, pgp, dropAllTables } = require('./db'); 

// 🎯 कॉन्फ़िगरेशन: फ़ोल्डर जहाँ आपकी स्कीमा और सीड फ़ाइलें हैं।
const SCHEMA_DIR = path.join(__dirname, 'schema_modules');
const SEED_DIR = path.join(__dirname, 'seed_data');

/**
 * फ़ाइल सिस्टम से सभी .sql फ़ाइलों को अल्फाबेटिक क्रम में पढ़ता है।
 * @param {string} dirPath - फ़ोल्डर का पथ (directory path)
 * @returns {string[]} - सॉर्ट की गई फ़ाइल पथों की ऐरे।
 */
function getSqlFiles(dirPath) {
    try {
        // 1. सभी फ़ाइलों को पढ़ें
        const files = fs.readdirSync(dirPath);
        
        // 2. केवल .sql फ़ाइलें फ़िल्टर करें और सॉर्ट करें (ताकि order में रहें)
        return files
            .filter(file => file.endsWith('.sql'))
            .sort() // Ensure they run in order (e.g., 01_auth.sql, 02_master.sql)
            .map(file => path.join(dirPath, file));
            
    } catch (error) {
        console.error(`❌ Error reading directory ${dirPath}:`, error.message);
        return [];
    }
}

async function resetAndSeedDatabase() {
    console.log('\n--- ⏳ Starting Generic Database Reset and Seeding ---');
    
    // 1. फ़ाइलों को ढूँढें
    const schemaFiles = getSqlFiles(SCHEMA_DIR);
    const seedFiles = getSqlFiles(SEED_DIR);

    if (schemaFiles.length === 0) {
        console.error('❌ No schema SQL files found. Exiting.');
        process.exit(1);
    }
    
    try {
        // 2. Clean the schema 
        await dropAllTables(); 
        console.log('✅ All existing tables dropped successfully.');
        
        // 3. Read and execute ALL Schema creation files
        for (const file of schemaFiles) {
            console.log(`--- Executing Schema: ${path.basename(file)}`);
            const schemaSQL = fs.readFileSync(file, { encoding: 'utf-8' });
            await db.none(schemaSQL);
            console.log('✅ Schemas created successfully.');
        }

        // 4. Read and execute ALL Seed Data files
        for (const file of seedFiles) {
            console.log(`--- Executing Seed Data: ${path.basename(file)}`);
            const seedSQL = fs.readFileSync(file, { encoding: 'utf-8' });
            await db.none(seedSQL);
            console.log('✅ Seed data loaded successfully.');
        }

    } catch (error) {
        console.error('❌ Database Reset/Seed FAILED!');
        // Error handling needs to be robust to pinpoint the failing file/query
        console.error(error);
        process.exit(1);
    } finally {
        pgp.end(); 
        console.log('--- ✅ Database Setup Complete. Connection closed. ---\n');
    }
}

resetAndSeedDatabase();