// src/modules/auth/adminAuth/adminAuth.controller.js (Complete, Updated Code)

const asyncHandler = require('../../../utils/asyncHandler');
const adminAuthModel = require('./adminAuth.model');
const { APIError } = require('../../../utils/errorHandler');
const emailService = require('../../../utils/emailService'); 


// ===============================================
// A. REGISTRATION REQUEST MANAGEMENT
// ===============================================

/**
 * GET: Retrieves all pending registration requests. (Requires USER_READ_ALL)
 */
const getPendingRequests = asyncHandler(async (req, res) => {
    const requests = await adminAuthModel.getPendingRequests();
    res.status(200).json({
        status: 'success',
        count: requests.length,
        data: requests
    });
});

/**
 * POST: Approves a registration request and creates an active user. (Requires USER_MANAGE)
 */
const approveRegistration = asyncHandler(async (req, res) => {
    const requestId = parseInt(req.body.requestId, 10); 
    const approvedById = req.user.userId; 

    if (isNaN(requestId) || requestId <= 0) {
        throw new APIError('Invalid Registration Request ID provided.', 400);
    }

    // 1. Transactional Approval Logic (Model handles user creation and request update)
    const newUser = await adminAuthModel.approveRegistration(requestId, approvedById);
    
    // 2. Email sending logic (FIXED FUNCTION NAME)
    await emailService.sendApprovalConfirmationToUser({
        email: newUser.email, 
        fullName: newUser.full_name
    }); 

    res.status(200).json({
        status: 'success',
        message: `User '${newUser.full_name}' successfully approved and activated with Role ID ${newUser.role_id}.`,
        user: newUser 
    });
});

/**
 * POST: Rejects a registration request. (Requires USER_MANAGE)
 */
const rejectRegistration = asyncHandler(async (req, res) => {
    const requestId = parseInt(req.body.requestId, 10);
    const rejectedById = req.user.userId;

    if (isNaN(requestId) || requestId <= 0) {
        throw new APIError('Invalid Registration Request ID provided.', 400);
    }

    await adminAuthModel.rejectRegistration(requestId, rejectedById);

    // TODO: Optional: Send rejection email here

    res.status(200).json({
        status: 'success',
        message: `Registration request ${requestId} successfully rejected.`
    });
});


// ===============================================
// B. ACTIVE USER MANAGEMENT
// ===============================================

/**
 * GET: Retrieves all system users (Active/Inactive). (Requires USER_READ_ALL)
 */
const getAllUsers = asyncHandler(async (req, res) => {
    const users = await adminAuthModel.getAllSystemUsers();
    res.status(200).json({ status: 'success', count: users.length, data: users });
});

/**
 * PATCH: Updates an active user's role. (Requires USER_CHANGE_ROLE)
 */
const changeUserRole = asyncHandler(async (req, res) => {
    const { userId, newRoleId } = req.body;
    const actingAdminId = req.user.userId;

    if (!userId || !newRoleId) {
        throw new APIError('User ID and new Role ID are required.', 400);
    }
    
    const updatedUser = await adminAuthModel.updateUserRole(userId, newRoleId, actingAdminId);

    res.status(200).json({ 
        status: 'success', 
        message: `User ${updatedUser.full_name}'s role updated to Role ID ${newRoleId}.`,
        user: updatedUser 
    });
});

/**
 * PATCH: Deactivates a user account. (Requires USER_MANAGE)
 */
const deactivateUser = asyncHandler(async (req, res) => {
    const userId = parseInt(req.params.userId, 10);
    const actingAdminId = req.user.userId;
    
    if (isNaN(userId)) {
        throw new APIError('Invalid User ID.', 400);
    }

    await adminAuthModel.setUserActiveStatus(userId, false, actingAdminId); // false for deactivate

    res.status(200).json({ 
        status: 'success', 
        message: `User ${userId} successfully deactivated.`
    });
});

/**
 * PATCH: Activates a user account. (Requires USER_MANAGE)
 */
const activateUser = asyncHandler(async (req, res) => {
    const userId = parseInt(req.params.userId, 10);
    const actingAdminId = req.user.userId;
    
    if (isNaN(userId)) {
        throw new APIError('Invalid User ID.', 400);
    }

    await adminAuthModel.setUserActiveStatus(userId, true, actingAdminId); // true for activate

    res.status(200).json({ 
        status: 'success', 
        message: `User ${userId} successfully activated.`
    });
});


// ===============================================
// C. ROLE AND PERMISSION MANAGEMENT (Super Admin Only)
// ===============================================

/**
 * POST: Assigns a new permission to a specific role. (Requires ROLE_MANAGE - Super Admin)
 */
const assignPermissionToRole = asyncHandler(async (req, res) => {
    const { roleId, permissionId } = req.body;

    if (!roleId || !permissionId) {
        throw new APIError('Role ID and Permission ID are required.', 400);
    }

    // Model handles existence check, duplicates, and transaction
    const result = await adminAuthModel.assignPermissionToRole(roleId, permissionId);

    res.status(200).json({ 
        status: 'success', 
        message: result.message // Should return "Permission assigned successfully." or "Permission was already assigned."
    });
});


module.exports = {
    getPendingRequests,
    approveRegistration,
    rejectRegistration,
    getAllUsers, 
    changeUserRole,
    deactivateUser,
    activateUser, // 🆕 NEW
    assignPermissionToRole // 🌟 NEW SUPER ADMIN FEATURE
};