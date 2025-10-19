// src/modules/auth/adminAuth/adminAuth.model.js (Complete, Updated Code)

// ----------------------------------------------------------------------
// DATABASE IMPORT FIX
// ----------------------------------------------------------------------
// Assuming the db.js file is outside the src folder (4 levels up)
const { db, pgp } = require('../../../../database/db'); 
const { APIError } = require('../../../utils/errorHandler'); 
const bcrypt = require('bcryptjs');

// Constants
const HASH_SALT_ROUNDS = 10;
const DEFAULT_BASIC_USER_ROLE_ID = 4; // Assuming 4 is the default role for approved users

// ----------------------------------------------------------------------
// A. REGISTRATION REQUEST MANAGEMENT
// ----------------------------------------------------------------------

/**
 * Retrieves all pending user registration requests.
 * @returns {Promise<Array<Object>>} List of pending registration requests.
 */
const getPendingRequests = async () => {
    const query = `
        SELECT request_id, full_name, email, justification_message, requested_at
        FROM registration_requests
        WHERE status = 'PENDING'
        ORDER BY requested_at ASC;
    `;
    return db.any(query);
};

/**
 * Approves a registration request, creates a new user, and archives the request.
 * This is performed in a database transaction.
 * @param {number} requestId - The ID of the registration request to approve.
 * @param {number} approvedById - The user_id of the Admin/Super Admin performing the action.
 * @returns {Promise<Object>} The newly created user object.
 * @throws {APIError} If the request is not found or is not pending.
 */

/**
 * Approves a registration request, creates a new user, and archives the request.
 */
const approveRegistration = async (requestId, approvedById, roleIdToAssign) => {
    let newUser;
    
    // pg-promise transaction management
    await db.tx('approve-registration', async t => {
        // 1. Fetch the request details and lock the row
        const request = await t.oneOrNone(
            "SELECT * FROM registration_requests WHERE request_id = $1 AND status = 'PENDING' FOR UPDATE", 
            [requestId]
        );

        if (!request) {
            throw new APIError('Pending registration request not found.', 404);
        }

        // 2. Insert the new user into the users table
        const hashedPassword = await bcrypt.hash(request.password_hash, HASH_SALT_ROUNDS);
        
        // CRITICAL FIX 1 & 2: Added updated_by to target columns.
        const userInsertQuery = `
            INSERT INTO users (
                email, 
                full_name, 
                password_hash, 
                role_id, 
                is_active, 
                is_verified, 
                created_by, 
                updated_by 
            )
            -- Values ($1 to $4 for user data, $5 for approvedById (used twice))
            VALUES ($1, $2, $3, $4, TRUE, TRUE, $5, $5) 
            RETURNING user_id, email, full_name, role_id;
        `;
        
        // CRITICAL FIX 3: Passed the correct roleIdToAssign ($4) and approvedById ($5).
        newUser = await t.one(userInsertQuery, [
            request.email,
            request.full_name,
            hashedPassword,
            roleIdToAssign, // $4: The Role ID passed from the controller/body
            approvedById    // $5: The Admin's ID for created_by and updated_by
        ]);

        // 3. Update the registration request status to APPROVED
        const requestUpdateQuery = `
            UPDATE registration_requests 
            SET status = 'APPROVED', 
                approved_by = $2,         -- ⭐️ FIX 1: Renamed 'processed_by' to 'approved_by'
                processed_at = CURRENT_TIMESTAMP
            WHERE request_id = $1;
        `;
        await t.none(requestUpdateQuery, [requestId, approvedById]);
    });

    return newUser;
};


/**
 * Rejects a pending registration request.
 * @param {number} requestId - The ID of the request to reject.
 * @param {number} rejectedById - The user_id of the Admin/Super Admin performing the action.
 * @throws {APIError} If the request is not found or is not pending.
 */
const rejectRegistration = async (requestId, rejectedById) => {
    const result = await db.result(
        `UPDATE registration_requests 
         SET status = 'REJECTED', 
             processed_by = $2, 
             processed_at = CURRENT_TIMESTAMP
         WHERE request_id = $1 AND status = 'PENDING'`, 
        [requestId, rejectedById]
    );

    if (result.rowCount === 0) {
        throw new APIError('Pending registration request not found.', 404);
    }
};


// ----------------------------------------------------------------------
// B. ACTIVE USER MANAGEMENT
// ----------------------------------------------------------------------

/**
 * Retrieves all users in the system along with their role name.
 * @returns {Promise<Array<Object>>} List of all users.
 */
const getAllSystemUsers = async () => {
    const query = `
        SELECT 
            u.user_id, u.email, u.full_name, u.is_active, u.is_verified, 
            r.role_name, u.created_at, u.last_login_at
        FROM users u
        JOIN roles r ON u.role_id = r.role_id
        ORDER BY u.user_id ASC;
    `;
    return db.any(query);
};

