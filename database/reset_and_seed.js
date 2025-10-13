const fs = require('fs');
const path = require('path');
const { db, pgp, dropAllTables } = require('./db'); 

// File paths
const schemaPath = path.join(__dirname, 'schema_modules/auth.sql');
// ✅ New path for seed data
const seedPath = path.join(__dirname, 'seed_data/auth.sql'); 


async function resetAndSeedDatabase() {
    console.log('\n--- ⏳ Starting Database Reset and Seeding ---');
    
    try {
        // 1. Clean the schema using the utility
        await dropAllTables(); 
        console.log('✅ All existing tables dropped successfully.');
        
        // 2. Read and execute the Schema creation
        const schemaSQL = fs.readFileSync(schemaPath, { encoding: 'utf-8' });
        await db.none(schemaSQL);
        console.log('✅ Auth Schemas (Tables) created successfully.');

        // 3. Execute Seed Data (New Step)
        const seedSQL = fs.readFileSync(seedPath, { encoding: 'utf-8' });
        await db.none(seedSQL);
        console.log('✅ Auth Seed data (Roles & Super Admin) loaded successfully.');

    } catch (error) {
        console.error('❌ Database Reset/Seed FAILED!');
        console.error(error.message);
        process.exit(1);
    } finally {
        pgp.end(); 
        console.log('--- ✅ Database Setup Complete. Connection closed. ---\n');
    }
}

resetAndSeedDatabase();