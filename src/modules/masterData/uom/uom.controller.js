// src/modules/master/uom/uom.controller.js

const asyncHandler = require('../../../utils/asyncHandler');
const { APIError } = require('../../../utils/errorHandler');
const uomModel = require('./uom.model');

// --- UOM Management (CRUD) ---

/**
 * POST: Create a new UOM (Requires MASTER_DATA_MANAGE)
 */
const createUom = asyncHandler(async (req, res) => {
    const { uom_code, uom_name, description, conversion_factor } = req.body;
    const userId = req.user.userId; // Audit column user ID

    if (!uom_code || !uom_name) {
        throw new APIError('UOM Code and Name are required.', 400);
    }
    
    // Model handles insertion and audit columns
    const newUom = await uomModel.createUom({ uom_code, uom_name, description, conversion_factor }, userId);

    res.status(201).json({
        status: 'success',
        message: 'UOM created successfully.',
        data: newUom
    });
});

/**
 * GET: Retrieve list of UOMs (Permissions vary based on isActive filter)
 * - If filtering by isActive=true: Accessible by ALL authenticated users (for dropdowns).
 * - If reading all (including inactive): Requires MASTER_DATA_READ_ALL or MASTER_DATA_MANAGE.
 */
const getAllUoms = asyncHandler(async (req, res) => {
    const { search, isActive } = req.query;
    
    let isActiveFilter = null;
    if (isActive !== undefined) {
        isActiveFilter = isActive.toLowerCase() === 'true';
    }

    const uoms = await uomModel.getAllUoms({ search, isActive: isActiveFilter });

    res.status(200).json({
        status: 'success',
        count: uoms.length,
        data: uoms
    });
});


/**
 * PATCH: Update UOM details (Requires MASTER_DATA_MANAGE)
 */
const updateUom = asyncHandler(async (req, res) => {
    const uomId = parseInt(req.params.uomId, 10);
    const userId = req.user.userId;

    if (isNaN(uomId) || uomId <= 0) {
        throw new APIError('Invalid UOM ID.', 400);
    }

    // Pass only allowed updatable fields
    const updateData = {};
    if (req.body.uom_code !== undefined) updateData.uom_code = req.body.uom_code;
    if (req.body.uom_name !== undefined) updateData.uom_name = req.body.uom_name;
    if (req.body.description !== undefined) updateData.description = req.body.description;
    if (req.body.conversion_factor !== undefined) updateData.conversion_factor = req.body.conversion_factor;
    if (req.body.is_active !== undefined) updateData.is_active = req.body.is_active;

    if (Object.keys(updateData).length === 0) {
        return res.status(200).json({ status: 'success', message: 'No fields to update.' });
    }

    const updatedUom = await uomModel.updateUom(uomId, updateData, userId);

    res.status(200).json({
        status: 'success',
        message: 'UOM updated successfully.',
        data: updatedUom
    });
});


/**
 * DELETE/PATCH: Deactivate a UOM (Requires MASTER_DATA_MANAGE)
 */
const deactivateUom = asyncHandler(async (req, res) => {
    const uomId = parseInt(req.params.uomId, 10);
    const userId = req.user.userId;

    if (isNaN(uomId) || uomId <= 0) {
        throw new APIError('Invalid UOM ID.', 400);
    }

    const uomInUse = await uomModel.isUomInUse(uomId);
    if (uomInUse) {
        // Business logic restriction
        throw new APIError('Cannot deactivate UOM: It is currently referenced by active Parts or Inventory records.', 409);
    }

    const deactivatedUom = await uomModel.deactivateUom(uomId, userId);

    if (!deactivatedUom) {
        throw new APIError('UOM not found or already inactive.', 404);
    }

    res.status(200).json({
        status: 'success',
        message: 'UOM successfully deactivated.',
        uom_id: uomId
    });
});

module.exports = {
    createUom,
    getAllUoms,
    updateUom,
    deactivateUom
};