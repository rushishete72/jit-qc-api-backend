// src/modules/master/uom/uom.model.js (Unit of Measurement - CORRECTED)

const { db, pgp } = require('../../../../database/db'); 
const { APIError } = require('../../../utils/errorHandler');

// --- UOM Core CRUD ---
 
async function createUom(uomData, userId) { 
    try {
        // Corrected columns: uom_code and uom_name
        const query = `
            INSERT INTO master_uoms (uom_code, uom_name, description, conversion_factor, created_by, updated_by)
            VALUES ($1, $2, $3, $4, $5, $5)
            RETURNING uom_id, uom_code, uom_name, description, is_active, created_at;
        `;
        return await db.one(query, [
            uomData.uom_code, 
            uomData.uom_name, 
            uomData.description, 
            uomData.conversion_factor || 1.0, // Use default if not provided
            userId // For created_by and updated_by
        ]);
    } catch (error) {
        if (error.code === '23505') { 
            throw new APIError('UOM Code or Name already exists.', 409);
        }
        throw error;
    }
}

async function getUomById(uomId) {
    const query = 'SELECT uom_id, uom_code, uom_name, description, is_active FROM master_uoms WHERE uom_id = $1;';
    return db.oneOrNone(query, uomId);
}

async function getAllUoms({ search, isActive }) {
    let where = 'WHERE 1=1';
    const params = [];

    // Correctly handling isActive for global list access (e.g., dropdowns)
    if (isActive !== null) {
        params.push(isActive);
        where += ` AND is_active = $${params.length}`;
    }
    if (search) {
        params.push(`%${search.toLowerCase()}%`);
        where += ` AND (LOWER(uom_code) LIKE $${params.length} OR LOWER(uom_name) LIKE $${params.length})`;
    }
    
    // Select the necessary fields
    const query = `SELECT uom_id, uom_code, uom_name, description, is_active FROM master_uoms ${where} ORDER BY uom_name;`;
    return db.any(query, params);
}

async function updateUom(uomId, updateData, userId) {
    try {
        // IMPORTANT: Add updated_at = now() and updated_by = $2 to the SET clause
        const updateFields = {
            ...updateData,
            updated_at: new Date(),
            updated_by: userId
        };
        
        // Corrected columns for pg-promise helpers
        const set = db.helpers.set(updateFields, [
            'uom_code', 
            'uom_name', 
            'description', 
            'conversion_factor', 
            'is_active', 
            'updated_by', 
            'updated_at' 
        ]);
        
        const where = 'WHERE uom_id = $1';
        
        if (set.length === 0) return getUomById(uomId); 

        const query = `
            UPDATE master_uoms ${set} ${where}
            RETURNING uom_id, uom_code, uom_name, description, is_active;
        `;
        const updatedUom = await db.oneOrNone(query, uomId);
        
        if (!updatedUom) throw new APIError(`UOM with ID ${uomId} not found.`, 404);
        return updatedUom;
        
    } catch (error) {
        if (error.code === '23505') { 
            throw new APIError('UOM Code or Name already exists.', 409);
        }
        throw error;
    }
}

async function deactivateUom(uomId, userId) {
    // Audit the deactivation with updated_by and updated_at
    const query = `
        UPDATE master_uoms 
        SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP, updated_by = $2
        WHERE uom_id = $1 AND is_active = TRUE 
        RETURNING uom_id;
    `;
    return db.oneOrNone(query, [uomId, userId]);
}

// Validation Helper remains the same
async function isUomInUse(uomId) {
    const query = 'SELECT EXISTS(SELECT 1 FROM master_parts  WHERE uom_id = $1) AS in_use;';
    const result = await db.one(query, uomId);
    return result.in_use;
}


module.exports = {
    createUom,
    getUomById,
    getAllUoms,
    updateUom,
    deactivateUom,
    isUomInUse
};