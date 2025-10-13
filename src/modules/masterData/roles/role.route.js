const express = require('express');
const router = express.Router();
const roleController = require('./role.controller');
// 💡 NOTE: Authorization Middleware को यहाँ पर इम्पोर्ट किया जाएगा।
// const { isAdmin } = require('../../../middleware/auth'); 
// const { requireAuth } = require('../../../middleware/auth'); 


// --------------------------------------------------
// Master Data: Roles (Access Control)
// READ Access: All authenticated users (or maybe public if required for client setup)
// WRITE/UPDATE/DELETE Access: ONLY Admin
// --------------------------------------------------

// 1. GET All Roles /api/master/roles
// (Authentication is usually required, but we'll skip the check for now)
router.get('/', roleController.getAllRoles);

// 2. GET Role by ID /api/master/roles/:id
// (Authentication is usually required)
router.get('/:id', roleController.getRoleById);


// 3. CREATE Role /api/master/roles (POST)
// ⭐ REQUIRES ADMIN ROLE ACCESS
router.post('/', /* isAdmin, */ roleController.createRole);

// 4. UPDATE Role /api/master/roles/:id (PUT/PATCH)
// ⭐ REQUIRES ADMIN ROLE ACCESS
router.patch('/:id', /* isAdmin, */ roleController.updateRole);

// 5. DELETE Role /api/master/roles/:id (DELETE)
// ⭐ REQUIRES ADMIN ROLE ACCESS
router.delete('/:id', /* isAdmin, */ roleController.deleteRole);


module.exports = router;