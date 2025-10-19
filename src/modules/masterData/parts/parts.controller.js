// src/modules/masterData/parts/parts.controller.js

const asyncHandler = require('../../../utils/asyncHandler');
const { APIError } = require('../../../utils/errorHandler');
const partsModel = require('./parts.model');

// --- Input Validation Helper ---
function validatePartInput(body) {
    const requiredFields = ['part_no', 'rev_no', 'part_name', 'drawing_no', 'uom_id', 'material_spec'];
    for (const field of requiredFields) {
        if (!body[field]) {
            throw new APIError(`Missing required field: ${field}.`, 400);
        }
    }
    
    // Type conversion for IDs
    body.uom_id = parseInt(body.uom_id, 10);
    if (body.default_supplier_id) body.default_supplier_id = parseInt(body.default_supplier_id, 10);
    if (body.default_client_id) body.default_client_id = parseInt(body.default_client_id, 10);
    
    // Basic ID validation
    if (isNaN(body.uom_id) || body.uom_id <= 0) {
        throw new APIError('Invalid UOM ID.', 400);
    }
    
    // Boolean conversion
    if (body.qc_required !== undefined) {
        body.qc_required = (body.qc_required === 'true' || body.qc_required === true);
    }
}


const createPart = asyncHandler(async (req, res) => {
    validatePartInput(req.body);
    const userId = req.user.userId;

    const newPart = await partsModel.createPart(req.body, userId);

    res.status(201).json({
        status: 'success',
        message: 'Master Part created successfully.',
        data: newPart
    });
});

const getAllParts = asyncHandler(async (req, res) => {
    const { search, isActive } = req.query;
    
    let isActiveFilter = null;
    if (isActive !== undefined) {
        isActiveFilter = isActive.toLowerCase() === 'true';
    }

    const parts = await partsModel.getAllParts({ search, isActive: isActiveFilter });

    res.status(200).json({
        status: 'success',
        count: parts.length,
        data: parts
    });
});

const updatePart = asyncHandler(async (req, res) => {
    const partId = parseInt(req.params.partId, 10);
    const userId = req.user.userId;

    if (isNaN(partId) || partId <= 0) {
        throw new APIError('Invalid Part ID.', 400);
    }

    validatePartInput(req.body); 

    const updatedPart = await partsModel.updatePart(partId, req.body, userId);

    res.status(200).json({
        status: 'success',
        message: 'Master Part updated successfully.',
        data: updatedPart
    });
});

const deactivatePart = asyncHandler(async (req, res) => {
    const partId = parseInt(req.params.partId, 10);
    const userId = req.user.userId;

    if (isNaN(partId) || partId <= 0) {
        throw new APIError('Invalid Part ID.', 400);
    }

    const deactivatedPart = await partsModel.deactivatePart(partId, userId);

    if (!deactivatedPart) {
        throw new APIError('Master Part not found or already inactive.', 404);
    }

    res.status(200).json({
        status: 'success',
        message: 'Master Part successfully deactivated.',
        part_id: partId
    });
});

module.exports = {
    createPart,
    getAllParts,
    updatePart,
    deactivatePart
};