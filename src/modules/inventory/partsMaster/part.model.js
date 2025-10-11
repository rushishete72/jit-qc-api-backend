// modules/inventory/partsMaster/part.model.js (Parts Master - 15 Functions)

const db = require('../../../database/db'); 
const pgp = require('pg-promise')({ capSQL: true });

// =========================================================================
// A. PART CRUD & CORE DATA MANAGEMENT (6)
// =========================================================================

/** 1. एक नया Part Master रिकॉर्ड बनाता है। (CRITICAL) */
const createPart = async (data) => {
    // Note: part_no, part_name, primary_uom_id अनिवार्य हैं।
    const columnSet = new pgp.helpers.ColumnSet([
        'part_no', 'part_name', 'part_description', 'primary_uom_id', 'stock_type_id', 
        'is_serialized', 'is_lot_controlled', 'reorder_level', 'max_stock_level', 
        'default_location_id', 'standard_cost', 'is_active'
    ], { table: 'master_parts' });

    const query = pgp.helpers.insert(data, columnSet) + ' RETURNING *';
    return db.one(query); 
};

/** 2. ID द्वारा एक Part Master रिकॉर्ड प्राप्त करता है, जिसमें संबंधित मास्टर डेटा शामिल है। */
const getPartById = async (partId) => {
    const query = `
        SELECT 
            mp.*, mu.uom_code AS primary_uom_code, mst.type_name AS stock_type_name
        FROM 
            master_parts mp
        JOIN 
            master_uoms mu ON mp.primary_uom_id = mu.uom_id
        JOIN 
            master_stock_types mst ON mp.stock_type_id = mst.type_id
        WHERE 
            mp.part_id = $1
    `;
    return db.oneOrNone(query, [partId]);
};

/** 3. Part Number द्वारा एक Part Master रिकॉर्ड प्राप्त करता है। (Quick Lookup) */
const getPartByPartNo = async (partNo) => {
    return db.oneOrNone('SELECT * FROM master_parts WHERE part_no = $1', [partNo]);
};

/** 4. एक Part Master रिकॉर्ड को अद्यतन करता है। */
const updatePart = async (partId, data) => {
    const updateKeys = Object.keys(data);
    if (updateKeys.length === 0) return null;

    const columnSet = new pgp.helpers.ColumnSet(updateKeys, { table: 'master_parts' });
    const query = pgp.helpers.update(data, columnSet) + ' WHERE part_id = ${partId} RETURNING *';
    
    // Ensure partId is passed to the data object for the WHERE clause
    data.partId = partId; 
    
    return db.oneOrNone(query, data);
};

/** 5. सभी सक्रिय Part Master रिकॉर्ड्स को सूची के रूप में प्राप्त करता है। */
const getAllActiveParts = async (limit = 100) => {
    const query = `
        SELECT 
            mp.part_id, mp.part_no, mp.part_name, mu.uom_code, mp.reorder_level
        FROM 
            master_parts mp
        JOIN 
            master_uoms mu ON mp.primary_uom_id = mu.uom_id
        WHERE 
            mp.is_active = TRUE
        ORDER BY mp.part_no ASC
        LIMIT $1
    `;
    return db.any(query, [limit]);
};

/** 6. एक Part Master रिकॉर्ड को निष्क्रिय (Deactivate) करता है। (Soft Delete) */
const deactivatePart = async (partId) => {
    const query = `
        UPDATE master_parts 
        SET is_active = FALSE, updated_at = NOW()
        WHERE part_id = $1
        RETURNING *
    `;
    return db.oneOrNone(query, [partId]);
};


// =========================================================================
// B. INVENTORY PLANNING & COSTING (5)
// =========================================================================

/** 7. उन सभी Parts को प्राप्त करता है जो Reorder Level से नीचे हैं। (CRITICAL - Planning Report) */
const getPartsBelowReorderLevel = async (currentSOHData) => {
    // Note: यह फ़ंक्शन चलाने से पहले, SOH की गणना एक अलग सेवा द्वारा की जानी चाहिए।
    // यहाँ हम केवल वह Parts प्राप्त करते हैं जिनमें reorder_level > 0 है।
    
    // Mocking SOH calculation in query for demonstration
    const query = `
        SELECT 
            mp.part_no, mp.part_name, mp.reorder_level, mp.max_stock_level,
            COALESCE(SUM(soh.quantity_on_hand), 0) AS current_soh
        FROM 
            master_parts mp
        LEFT JOIN
            inventory_stock_on_hand soh ON mp.part_id = soh.part_id AND soh.stock_status_id = (SELECT status_id FROM master_stock_statuses WHERE status_code = 'AVAILABLE')
        WHERE 
            mp.is_active = TRUE AND mp.reorder_level > 0
        GROUP BY 
            mp.part_id, mp.part_no, mp.part_name, mp.reorder_level, mp.max_stock_level
        HAVING 
            COALESCE(SUM(soh.quantity_on_hand), 0) < mp.reorder_level
        ORDER BY 
            mp.part_no ASC
    `;
    return db.any(query);
};

