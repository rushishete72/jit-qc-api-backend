/**
 * @fileoverview Master Role Management Routes.
 * @description यह मॉड्यूल उपयोगकर्ता भूमिकाओं (User Roles) के लिए सभी API एंडपॉइंट्स को परिभाषित
 * करता है, जिसमें CRUD (Create, Read, Update, Delete) ऑपरेशन शामिल हैं। सभी रूट्स
 * **JWT प्रमाणीकरण** (`authenticate`) और **RBAC प्राधिकरण** (`authorize`) द्वारा सुरक्षित हैं।
 *
 * @requires express - Express framework
 * @requires ../../../middleware/auth - `authenticate` और `authorize` मिडिलवेयर
 * @requires ./role.controller - रोल प्रबंधन के लिए नियंत्रक फ़ंक्शंस
 * @module src/modules/masterData/roles/role.route
 */

const express = require('express');
const router = express.Router();

// ✅ सही पाथ और फ़ाइल नाम: '../../../middleware/auth'
// यह त्रुटि को हल करता है: Cannot find module '../../../../middleware/authMiddleware'
const { authenticate, authorize } = require('../../../middleware/auth'); 

// कंट्रोलर फ़ंक्शंस को Destructure करें
// 💡 ध्यान दें: आपको यह सुनिश्चित करना होगा कि 'role.controller.js' में ये फ़ंक्शंस निर्यात (export) किए गए हैं।
const {
    getAllRoles,
    getRoleById,
    createRole,
    updateRole,
    deleteRole
} = require('./role.controller');

// -------------------------------------------------------------------------
// Routes Definition
// -------------------------------------------------------------------------

/**
 * GET all Roles और CREATE new Role.
 * @name /api/roles
 * @function
 * @memberof module:src/modules/masterData/roles/role.route
 */
router.route('/')
    /**
     * GET /api/roles: सभी Roles को सूचीबद्ध करता है।
     * @middleware {Function} authenticate - JWT टोकन सत्यापित करें।
     * @middleware {Function} authorize - Requires 'ROLE_VIEW_ALL' permission.
     */
    .get(authenticate, authorize('ROLE_VIEW_ALL'), getAllRoles)
    /**
     * POST /api/roles: एक नया Role बनाता है।
     * @middleware {Function} authenticate - JWT टोकन सत्यापित करें।
     * @middleware {Function} authorize - Requires 'ROLE_CREATE' permission.
     */
    .post(authenticate, authorize('ROLE_CREATE'), createRole);

/**
 * GET one, UPDATE, and DELETE one Role.
 * @name /api/roles/:id
 * @function
 * @memberof module:src/modules/masterData/roles/role.route
 */
router.route('/:id')
    /**
     * GET /api/roles/:id: ID द्वारा एक विशिष्ट Role प्राप्त करता है।
     * @middleware {Function} authenticate - JWT टोकन सत्यापित करें।
     * @middleware {Function} authorize - Requires 'ROLE_VIEW_ONE' permission.
     */
    .get(authenticate, authorize('ROLE_VIEW_ONE'), getRoleById)
    /**
     * PUT /api/roles/:id: ID द्वारा एक Role को अपडेट करता है।
     * @middleware {Function} authenticate - JWT टोकन सत्यापित करें।
     * @middleware {Function} authorize - Requires 'ROLE_UPDATE' permission.
     */
    .put(authenticate, authorize('ROLE_UPDATE'), updateRole)
    /**
     * DELETE /api/roles/:id: ID द्वारा एक Role को हटाता है।
     * @middleware {Function} authenticate - JWT टोकन सत्यापित करें।
     * @middleware {Function} authorize - Requires 'ROLE_DELETE' permission.
     */
    .delete(authenticate, authorize('ROLE_DELETE'), deleteRole);

module.exports = router;