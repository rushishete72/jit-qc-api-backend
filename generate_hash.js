// File: generate_hash.js

const { hashPassword } = require('./src/utils/passwordUtils'); // Path adjust as needed

async function generateAdminHash() {
    const defaultPassword = 'SuperAdmin@123'; // ⭐ यहाँ अपना डिफ़ॉल्ट पासवर्ड सेट करें
    
    console.log(`\n--- Generating Hash for: ${defaultPassword} ---`);
    
    try {
        const hash = await hashPassword(defaultPassword);
        
        console.log('\n================================================================');
        console.log('✅ HASH SUCCESSFULLY GENERATED:');
        console.log(hash);
        console.log('================================================================');
        console.log('\n💡 IMPORTANT: Copy the hash above (including $2b$...) and paste it into database/seed_data/auth.sql.');
        
    } catch (error) {
        console.error('❌ Hashing failed:', error.message);
    }
}

generateAdminHash();