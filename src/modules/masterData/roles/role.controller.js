const model = require('./role.model');
const { APIError } = require('../../../utils/errorHandler');
const asyncHandler = require('../../../utils/asyncHandler'); 
// NOTE: Assuming asyncHandler is at '../../utils/asyncHandler' relative to masterData/roles/

// -------------------------------------------------------------
// A. READ Operations
// -------------------------------------------------------------

// GET /api/master/roles
const getAllRoles = asyncHandler(async (req, res) => {
    const roles = await model.findAll();
    res.status(200).json({ 
        status: 'success', 
        data: { roles } 
    });
});

// GET /api/master/roles/:id
const getRoleById = asyncHandler(async (req, res) => {
    const roleId = parseInt(req.params.id);
    if (isNaN(roleId)) {
        throw new APIError('Invalid Role ID provided.', 400);
    }
    
    const role = await model.findById(roleId);
    // model.findById() already handles the 404 error internally
    
    res.status(200).json({ 
        status: 'success', 
        data: { role } 
    });
});


// -------------------------------------------------------------
// B. WRITE Operations (Requires Admin Authorization)
// -------------------------------------------------------------

// POST /api/master/roles
const createRole = asyncHandler(async (req, res) => {
    const { role_name, description, is_active} = req.body;
    const created_by=parseInt(req.body.created_by, 10);
    if (!role_name) {
        throw new APIError('Role name is required.', 400);
    }

    const newRole = await model.create({ role_name, description, is_active, created_by});
    
    res.status(201).json({
        status: 'success',
        message: 'Role created successfully.',
        data: { role: newRole }
    });
});

// PUT/PATCH /api/master/roles/:id
const updateRole = asyncHandler(async (req, res) => {
    const roleId = parseInt(req.params.id);
    const updateData = req.body;
    
    if (isNaN(roleId)) {
        throw new APIError('Invalid Role ID provided.', 400);
    }
    
    // Ensure only permissible fields are updated
    const allowedFields = ['role_name', 'description', 'is_active'];
    const dataToUpdate = allowedFields.reduce((acc, key) => {
        if (updateData[key] !== undefined) {
            acc[key] = updateData[key];
        }
        return acc;
    }, {});

    if (Object.keys(dataToUpdate).length === 0) {
        throw new APIError('No valid fields provided for update.', 400);
    }
    
    const updatedRole = await model.update(roleId, dataToUpdate);
    
    res.status(200).json({
        status: 'success',
        message: 'Role updated successfully.',
        data: { role: updatedRole }
    });
});


// DELETE /api/master/roles/:id
const deleteRole = asyncHandler(async (req, res) => {
    const roleId = parseInt(req.params.id);
    
    if (isNaN(roleId)) {
        throw new APIError('Invalid Role ID provided.', 400);
    }

    const result = await model.remove(roleId);
    
    res.status(200).json({
        status: 'success',
        message: result.message
    });
});


module.exports = {
    getAllRoles,
    getRoleById,
    createRole,
    updateRole,
    deleteRole
};