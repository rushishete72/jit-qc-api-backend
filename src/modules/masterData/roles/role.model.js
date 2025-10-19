// src/modules/masterData/roles/role.model.js

const { db } = require('../../../../database/db'); 
const { APIError } = require('../../../utils/errorHandler');

/**
 * मॉडल फ़ंक्शन्स: सीधे DB से इंटरैक्ट करते हैं
 */

// --- READ OPERATIONS ---

async function findAll() {
    // Roles अक्सर छोटे होते हैं, इसलिए उन्हें फ़िल्टरिंग या जॉइन की आवश्यकता नहीं होती है
    const query = 'SELECT role_id, role_name, description, is_active, created_by, created_at FROM roles ORDER BY role_id;';
    return db.any(query);
}

async function findById(roleId) {
    const query = 'SELECT role_id, role_name, description, is_active FROM roles WHERE role_id = $1;';
    const role = await db.oneOrNone(query, roleId);
    
    if (!role) {
        throw new APIError(`Role with ID ${roleId} not found.`, 404);
    }
    return role;
}

// --- WRITE OPERATIONS ---

async function create(roleData) {
    try {
        const query = `
            INSERT INTO roles (role_name, description, is_active, created_by)
            VALUES ($1, $2, $3, $4)
            RETURNING role_id, role_name, description, is_active, created_by;
        `;
        // role_name को UNIQUE constraint के रूप में मान रहे हैं
        return await db.one(query, [roleData.role_name, roleData.description, roleData.is_active, roleData.created_by]);
        
    } catch (error) {
        if (error.code === '23505') { 
            throw new APIError('Role with this name already exists.', 409);
        }
        throw error;
    }
}

async function update(roleId, updateData) {
    try {
        const set = db.helpers.set(updateData, ['role_name', 'description', 'is_active']);
        const where = 'WHERE role_id = $1';
        
        if (set.length === 0) {
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