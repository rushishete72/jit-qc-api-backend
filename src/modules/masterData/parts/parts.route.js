// src/modules/masterData/parts/parts.route.js

const express = require('express');
const router = express.Router();
const partsController = require('./parts.controller');
const { authenticate, authorize } = require('../../../middleware/auth');

// Assuming masterData.permission.js is also in the masterData folder
const { MASTER_DATA_MANAGE, MASTER_DATA_READ_ALL } = require('../masterData.permission'); 

// All routes require authentication
router.use(authenticate);

// --- 1. POST: Create Part (Requires MASTER_DATA_MANAGE) ---
router.post(
    '/', 
    authorize(MASTER_DATA_MANAGE), 
    partsController.createPart
);

// --- 2. GET: Read All Parts (Permission Logic) ---
router.get(
    '/', 
    (req, res, next) => {
        const { isActive } = req.query;
        if (isActive === undefined || isActive.toLowerCase() !== 'true') {
            return authorize(MASTER_DATA_READ_ALL)(req, res, next);
        }
        // If only active parts are requested, allow all authenticated users.
        next();
    },
    partsController.getAllParts
);

// --- 3. PATCH: Update Part (Requires MASTER_DATA_MANAGE) ---
router.patch(
    '/:partId', 
    authorize(MASTER_DATA_MANAGE), 
    partsController.updatePart
);

// --- 4. PATCH: Deactivate Part (Requires MASTER_DATA_MANAGE) ---
router.patch(
    '/deactivate/:partId', 
    authorize(MASTER_DATA_MANAGE), 
    partsController.deactivatePart
);


module.exports = router;