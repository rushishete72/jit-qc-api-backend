/**
 * @fileoverview Central Master Data Administration Routes.
 * @description यह मॉड्यूल Master Panel के लिए डायनामिक CRUD ऑपरेशंस और विशिष्ट लिंकिंग
 * कार्यों (जैसे BOM, Vendor-Part लिंकिंग) सहित सभी API एंडपॉइंट्स को परिभाषित करता है।
 * सभी रूट्स **JWT प्रमाणीकरण** (`authenticate`) और **RBAC प्राधिकरण** (`authorize`) द्वारा सुरक्षित हैं।
 *
 * @requires express - Express framework
 * @requires ./masterData.controller - सभी व्यावसायिक लॉजिक नियंत्रक (Controller) फ़ंक्शंस
 * @requires ../../../middleware/auth - `authenticate` और `authorize` मिडिलवेयर
 * @module modules/masterData/admin/masterData.route
 */

const express = require('express');
const router = express.Router();
const adminController = require('./masterData.controller');

// 🛡️ DONT'T FORGET TO ADD MIDDLEWARES FOR AUTHENTICATION AND AUTHORIZATION (ADMIN/MASTER ROLE)!
const { authenticate, authorize } = require('../../../middleware/auth'); 

// =========================================================================
// A. GENERIC MASTER DATA CRUD (Dynamic Table Handling)
// =========================================================================

// :tableName can be 'parts', 'vendors', 'customers', 'users', 'locations'

/**
 * 1. एक मास्टर टेबल के लिए सभी सक्रिय रिकॉर्ड्स प्राप्त करता है।
 * @name GET /api/masterdata/admin/:tableName
 * @function
 * @memberof module:modules/masterData/admin/masterData.route
 * @middleware {Function} authenticate
 * @middleware {Function} authorize - Requires 'MASTER_READ_ONLY'
 */
router.get('/:tableName', 
    authenticate, 
    authorize('MASTER_READ_ONLY'), 
    adminController.getMasterList
);

/**
 * 2. एक मास्टर टेबल में एक नया रिकॉर्ड बनाता है।
 * @name POST /api/masterdata/admin/:tableName
 * @function
 * @memberof module:modules/masterData/admin/masterData.route
 * @middleware {Function} authenticate
 * @middleware {Function} authorize - Requires 'MASTER_MANAGE_ALL'
 */
router.post('/:tableName', 
    authenticate, 
    authorize('MASTER_MANAGE_ALL'), 
    adminController.createMasterRecord
);

/**
 * 3. ID द्वारा विशिष्ट रिकॉर्ड विवरण प्राप्त करता है।
 * @name GET /api/masterdata/admin/:tableName/:id
 * @function
 * @memberof module:modules/masterData/admin/masterData.route
 * @middleware {Function} authenticate
 * @middleware {Function} authorize - Requires 'MASTER_READ_ONLY'
 */
router.get('/:tableName/:id', 
    authenticate, 
    authorize('MASTER_READ_ONLY'), 
    adminController.getMasterRecordDetails
);

/**
 * 4. ID द्वारा एक मौजूदा रिकॉर्ड को अद्यतन (Update) करता है।
 * @name PUT /api/masterdata/admin/:tableName/:id
 * @function
 * @memberof module:modules/masterData/admin/masterData.route
 * @middleware {Function} authenticate
 * @middleware {Function} authorize - Requires 'MASTER_MANAGE_ALL'
 */
router.put('/:tableName/:id', 
    authenticate, 
    authorize('MASTER_MANAGE_ALL'), 
    adminController.updateMasterRecord
);


// =========================================================================
// B. SPECIFIC LINKING & CONFIGURATION
// =========================================================================

/**
 * 5. Part के Bill of Materials (BOM) को अद्यतन (Update) करता है।
 * @name PUT /api/masterdata/admin/parts/:partId/bom
 * @function
 * @memberof module:modules/masterData/admin/masterData.route
 * @middleware {Function} authenticate
 * @middleware {Function} authorize - Requires 'PART_MANAGE_BOM'
 */
router.put('/parts/:partId/bom', 
    authenticate, 
    authorize('PART_MANAGE_BOM'), 
    adminController.updatePartBOM
);

/**
 * 6. एक Vendor को एक Part से लिंक करता है (Approved Supplier List)।
 * @name POST /api/masterdata/admin/linking/vendor-part
 * @function
 * @memberof module:modules/masterData/admin/masterData.route
 * @middleware {Function} authenticate
 * @middleware {Function} authorize - Requires 'VENDOR_PART_LINK'
 */
router.post('/linking/vendor-part', 
    authenticate, 
    authorize('VENDOR_PART_LINK'), 
    adminController.linkVendorToPart
);

/**
 * 7. एक User को Customer या Vendor से लिंक करता है।
 * @name POST /api/masterdata/admin/linking/user-entity
 * @function
 * @memberof module:modules/masterData/admin/masterData.route
 * @middleware {Function} authenticate
 * @middleware {Function} authorize - Requires 'USER_MANAGE_ALL'
 */
router.post('/linking/user-entity', 
    authenticate, 
    authorize('USER_MANAGE_ALL'), 
    adminController.linkUserEntity
);


module.exports = router;