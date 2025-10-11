// modules/inventory/partsMaster/part.route.js (FINAL & COMPLETE)

const express = require('express');
const router = express.Router();
const partController = require('./part.controller');

// DONT'T FORGET TO ADD MIDDLEWARES FOR AUTHENTICATION AND AUTHORIZATION!

// =========================================================================
// A. CORE PART CRUD ROUTES (/api/v1/inventory/parts...)
// =========================================================================

// 1. POST Create New Part
router.post('/', partController.createPart);

// 2. GET All Active Parts (List View)
router.get('/', partController.getAllActiveParts);

// 3. GET Part Details (Full View including UOM Conversions)
router.get('/:partId', partController.getPartById);

// 4. PATCH Update Part Master Data
router.patch('/:partId', partController.updatePart);


// =========================================================================
// B. PLANNING & COSTING ROUTES
// =========================================================================

// 5. GET Reorder Planning Report (Parts below ROL)
router.get('/reports/reorder-planning', partController.getReorderPlanningReport);

// 6. POST Update Standard Cost and Log History
router.post('/:partId/cost', partController.updatePartCost);


// =========================================================================
// C. UTILITY & ATTRIBUTE ROUTES
// =========================================================================

// 7. POST Add UOM Conversion for a Part
router.post('/:partId/uom-conversion', partController.addPartUOMConversion);

// 8. GET List of Traceable Parts (Serialized/Lot controlled)
router.get('/reports/traceable', partController.getTraceableParts);


module.exports = router;