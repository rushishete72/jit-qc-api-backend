/**
 * @fileoverview Master Unit of Measurement (UOM) Management Routes.
 * @description यह मॉड्यूल Master UOMs के लिए CRUD API एंडपॉइंट्स को परिभाषित करता है,
 * जिसमें सुरक्षा के लिए प्रमाणीकरण और प्राधिकरण (RBAC) मिडिलवेयर लागू किया जाता है।
 *
 * @requires express - Express framework
 * @requires ../../../middleware/auth - `authenticate` और `authorize` मिडिलवेयर
 * @requires ./uom.controller - UOM प्रबंधन के लिए नियंत्रक फ़ंक्शंस
 * @module src/modules/masterData/uom/uom.route
 */

const express = require('express');
const router = express.Router();

// 1. JWT मिडलवेयर का पाथ ठीक करें
const { authenticate, authorize } = require('../../../middleware/auth'); 

// 2. uom.controller.js से फ़ंक्शन को Destructure करके आयात करें
// 💡 सुनिश्चित करें कि uom.controller.js में आप इन नामों (getAllUoms, createUom) को export कर रहे हैं!
const { 
    getAllUoms,    // GET /
    createUom,     // POST /
    getUomById,    // GET /:uomId
    updateUom,     // PUT /:uomId
    deactivateUom  // PATCH /:uomId/deactivate
} = require('./uom.controller'); 

// -------------------------------------------------------------------------
// Routes Definition
// -------------------------------------------------------------------------

/**
 * GET all UOMs (searchable, filterable) और CREATE new UOM.
 * @name /api/uoms
 * @function
 * @memberof module:src/modules/masterData/uom/uom.route
 */
router.route('/')
    /**
     * GET /api/uoms: सभी UOMs को सूचीबद्ध करता है।
     * @middleware {Function} authenticate - JWT टोकन सत्यापित करें।
     * @middleware {Function} authorize - Requires 'UOM_VIEW_ALL' permission.
     */
    .get(authenticate, authorize('UOM_VIEW_ALL'), getAllUoms)

    /**
     * POST /api/uoms: एक नया UOM बनाता है।
     * @middleware {Function} authenticate - JWT टोकन सत्यापित करें।
     * @middleware {Function} authorize - Requires 'UOM_CREATE' permission.
     */
    .post(authenticate, authorize('UOM_CREATE'), createUom);

/**
 * GET one, UPDATE, और DEACTIVATE one UOM.
 * @name /api/uoms/:uomId
 * @function
 * @memberof module:src/modules/masterData/uom/uom.route
 */
router.route('/:uomId')
    /**
     * GET /api/uoms/:uomId: ID द्वारा एक विशिष्ट UOM प्राप्त करता है।
     * @middleware {Function} authenticate - JWT टोकन सत्यापित करें।
     * @middleware {Function} authorize - Requires 'UOM_VIEW_ALL' (या 'UOM_VIEW_ONE') permission.
     */
    .get(authenticate, authorize('UOM_VIEW_ALL'), getUomById)

    /**
     * PUT /api/uoms/:uomId: ID द्वारा एक UOM को अपडेट करता है।
     * @middleware {Function} authenticate - JWT टोकन सत्यापित करें।
     * @middleware {Function} authorize - Requires 'UOM_UPDATE' permission.
     */
    .put(authenticate, authorize('UOM_UPDATE'), updateUom);

/**
 * DEACTIVATE (सॉफ्ट डिलीट) UOM.
 * @name /api/uoms/:uomId/deactivate
 * @function
 * @memberof module:src/modules/masterData/uom/uom.route
 */
router.patch('/:uomId/deactivate', 
    authenticate, 
    authorize('UOM_DEACTIVATE'), 
    deactivateUom
);

module.exports = router;