/** 8. पार्ट के Standard Cost को अद्यतन करता है। */
const updateStandardCost = async (partId, newCost) => {
    const query = `
        UPDATE master_parts 
        SET standard_cost = $2, updated_at = NOW()
        WHERE part_id = $1
        RETURNING *
    `;
    return db.oneOrNone(query, [partId, newCost]);
};

/** 9. एक पार्ट के लिए Cost History लॉग करता है। (separate master_part_cost_history table required) */
const logCostHistory = async (partId, oldCost, newCost, userId) => {
    const query = `
        INSERT INTO master_part_cost_history (part_id, old_cost, new_cost, changed_by_user_id)
        VALUES ($1, $2, $3, $4) RETURNING *
    `;
    return db.one(query, [partId, oldCost, newCost, userId]);
};

/** 10. सबसे अधिक या सबसे कम Standard Cost वाले Parts को प्राप्त करता है। (Cost Analysis) */
const getPartsByCostRange = async (sortOrder = 'DESC', limit = 10) => {
    const query = `
        SELECT 
            mp.part_no, mp.part_name, mp.standard_cost 
        FROM 
            master_parts mp
        WHERE 
            mp.is_active = TRUE AND mp.standard_cost IS NOT NULL
        ORDER BY mp.standard_cost ${sortOrder}
        LIMIT $1
    `;
    return db.any(query, [limit]);
};

/** 11. पार्ट्स की सूची को उनकी स्टॉक टाइप के अनुसार प्राप्त करता है। */
const getPartsByStockType = async (stockTypeId) => {
    const query = `
        SELECT 
            mp.part_id, mp.part_no, mp.part_name, mu.uom_code
        FROM 
            master_parts mp
        JOIN 
            master_uoms mu ON mp.primary_uom_id = mu.uom_id
        WHERE 
            mp.stock_type_id = $1 AND mp.is_active = TRUE
        ORDER BY mp.part_no ASC
    `;
    return db.any(query, [stockTypeId]);
};


// =========================================================================
// C. UTILITY & ATTRIBUTES (4)
// =========================================================================

/** 12. पार्ट के लिए वैकल्पिक UOMs (Unit of Measures) जोड़ता है। (separate master_part_uom_conversions table required) */
const addUOMConversion = async (partId, fromUomId, toUomId, conversionFactor) => {
    const query = `
        INSERT INTO master_part_uom_conversions (part_id, from_uom_id, to_uom_id, conversion_factor)
        VALUES ($1, $2, $3, $4) RETURNING *
    `;
    return db.one(query, [partId, fromUomId, toUomId, conversionFactor]);
};

/** 13. एक पार्ट के लिए UOM Conversions प्राप्त करता है। */
const getUOMConversionsByPartId = async (partId) => {
    const query = `
        SELECT 
            mpuc.*, muf.uom_code AS from_uom_code, mut.uom_code AS to_uom_code
        FROM 
            master_part_uom_conversions mpuc
        JOIN 
            master_uoms muf ON mpuc.from_uom_id = muf.uom_id
        JOIN 
            master_uoms mut ON mpuc.to_uom_id = mut.uom_id
        WHERE 
            mpuc.part_id = $1
    `;
    return db.any(query, [partId]);
};

/** 14. एक पार्ट के लिए डिफ़ॉल्ट Bin Location को अद्यतन करता है। (Putaway Suggestion) */
const updateDefaultLocation = async (partId, defaultLocationId) => {
    const query = `
        UPDATE master_parts 
        SET default_location_id = $2, updated_at = NOW()
        WHERE part_id = $1
        RETURNING *
    `;
    return db.oneOrNone(query, [partId, defaultLocationId]);
};

/** 15. उन Parts की सूची प्राप्त करता है जो serialized या lot controlled हैं। (Traceability Check) */
const getTraceableParts = async () => {
    const query = `
        SELECT 
            part_id, part_no, is_serialized, is_lot_controlled 
        FROM 
            master_parts
        WHERE 
            is_active = TRUE AND (is_serialized = TRUE OR is_lot_controlled = TRUE)
        ORDER BY part_no ASC
    `;
    return db.any(query);
};

// =========================================================================
// FINAL EXPORTS (All 15 Functions)
// =========================================================================

module.exports = {
    // CRUD & Core (1-6)
    createPart,
    getPartById,
    getPartByPartNo,
    updatePart,
    getAllActiveParts,
    deactivatePart,

    // Planning & Costing (7-11)
    getPartsBelowReorderLevel,
    updateStandardCost,
    logCostHistory,
    getPartsByCostRange,
    getPartsByStockType,

    // Utility & Attributes (12-15)
    addUOMConversion,
    getUOMConversionsByPartId,
    updateDefaultLocation,
    getTraceableParts,
};