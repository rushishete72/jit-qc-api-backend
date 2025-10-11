// modules/inventory/partsMaster/part.controller.js (MASTER CONTROLLER)

const partModel = require('./part.model'); 
const stockModel = require('../stock/stock.model'); // For SOH integration
const { 
    validatePart,
    validatePartUpdate,
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
// A. PART CRUD CONTROLLERS
// =========================================================================

/** 1. एक नया Part Master रिकॉर्ड बनाता है। */
const createPart = async (req, res, next) => {
    const data = req.body;
    const validationError = validatePart(data);
    if (validationError) return res.status(400).json({ error: validationError });

    try {
        // 1. Part No. विशिष्टता (uniqueness) की जाँच करें
        const existingPart = await partModel.getPartByPartNo(data.part_no);
        if (existingPart) {
            return res.status(409).json({ error: `Part Number ${data.part_no} already exists.` });
        }
        
        // 2. रिकॉर्ड बनाएं
        const newPart = await partModel.createPart(data);
        
        return res.status(201).json({ 
            message: `Part ${newPart.part_no} created successfully.`, 
            data: newPart 
        });
    } catch (error) {
        return next(error);
    }
};

/** 2. ID द्वारा एक Part Master रिकॉर्ड प्राप्त करता है। */
const getPartById = async (req, res, next) => {
    const { error, id: partId } = handleIdValidation(req.params.partId, 'Part ID');
    if (error) return res.status(400).json({ error });

    try {
        const part = await partModel.getPartById(partId);
        if (!part) return res.status(404).json({ error: `Part ID ${partId} not found.` });

        // 3. UOM Conversions भी जोड़ें
        part.uom_conversions = await partModel.getUOMConversionsByPartId(partId);

        return res.status(200).json({
            message: 'Part details retrieved.',
            data: part
        });
    } catch (error) {
        return next(error);
    }
};

/** 4. एक Part Master रिकॉर्ड को अद्यतन करता है। */
const updatePart = async (req, res, next) => {
    const { error, id: partId } = handleIdValidation(req.params.partId, 'Part ID');
    if (error) return res.status(400).json({ error });
    
    const data = req.body;
    const validationError = validatePartUpdate(data);
    if (validationError) return res.status(400).json({ error: validationError });

    try {
        const updatedPart = await partModel.updatePart(partId, data);
        if (!updatedPart) return res.status(404).json({ error: `Part ID ${partId} not found.` });

        return res.status(200).json({
            message: `Part ${updatedPart.part_no} updated successfully.`,
            data: updatedPart
        });
    } catch (error) {
        return next(error);
    }
};

// =========================================================================
// B. INVENTORY PLANNING & COSTING CONTROLLERS
// =========================================================================

/** 7. Reorder Level से नीचे वाले Parts की रिपोर्ट तैयार करता है। */
const getReorderPlanningReport = async (req, res, next) => {
    try {
        // Note: यह एक CRITICAL फ़ंक्शन है जिसके लिए वास्तविक SOH डेटा की आवश्यकता होगी।
        // यहां हम SOH को सीधे डेटाबेस में गणना करके रिपोर्ट तैयार कर रहे हैं।
        
        const lowStockParts = await partModel.getPartsBelowReorderLevel();

        const report = lowStockParts.map(p => ({
            part_no: p.part_no,
            part_name: p.part_name,
            soh: parseFloat(p.current_soh),
            reorder_level: p.reorder_level,
            max_stock_level: p.max_stock_level,
            qty_to_order: p.max_stock_level - parseFloat(p.current_soh)
        }));
        
        return res.status(200).json({
            message: 'Reorder Planning Report generated.',
            data: report.filter(p => p.qty_to_order > 0),
        });
    } catch (error) {
        return next(error);
    }
};

/** 8. पार्ट के Standard Cost को अद्यतन करता है और इतिहास लॉग करता है। */
const updatePartCost = async (req, res, next) => {
    const { error, id: partId } = handleIdValidation(req.params.partId, 'Part ID');
    if (error) return res.status(400).json({ error });

    const { new_cost } = req.body;
    if (new_cost === undefined || isNaN(new_cost) || new_cost < 0) {
        return res.status(400).json({ error: 'Valid new_cost is required.' });
    }

    try {
        const currentPart = await partModel.getPartById(partId);
        if (!currentPart) return res.status(404).json({ error: `Part ID ${partId} not found.` });
        
        const oldCost = currentPart.standard_cost || 0;
        
        // 1. Cost History लॉग करें
        await partModel.logCostHistory(partId, oldCost, new_cost, req.user.user_id); // Assuming req.user exists

        // 2. Part Master में Cost अपडेट करें
        const updatedPart = await partModel.updateStandardCost(partId, new_cost);

        return res.status(200).json({
            message: `Standard Cost for ${updatedPart.part_no} updated from ${oldCost} to ${new_cost}.`,
            data: updatedPart,
        });

    } catch (error) {
        return next(error);
    }
};

// =========================================================================
// C. UTILITY CONTROLLERS
// =========================================================================

/** 12. पार्ट के लिए वैकल्पिक UOMs (Unit of Measures) जोड़ता है। */
const addPartUOMConversion = async (req, res, next) => {
    const { error, id: partId } = handleIdValidation(req.params.partId, 'Part ID');
    if (error) return res.status(400).json({ error });

    const { from_uom_id, to_uom_id, conversion_factor } = req.body;
    // ... (Add validation for UOM IDs and conversion factor) ...

    try {
        const newConversion = await partModel.addUOMConversion(partId, from_uom_id, to_uom_id, conversion_factor);
        
        return res.status(201).json({
            message: 'UOM conversion added successfully.',
            data: newConversion,
        });
    } catch (error) {
        return next(error);
    }
};

// -------------------------------------------------------------------------
// FINAL EXPORTS 
// -------------------------------------------------------------------------

module.exports = {
    // CRUD
    createPart,
    getPartById,
    updatePart,
    getAllActiveParts: async (req, res, next) => { /* simplified */ },
    
    // Planning & Costing
    getReorderPlanningReport,
    updatePartCost,
    
    // Utility
    addPartUOMConversion,
    getTraceableParts: async (req, res, next) => { /* simplified */ },
};