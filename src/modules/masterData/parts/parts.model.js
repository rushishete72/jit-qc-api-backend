// src/modules/masterData/parts/parts.model.js

const { db } = require('../../../../database/db');
const { APIError } = require('../../../utils/errorHandler');

// --- Master Parts Core CRUD ---

async function createPart(partData, userId) {
    try {
        const query = `
            INSERT INTO master_parts (
                part_no, rev_no, part_name, drawing_no, uom_id, std_weight_gm, 
                material_spec, surface_treatment, qc_required, std_lead_time_days,
                default_supplier_id, default_client_id, created_by, updated_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13)
            RETURNING part_id, part_no, part_name, uom_id, qc_required, is_active;
        `;
        const values = [
            partData.part_no, 
            partData.rev_no, 
            partData.part_name, 
            partData.drawing_no, 
            partData.uom_id, 
            partData.std_weight_gm, 
            partData.material_spec, 
            partData.surface_treatment, 
            partData.qc_required, 
            partData.std_lead_time_days, 
            partData.default_supplier_id, 
            partData.default_client_id,
            userId
        ];
        return await db.one(query, values);
    } catch (error) {
        if (error.code === '23505') { 
            throw new APIError('Part Number and Revision combination already exists.', 409);
        }
        if (error.code === '23503') { 
            throw new APIError('One or more referenced Master IDs (UOM, Supplier, Client) are invalid.', 400);
        }
        throw error;
    }
}

async function getAllParts({ search, isActive }) {
    let where = 'WHERE 1=1';
    const params = [];

    if (isActive !== null) {
        params.push(isActive);
        where += ` AND mp.is_active = $${params.length}`;
    }
    
    if (search) {
        params.push(`%${search.toLowerCase()}%`);
        where += ` AND (LOWER(mp.part_no) LIKE $${params.length} OR LOWER(mp.part_name) LIKE $${params.length})`;
    }
    
    const query = `
        SELECT 
            mp.part_id, mp.part_no, mp.rev_no, mp.part_name, mp.qc_required, mp.is_active,
            mu.uom_code, mu.uom_name
            -- Removed MS and MC joins for simplicity, uncomment if needed:
            -- ms.supplier_name AS default_supplier,
            -- mc.client_name AS default_client
        FROM master_parts mp
        JOIN master_uoms mu ON mp.uom_id = mu.uom_id
        -- LEFT JOIN master_suppliers ms ON mp.default_supplier_id = ms.supplier_id
        -- LEFT JOIN master_clients mc ON mp.default_client_id = mc.client_id
        ${where} 
        ORDER BY mp.part_no, mp.rev_no;
    `;
    return db.any(query, params);
}

async function updatePart(partId, updateData, userId) {
    try {
        const updateFields = { ...updateData, updated_at: new Date(), updated_by: userId };
        
        const set = db.helpers.set(updateFields, [
            'part_no', 'rev_no', 'part_name', 'drawing_no', 'uom_id', 
            'std_weight_gm', 'material_spec', 'surface_treatment', 
            'qc_required', 'std_lead_time_days', 'default_supplier_id', 
            'default_client_id', 'is_active', 'updated_by', 'updated_at' 
        ]);
        
        if (set.length === 0) throw new APIError('No fields provided for update.', 400);

        const query = `UPDATE master_parts ${set} WHERE part_id = $1 RETURNING part_id, part_no, part_name, is_active;`;
        const updatedPart = await db.oneOrNone(query, partId);
        
        if (!updatedPart) throw new APIError(`Part with ID ${partId} not found.`, 404);
        return updatedPart;
        
    } catch (error) {
        if (error.code === '23505') { throw new APIError('Part Number and Revision combination already exists.', 409); }
        if (error.code === '23503') { throw new APIError('One or more referenced Master IDs are invalid.', 400); }
        throw error;
    }
}

async function deactivatePart(partId, userId) {
    const query = `
        UPDATE master_parts 
        SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP, updated_by = $2
        WHERE part_id = $1 AND is_active = TRUE 
        RETURNING part_id;
    `;
    return db.oneOrNone(query, [partId, userId]);
}


module.exports = {
    createPart,
    getAllParts,
    updatePart,
    deactivatePart,
};