// modules/inventory/masterData/inventoryMaster.controller.js (MASTER CONTROLLER)

const inventoryModel = require('./inventoryMaster.model'); 
const { 
    validateUom, 
    validateStockType,
    validateStockStatus,
    handleNumericId
} = require('../../../utils/validation'); 

// --- Core Helper Functions ---

const handleIdValidation = (id, paramName = 'ID') => {
    const parsedId = handleNumericId(id);
    if (parsedId === null) {
        return { error: `Invalid ${paramName} provided in the URL.` };
    }
    return { id: parsedId };
};

// =========================================================================
// A. UOM (UNIT OF MEASURE) MANAGEMENT CONTROLLERS
// =========================================================================

/** 1. एक नया UOM बनाता है। */
const createUom = async (req, res, next) => {
    const data = req.body;
    const validationError = validateUom(data); 
    if (validationError) return res.status(400).json({ error: validationError });

    try {
        const newUom = await inventoryModel.createUom(data);
        return res.status(201).json({ 
            message: `UOM ${newUom.uom_code} created successfully.`, 
            data: newUom 
        });
    } catch (error) {
        if (error.code === '23505') { 
            error.status = 409; 
            error.message = 'UOM Code already exists.';
        }
        return next(error); 
    }
};

/** 3. सभी सक्रिय UOMs को प्राप्त करता है। */
const getAllActiveUoms = async (req, res, next) => {
    try {
        const uoms = await inventoryModel.getAllActiveUoms();
        return res.status(200).json({ 
            message: 'Active UOMs retrieved successfully.', 
            data: uoms 
        });
    } catch (error) {
        return next(error); 
    }
};

/** 4. UOM डिटेल्स को अपडेट करता है। */
const updateUom = async (req, res, next) => {
    const { error, id: uomId } = handleIdValidation(req.params.uomId, 'UOM ID');
    if (error) return res.status(400).json({ error });

    const data = req.body;
    const validationError = validateUom(data, false); // Partial validation
    if (validationError) return res.status(400).json({ error: validationError });
    
    try {
        const updatedUom = await inventoryModel.updateUom(uomId, data);
        if (!updatedUom) return res.status(404).json({ error: `UOM ID ${uomId} not found.` });
        
        return res.status(200).json({
            message: `UOM ${updatedUom.uom_code} updated successfully.`,
            data: updatedUom,
        });
    } catch (error) {
        if (error.code === '23505') { 
            error.status = 409; 
            error.message = 'UOM Code already exists.';
        }
        return next(error);
    }
};

/** 5. UOM को निष्क्रिय करता है (डिलीट नहीं)। */
const deactivateUom = async (req, res, next) => {
    const { error, id: uomId } = handleIdValidation(req.params.uomId, 'UOM ID');
    if (error) return res.status(400).json({ error });
    
    try {
        // 5. Dependency Check
        const inUse = await inventoryModel.isUomInUse(uomId);
        if (inUse) {
            return res.status(400).json({ error: 'Cannot deactivate: UOM is currently in use by parts or stock.' });
        }
        
        const deactivatedUom = await inventoryModel.updateUom(uomId, { is_active: false });
        if (!deactivatedUom) return res.status(404).json({ error: `UOM ID ${uomId} not found.` });

        return res.status(200).json({
            message: `UOM ${deactivatedUom.uom_code} deactivated successfully.`,
            data: deactivatedUom,
        });
    } catch (error) {
        return next(error);
    }
};


// =========================================================================
// B. STOCK STATUS & TYPE MANAGEMENT CONTROLLERS
// =========================================================================

/** 6. एक नया Stock Type बनाता है। */
const createStockType = async (req, res, next) => {
    const data = req.body;
    const validationError = validateStockType(data); 
    if (validationError) return res.status(400).json({ error: validationError });

    try {
        const newType = await inventoryModel.createStockType(data);
        return res.status(201).json({ 
            message: `Stock Type ${newType.type_code} created successfully.`, 
            data: newType 
        });
    } catch (error) {
        if (error.code === '23505') { 
            error.status = 409; 
            error.message = 'Stock Type Code already exists.';
        }
        return next(error); 
    }
};

/** 8. सभी Stock Types को प्राप्त करता है। */
const getAllStockTypes = async (req, res, next) => {
    try {
        const types = await inventoryModel.getAllStockTypes();
        return res.status(200).json({ 
            message: 'Stock Types retrieved successfully.', 
            data: types 
        });
    } catch (error) {
        return next(error); 
    }
};

/** 9. एक नया Stock Status बनाता है। */
const createStockStatus = async (req, res, next) => {
    const data = req.body;
    const validationError = validateStockStatus(data); 
    if (validationError) return res.status(400).json({ error: validationError });

    try {
        const newStatus = await inventoryModel.createStockStatus(data);
        return res.status(201).json({ 
            message: `Stock Status ${newStatus.status_code} created successfully.`, 
            data: newStatus 
        });
    } catch (error) {
        if (error.code === '23505') { 
            error.status = 409; 
            error.message = 'Stock Status Code already exists.';
        }
        return next(error); 
    }
};

/** 11. सभी सक्रिय Stock Statuses को प्राप्त करता है। */
const getAllActiveStockStatuses = async (req, res, next) => {
    try {
        const statuses = await inventoryModel.getAllActiveStockStatuses();
        return res.status(200).json({ 
            message: 'Active Stock Statuses retrieved successfully.', 
            data: statuses 
        });
    } catch (error) {
        return next(error); 
    }
};

/** 14. Stock Status को अपडेट करता है। */
const updateStockStatus = async (req, res, next) => {
    const { error, id: statusId } = handleIdValidation(req.params.statusId, 'Status ID');
    if (error) return res.status(400).json({ error });

    const data = req.body;
    const validationError = validateStockStatus(data, false); 
    if (validationError) return res.status(400).json({ error: validationError });
    
    try {
        const updatedStatus = await inventoryModel.updateStockStatus(statusId, data);
        if (!updatedStatus) return res.status(404).json({ error: `Stock Status ID ${statusId} not found.` });
        
        return res.status(200).json({
            message: `Stock Status ${updatedStatus.status_code} updated successfully.`,
            data: updatedStatus,
        });
    } catch (error) {
        if (error.code === '23505') { 
            error.status = 409; 
            error.message = 'Stock Status Code already exists.';
        }
        return next(error);
    }
};


// -------------------------------------------------------------------------
// FINAL EXPORTS 
// -------------------------------------------------------------------------

module.exports = {
    // UOM
    createUom,
    getAllActiveUoms,
    updateUom,
    deactivateUom,

    // Stock Type
    createStockType,
    getAllStockTypes,

    // Stock Status
    createStockStatus,
    getAllActiveStockStatuses,
    updateStockStatus,
};