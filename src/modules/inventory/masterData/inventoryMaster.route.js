// modules/inventory/masterData/inventoryMaster.route.js (FINAL & COMPLETE)

const express = require('express');
const router = express.Router();
const inventoryMasterController = require('./inventoryMaster.controller');

// DONT'T FORGET TO ADD MIDDLEWARES FOR AUTHENTICATION AND AUTHORIZATION!

// =========================================================================
// A. UOM (UNIT OF MEASURE) ROUTES (/api/v1/inventory/master-data/uoms...)
// =========================================================================

// 1. GET All Active UOMs
router.get('/uoms', inventoryMasterController.getAllActiveUoms); 

// 2. POST Create New UOM
router.post('/uoms', inventoryMasterController.createUom);

// 3. PATCH Update UOM Details
router.patch('/uoms/:uomId', inventoryMasterController.updateUom);

// 4. PATCH Deactivate UOM (Soft Delete)
router.patch('/uoms/deactivate/:uomId', inventoryMasterController.deactivateUom);


// =========================================================================
// B. STOCK TYPE ROUTES (/api/v1/inventory/master-data/stock-types...)
// =========================================================================

// 5. GET All Stock Types
router.get('/stock-types', inventoryMasterController.getAllStockTypes);

// 6. POST Create New Stock Type
router.post('/stock-types', inventoryMasterController.createStockType);


// =========================================================================
// C. STOCK STATUS ROUTES (/api/v1/inventory/master-data/stock-statuses...)
// =========================================================================

// 7. GET All Active Stock Statuses
router.get('/stock-statuses', inventoryMasterController.getAllActiveStockStatuses);

// 8. POST Create New Stock Status
router.post('/stock-statuses', inventoryMasterController.createStockStatus);

// 9. PATCH Update Stock Status Details
router.patch('/stock-statuses/:statusId', inventoryMasterController.updateStockStatus);


module.exports = router;