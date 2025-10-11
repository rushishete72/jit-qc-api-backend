/**
 * @fileoverview Master User and Role Management Routes.
 * @description यह मॉड्यूल Master/Admin Panel के लिए उपयोगकर्ता (User), भूमिका (Role), और अनुमति (Permission)
 * CRUD संचालन (operations) के लिए सभी API एंडपॉइंट्स को परिभाषित करता है।
 * बेस पाथ (Base Path) Express राउटर द्वारा /api/master/users पर सेट किया गया है।
 * इसमें JWT-आधारित प्रमाणीकरण (`authenticate`) और RBAC-आधारित प्राधिकरण (`authorize`) दोनों का उपयोग होता है।
 *
 * @requires express - Express framework
 * @requires ./user.controller - सभी व्यावसायिक लॉजिक नियंत्रक (Controller) फ़ंक्शंस
 * @requires ../../../middleware/auth - `authenticate` और `authorize` मिडिलवेयर
 * @module modules/master/users/userAuth/user.route
 */

const express = require('express');
const router = express.Router();
const userController = require('./user.controller'); 

// 🚀 नए नामों को आयात करें: authenticate और authorize
const { authenticate, authorize } = require('../../../middleware/auth'); 

// --------------------------------------------------------------------------
// ROUTE ORDER FIX: Specific routes must come BEFORE dynamic ID routes
// --------------------------------------------------------------------------

/**
 * सक्रिय इंस्पेक्टर्स (Active Inspectors) की सूची प्राप्त करता है (लुकअप के लिए)।
 * @name GET /api/master/users/inspectors
 * @function
 * @memberof module:modules/master/users/user.route
 * @middleware {Function} authenticate - उपयोगकर्ता JWT टोकन को सत्यापित करता है।
 * @middleware {Function} authorize - सुनिश्चित करता है कि उपयोगकर्ता के पास 'MASTER_READ_ONLY' अनुमति है।
 */
router.get('/inspectors', 
    authenticate, // अब requireAuth के बजाय authenticate
    authorize('MASTER_READ_ONLY'), // एक सिंगल परमिशन स्ट्रिंग पास करें
    userController.getActiveInspectors 
);

/**
 * सभी उपलब्ध RBAC अनुमतियाँ (Permissions) प्राप्त करता है।
 * @name GET /api/master/users/permissions
 * @function
 * @memberof module:modules/master/users/user.route
 * @middleware {Function} authenticate
 * @middleware {Function} authorize - सुनिश्चित करता है कि उपयोगकर्ता के पास 'USER_MANAGE_ALL' अनुमति है।
 */
router.get('/permissions',
    authenticate, 
    authorize('USER_MANAGE_ALL'),
    userController.getAllPermissions
);


/**
 * नए रोल बनाता है और सभी रोल्स को प्राप्त करता है।
 * @name /api/master/users/roles
 * @memberof module:modules/master/users/user.route
 * * @router-post {POST} / - नया रोल बनाता है। Requires 'USER_MANAGE_ALL'.
 * @router-get {GET} / - सभी रोल्स को सूचीबद्ध करता है। Requires 'MASTER_READ_ONLY'.
 */
router.route('/roles')
    .post(authenticate, authorize('USER_MANAGE_ALL'), userController.createRole)
    .get(authenticate, authorize('MASTER_READ_ONLY'), userController.getAllRoles);

/**
 * ID द्वारा विशिष्ट रोल को प्रबंधित (fetch, update, delete) करता है।
 * @name /api/master/users/roles/:roleId
 * @memberof module:modules/master/users/user.route
 * * @router-get {GET} /:roleId - रोल ID द्वारा प्राप्त करता है। Requires 'MASTER_READ_ONLY'.
 * @router-put {PUT} /:roleId - रोल डेटा अपडेट करता है। Requires 'USER_MANAGE_ALL'.
 * @router-delete {DELETE} /:roleId - रोल को हटाता है। Requires 'USER_MANAGE_ALL'.
 */
router.route('/roles/:roleId')
    .get(authenticate, authorize('MASTER_READ_ONLY'), userController.getRoleById)
    .put(authenticate, authorize('USER_MANAGE_ALL'), userController.updateRole)
    .delete(authenticate, authorize('USER_MANAGE_ALL'), userController.deleteRole);

/**
 * 🛡️ NEW: किसी विशिष्ट रोल (Role) के लिए अनुमतियाँ (Permissions) सेट करता है।
 * @name PUT /api/master/users/roles/:roleId/permissions
 * @function
 * @memberof module:modules/master/users/user.route
 * @middleware {Function} authenticate
 * @middleware {Function} authorize - सुनिश्चित करता है कि उपयोगकर्ता के पास 'USER_MANAGE_ALL' अनुमति है।
 */
router.put('/roles/:roleId/permissions',
    authenticate,
    authorize('USER_MANAGE_ALL'),
    userController.setRolePermissions
);


/**
 * नया यूजर बनाता है और सभी यूजर्स को प्राप्त करता है (पेजिनेशन के साथ)।
 * @name /api/master/users
 * @memberof module:modules/master/users/user.route
 * * @router-post {POST} / - नया यूजर बनाता है। Requires 'USER_MANAGE_ALL'.
 * @router-get {GET} / - सभी यूजर्स को सूचीबद्ध करता है (फ़िल्टरिंग/पेजिनेशन)। Requires 'USER_MANAGE_ALL'.
 */
router.route('/')
    .post(authenticate, authorize('USER_MANAGE_ALL'), userController.createUser)
    .get(authenticate, authorize('USER_MANAGE_ALL'), userController.getAllUsers);

/**
 * 🔑 NEW: ID द्वारा किसी विशिष्ट यूजर की सत्यापन (verification) स्थिति को बदलता है (`PATCH` का उपयोग)।
 * @name PATCH /api/master/users/:userId/verify
 * @function
 * @memberof module:modules/master/users/user.route
 * @middleware {Function} authenticate
 * @middleware {Function} authorize - सुनिश्चित करता है कि उपयोगकर्ता के पास 'USER_MANAGE_ALL' अनुमति है।
 */
router.patch('/:userId/verify', 
    authenticate, 
    authorize('USER_MANAGE_ALL'), 
    userController.toggleUserVerification
);

/**
 * ID द्वारा विशिष्ट यूजर को प्रबंधित (fetch, update, delete) करता है।
 * @name /api/master/users/:userId
 * @memberof module:modules/master/users/user.route
 * * @router-get {GET} /:userId - यूजर ID द्वारा प्राप्त करता है। Requires 'MASTER_READ_ONLY' OR 'USER_MANAGE_ALL'.
 * @router-put {PUT} /:userId - यूजर डेटा अपडेट करता है। Requires 'USER_MANAGE_ALL'.
 * @router-delete {DELETE} /:userId - यूजर को निष्क्रिय (deactivate) करता है। Requires 'USER_MANAGE_ALL'.
 */
router.route('/:userId')
    // यह अनुमति देता है कि यूजर या तो खुद की प्रोफ़ाइल देखे या उसके पास 'USER_MANAGE_ALL' परमिशन हो
    .get(authenticate, authorize(['MASTER_READ_ONLY', 'USER_MANAGE_ALL']), userController.getUserById) 
    .put(authenticate, authorize('USER_MANAGE_ALL'), userController.updateUser)
    .delete(authenticate, authorize('USER_MANAGE_ALL'),userController.deleteUser);


module.exports = router;