/**
 * Updates a user's role and tracks who made the change.
 * @param {number} userId - The ID of the user whose role is changing.
 * @param {number} newRoleId - The ID of the new role.
 * @param {number} updatedById - The user_id of the Admin/Super Admin performing the action.
 * @returns {Promise<Object>} The updated user object.
 * @throws {APIError} If the user or new role is not found.
 */
const updateUserRole = async (userId, newRoleId, updatedById) => {
    const query = `
        UPDATE users 
        SET role_id = $2, 
            updated_at = CURRENT_TIMESTAMP, 
            updated_by = $3
        WHERE user_id = $1
        RETURNING user_id, full_name, email, role_id;
    `;
    
    const updatedUser = await db.oneOrNone(query, [userId, newRoleId, updatedById]);

    if (!updatedUser) {
        // We can throw 404 here, or let the caller controller check the role validity.
        // Assuming a user with userId must exist.
        throw new APIError(`User with ID ${userId} not found or role ID is invalid.`, 404);
    }
    return updatedUser;
};


/**
 * Activates or Deactivates a user account.
 * @param {number} userId - The ID of the user to modify.
 * @param {boolean} isActive - TRUE to activate, FALSE to deactivate.
 * @param {number} updatedById - The user_id of the Admin/Super Admin performing the action.
 * @throws {APIError} If the user is not found.
 */
const setUserActiveStatus = async (userId, isActive, updatedById) => {
    const query = `
        UPDATE users 
        SET is_active = $2, 
            updated_at = CURRENT_TIMESTAMP, 
            updated_by = $3
        WHERE user_id = $1
    `;
    
    const result = await db.result(query, [userId, isActive, updatedById]);

    if (result.rowCount === 0) {
        throw new APIError(`User with ID ${userId} not found.`, 404);
    }
};


// ----------------------------------------------------------------------
// C. ROLE AND PERMISSION MANAGEMENT (Super Admin Only)
// ----------------------------------------------------------------------

/**
 * Assigns a permission to a role. Handles the insertion into the role_permissions join table.
 * Uses db.tx() for automatic transaction management.
 * @param {number} roleId - The ID of the role to update.
 * @param {number} permissionId - The ID of the permission to assign.
 * @returns {Promise<Object>} Status message.
 * @throws {APIError} If the Role or Permission does not exist.
 */
const assignPermissionToRole = async (roleId, permissionId) => {
    try {
        const result = await db.tx('assign-permission', async t => { 
            
            // 1. Check if the Role and Permission exist
            const roleCheck = await t.oneOrNone('SELECT role_id FROM roles WHERE role_id = $1', [roleId]);
            const permissionCheck = await t.oneOrNone('SELECT permission_id FROM permissions WHERE permission_id = $1', [permissionId]);

            if (!roleCheck) {
                throw new APIError(`Role with ID ${roleId} not found.`, 404);
            }
            // If the user uses a non-existent permission ID (like 15), this throws the expected error.
            if (!permissionCheck) { 
                throw new APIError(`Permission with ID ${permissionId} not found.`, 404);
            }

            // 2. Check if the permission is ALREADY assigned
            const existingAssignment = await t.oneOrNone(
                'SELECT * FROM role_permissions WHERE role_id = $1 AND permission_id = $2', 
                [roleId, permissionId]
            );

            if (existingAssignment) {
                return { message: "Permission was already assigned." }; 
            }
            
            // 3. Perform the assignment (INSERT into the join table)
            // We use the correct column 'created_at' which must exist in the DB schema
            const insertQuery = `
                INSERT INTO role_permissions (role_id, permission_id, created_at) 
                VALUES ($1, $2, CURRENT_TIMESTAMP)
            `;
            await t.none(insertQuery, [roleId, permissionId]);
            
            return { message: "Permission assigned successfully." };
        });
        
        return result;

    } catch (error) {
        // db.tx() automatically rolls back on error
        console.error("Database Error during permission assignment:", error.message);
        throw error;
    }
};


/**
 * Retrieves all defined roles in the system.
 * Used for populating role selection lists in the admin panel.
 * @returns {Promise<Array<Object>>} List of all roles (role_id, role_name, description).
 */
const getAllRoles = async () => {
    const query = `
        SELECT role_id, role_name, description, is_active, created_at , created_by
        FROM roles
        ORDER BY role_id ASC;
    `;
    return db.any(query);
};

module.exports = {
    getAllRoles,
    getPendingRequests,
    approveRegistration,
    rejectRegistration,
    getAllSystemUsers,
    updateUserRole,
    setUserActiveStatus,
    assignPermissionToRole // 🌟 NEW SUPER ADMIN FEATURE
};