/**
 * @fileoverview Master Role Management Database Model.
 * @description यह मॉड्यूल `roles` तालिका के लिए डेटाबेस एक्सेस लेयर (DAL) प्रदान करता है,
 * जिसमें CRUD ऑपरेशन और PostgreSQL के विशिष्ट त्रुटि कोड (जैसे UNIQUE violation 23505
 * और Foreign Key violation 23503) को संभालने के लिए कस्टम लॉजिक शामिल है।
 * @module src/modules/masterData/roles/role.model
 * @requires ../../../../database/db - PostgreSQL कनेक्शन और pg-promise helpers
 * @requires ../../../utils/errorHandler
 */

const { db } = require('../../../../database/db'); 
const { APIError } = require('../../../utils/errorHandler');

/**
 * मॉडल फ़ंक्शन्स: सीधे DB से इंटरैक्ट करते हैं
 */

// --- READ OPERATIONS ---

/**
 * सभी Roles प्राप्त करता है।
 * @async
 * @function findAll
 * @returns {Promise<Array<object>>} - roles तालिका से सभी रिकॉर्ड की सरणी।
 */
async function findAll() {
    // Roles अक्सर छोटे होते हैं, इसलिए उन्हें फ़िल्टरिंग या जॉइन की आवश्यकता नहीं होती है
    const query = 'SELECT role_id, role_name, description, is_active FROM roles ORDER BY role_id;';
    return db.any(query);
}

/**
 * ID द्वारा एक विशिष्ट Role प्राप्त करता है।
 * @async
 * @function findById
 * @param {number} roleId - खोजने के लिए Role ID।
 * @returns {Promise<object>} - Role ऑब्जेक्ट।
 * @throws {APIError} यदि Role नहीं मिला (404 Not Found)।
 */
async function findById(roleId) {
    const query = 'SELECT role_id, role_name, description, is_active FROM roles WHERE role_id = $1;';
    const role = await db.oneOrNone(query, roleId);
    
    if (!role) {
        throw new APIError(`Role with ID ${roleId} not found.`, 404);
    }
    return role;
}

// --- WRITE OPERATIONS ---

/**
 * एक नया Role बनाता है।
 * @async
 * @function create
 * @param {object} roleData - role_name और description सहित नया Role डेटा।
 * @returns {Promise<object>} - बनाया गया Role ऑब्जेक्ट।
 * @throws {APIError} यदि role_name पहले से मौजूद है (409 Conflict - PostgreSQL code '23505')।
 */
async function create(roleData) {
    try {
        const query = `
            INSERT INTO roles (role_name, description, is_active)
            VALUES ($1, $2, TRUE)
            RETURNING role_id, role_name, description, is_active;
        `;
        // role_name को UNIQUE constraint के रूप में मान रहे हैं
        return await db.one(query, [roleData.role_name, roleData.description]);
        
    } catch (error) {
        if (error.code === '23505') { 
            throw new APIError('Role with this name already exists.', 409);
        }
        throw error;
    }
}

/**
 * ID द्वारा एक मौजूदा Role को अपडेट करता है।
 * @async
 * @function update
 * @param {number} roleId - अपडेट करने के लिए Role ID।
 * @param {object} updateData - अद्यतन करने के लिए फ़ील्ड्स (जैसे role_name, description)।
 * @returns {Promise<object>} - अपडेटेड Role ऑब्जेक्ट।
 * @throws {APIError} यदि Role नहीं मिला (404 Not Found) या यदि अपडेटेड role_name पहले से मौजूद है (409 Conflict - PostgreSQL code '23505')।
 */
async function update(roleId, updateData) {
    try {
        // pg-promise helpers.set का उपयोग केवल वैध फ़ील्ड्स के लिए SET क्लॉज़ बनाने के लिए करें
        const set = db.helpers.set(updateData, ['role_name', 'description', 'is_active']);
        const where = 'WHERE role_id = $1';
        
        if (set.length === 0) {
            // यदि कोई डेटा अपडेट करने के लिए नहीं है, तो वर्तमान रिकॉर्ड लौटाएँ।
            return findById(roleId);
        }

        const query = `
            UPDATE roles ${set} ${where}
            RETURNING role_id, role_name, description, is_active;
        `;

        const role = await db.oneOrNone(query, roleId);

        if (!role) {
            throw new APIError(`Role with ID ${roleId} not found for update.`, 404);
        }
        return role;
        
    } catch (error) {
        if (error.code === '23505') { 
            throw new APIError('Updated role name already exists.', 409);
        }
        throw error;
    }
}

/**
 * ID द्वारा एक Role को हटाता है।
 * @async
 * @function remove
 * @param {number} roleId - हटाने के लिए Role ID।
 * @returns {Promise<object>} - सफलता संदेश युक्त ऑब्जेक्ट।
 * @throws {APIError} यदि Role नहीं मिला (404 Not Found)।
 * @throws {APIError} यदि Role सक्रिय रूप से उपयोग में है (409 Conflict - PostgreSQL code '23503' Foreign Key Violation)।
 */
async function remove(roleId) {
    // 💡 IMPORTANT: Foreign Key Violation (23503) यहाँ लागू होगा यदि कोई User इस Role का उपयोग कर रहा है।
    try {
        const query = 'DELETE FROM roles WHERE role_id = $1 RETURNING role_id;';
        const role = await db.oneOrNone(query, roleId);

        if (!role) {
            throw new APIError(`Role with ID ${roleId} not found for deletion.`, 404);
        }
        return { message: `Role ID ${roleId} successfully deleted.` };

    } catch (error) {
        if (error.code === '23503') { 
            throw new APIError('Cannot delete Role: It is currently assigned to one or more users. Please reassign the users first.', 409);
        }
        throw error;
    }
}


module.exports = {
    findAll,
    findById,
    create,
    update,
    remove
};