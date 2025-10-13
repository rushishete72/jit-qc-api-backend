



// src/modules/auth/adminAuth/adminAuth.route.js (Complete, Updated Code)

const router = require('express').Router();
const adminAuthController = require('./adminAuth.controller');
const { authenticate, authorize } = require('../../../middleware/auth');

//const { USER_MANAGE, USER_READ_ALL, USER_CHANGE_ROLE, RsOLE_MANAGE } = require('../../../utils/constants'); 
// Assuming the above permissions constants exist

const USER_APPROVE = 'USER_APPROVE'; 
const VIEW_PENDING = 'VIEW_PENDING';
const USER_READ_ALL = 'USER_READ_ALL';
const USER_MANAGE = 'USER_MANAGE'; 
const USER_CHANGE_ROLE = 'USER_CHANGE_ROLE'; 
const ROLE_MANAGE='ROLE_MANAGE';
// -------------------------------------------------------------
// A. REGISTRATION REQUEST MANAGEMENT
// -------------------------------------------------------------

// 1. GET /api/auth/admin/requests/pending - Get all pending requests
router.get(
    '/requests/pending', 
    authenticate, 
    authorize(USER_READ_ALL), 
    adminAuthController.getPendingRequests
);

// 2. POST /api/auth/admin/requests/approve - Approve a request
router.post(
    '/requests/approve', 
    authenticate, 
    authorize(USER_MANAGE), 
    adminAuthController.approveRegistration
);

// 3. POST /api/auth/admin/requests/reject - Reject a request
router.post(
    '/requests/reject', 
    authenticate, 
    authorize(USER_MANAGE), 
    adminAuthController.rejectRegistration
);

// -------------------------------------------------------------
// B. USER MANAGEMENT
// -------------------------------------------------------------

// 4. GET /api/auth/admin/users - Get all users (Active/Inactive)
router.get(
    '/users', 
    authenticate, 
    authorize(USER_READ_ALL), 
    adminAuthController.getAllUsers
);

// 5. PATCH /api/auth/admin/users/role - Change user role
router.patch(
    '/users/role', 
    authenticate, 
    authorize(USER_CHANGE_ROLE), 
    adminAuthController.changeUserRole
);

// 6. PATCH /api/auth/admin/users/deactivate/:userId - Deactivate user
router.patch(
    '/users/deactivate/:userId', 
    authenticate, 
    authorize(USER_MANAGE), 
    adminAuthController.deactivateUser
);

// 7. PATCH /api/auth/admin/users/activate/:userId - Activate user
router.patch(
    '/users/activate/:userId', 
    authenticate, 
    authorize(USER_MANAGE), 
    adminAuthController.activateUser
);


// -------------------------------------------------------------
// C. SUPER ADMIN MANAGEMENT
// -------------------------------------------------------------

// 8. POST /api/auth/admin/roles/assign-permission - Assign permission to a role
router.post(
    '/roles/assign-permission', // 🌟 NEW SUPER ADMIN FEATURE
    authenticate,
    authorize(ROLE_MANAGE), // The highest permission
    adminAuthController.assignPermissionToRole
);


module.exports = router;