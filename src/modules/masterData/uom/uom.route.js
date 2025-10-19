// src/modules/master/uom/uom.route.js

const express = require('express');
const router = express.Router();
const uomController = require('./uom.controller');
const { authenticate, authorize } = require('../../../middleware/auth');
const { MASTER_DATA_MANAGE, MASTER_DATA_READ_ALL } = require('../masterData.permission'); // Import the new permissions

// All routes require authentication
router.use(authenticate);

// --- 1. POST: Create UOM ---
// Only Super Admin or roles with MASTER_DATA_MANAGE can create new units
router.post(
    '/', 
    authorize(MASTER_DATA_MANAGE), 
    uomController.createUom
);

// --- 2. GET: Read All UOMs ---
// Note: This route is split based on the query:
// /uom?isActive=true -> Basic read access (All authenticated users for dropdowns)
// /uom (reads all, including inactive) -> Requires higher permission
router.get(
    '/', 
    (req, res, next) => {
        const { isActive } = req.query;
        // If the user requests ALL UOMs (no filter or isActive=false/null), 
        // require the full MASTER_DATA_READ_ALL permission.
        if (isActive === undefined || isActive.toLowerCase() !== 'true') {
            return authorize(MASTER_DATA_READ_ALL)(req, res, next);
        }
        // If only active UOMs are requested, all authenticated users are allowed.
        next();
    },
    uomController.getAllUoms
);

// --- 3. PATCH: Update UOM (Requires MASTER_DATA_MANAGE) ---
router.patch(
    '/:uomId', 
    authorize(MASTER_DATA_MANAGE), 
    uomController.updateUom
);

// --- 4. PATCH/DELETE: Deactivate UOM (Requires MASTER_DATA_MANAGE) ---
router.patch(
    '/deactivate/:uomId', 
    authorize(MASTER_DATA_MANAGE), 
    uomController.deactivateUom
);


module.exports = router;