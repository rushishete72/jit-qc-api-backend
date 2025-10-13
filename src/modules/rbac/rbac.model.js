// src/modules/rbac/rbac.model.js

const { db } = require('../../../database/db');
const { APIError } = require('../../utils/errorHandler'); 

/**
 * किसी दिए गए Role ID के लिए सभी Permission Codes को Database से fetch करता है।
 * @param {number} roleId - वह Role ID जिसके लिए परमिशन चाहिए।
 * @returns {Promise<string[]>} - Permission Codes की एक array (e.g., ['USER_CREATE', 'USER_APPROVE']).
 */
async function getPermissionsByRoleId(roleId) {
    if (!roleId) return [];

    const query = `
        SELECT p.permission_code
        FROM roles r
        JOIN role_permissions rp ON r.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.permission_id
        WHERE r.role_id = $1;
    `;

    try {
        const result = await db.any(query, roleId);
        // केवल permission_code की array लौटाएँ
        return result.map(row => row.permission_code);
    } catch (error) {
        console.error('Database error fetching permissions:', error);
        throw new APIError('Failed to fetch user permissions.', 500);
    }
}

module.exports = {
    getPermissionsByRoleId,
};