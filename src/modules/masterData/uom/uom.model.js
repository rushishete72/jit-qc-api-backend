/**
 * @fileoverview Master Unit of Measurement (UOM) Database Model.
 * @description यह मॉड्यूल `uoms` तालिका के लिए डेटाबेस एक्सेस लेयर (DAL) प्रदान करता है, जिसमें
 * CRUD, फ़िल्टरिंग, और UOM के उपयोग की जाँच के लिए विशिष्ट व्यावसायिक तर्क शामिल है।
 * @module src/modules/masterData/uom/uom.model
 * @requires ../../../../database/db - PostgreSQL कनेक्शन और pg-promise helpers
 * @requires ../../../utils/errorHandler
 */

const { db } = require('../../../../database/db'); 
const { APIError } = require('../../../utils/errorHandler');

// --- UOM Core CRUD ---

/**
 * एक नया UOM बनाता है।
 * @async
 * @function createUom
 * @param {object} uomData - name, symbol, और type सहित नया UOM डेटा।
 * @returns {Promise<object>} - बनाया गया UOM ऑब्जेक्ट।
 * @throws {APIError} यदि name या symbol पहले से मौजूद है (409 Conflict - PostgreSQL code '23505')।
 */
async function createUom(uomData) {
    try {
        const query = `
            INSERT INTO uoms (name, symbol, type, is_active)
            VALUES ($1, $2, $3, TRUE)
            RETURNING uom_id, name, symbol, type, is_active;
        `;
        return await db.one(query, [uomData.name, uomData.symbol, uomData.type]);
    } catch (error) {
        if (error.code === '23505') { 
            throw new APIError('UOM with this name or symbol already exists.', 409);
        }
        throw error;
    }
}

/**
 * ID द्वारा एक विशिष्ट UOM प्राप्त करता है।
 * @async
 * @function getUomById
 * @param {number} uomId - खोजने के लिए UOM ID।
 * @returns {Promise<object | null>} - UOM ऑब्जेक्ट या यदि नहीं मिला तो `null`।
 */
async function getUomById(uomId) {
    const query = 'SELECT uom_id, name, symbol, type, is_active FROM uoms WHERE uom_id = $1;';
    return db.oneOrNone(query, uomId);
}

/**
 * फ़िल्टर और सर्च क्षमताओं के साथ सभी UOMs प्राप्त करता है।
 * @async
 * @function getAllUoms
 * @param {object} filters - फ़िल्टर ऑब्जेक्ट।
 * @param {string} [filters.search] - UOM नाम या सिंबल में खोजने के लिए स्ट्रिंग।
 * @param {boolean | null} [filters.isActive=null] - सक्रियता स्थिति के आधार पर फ़िल्टर करने के लिए (true, false, या null सभी के लिए)।
 * @returns {Promise<Array<object>>} - फ़िल्टर्ड UOM रिकॉर्ड्स की सरणी।
 */
async function getAllUoms({ search, isActive }) {
    let where = 'WHERE 1=1';
    const params = [];

    if (isActive !== null) {
        params.push(isActive);
        where += ` AND is_active = $${params.length}`;
    }
    if (search) {
        params.push(`%${search.toLowerCase()}%`);
        where += ` AND (LOWER(name) LIKE $${params.length} OR LOWER(symbol) LIKE $${params.length})`;
    }
    
    const query = `SELECT uom_id, name, symbol, type, is_active FROM uoms ${where} ORDER BY name;`;
    return db.any(query, params);
}

/**
 * ID द्वारा एक मौजूदा UOM को अपडेट करता है।
 * @async
 * @function updateUom
 * @param {number} uomId - अपडेट करने के लिए UOM ID।
 * @param {object} updateData - name, symbol, type, या is_active सहित अद्यतन करने के लिए फ़ील्ड्स।
 * @returns {Promise<object>} - अपडेटेड UOM ऑब्जेक्ट।
 * @throws {APIError} यदि UOM नहीं मिला (404 Not Found)।
 * @throws {APIError} यदि अपडेटेड name या symbol पहले से मौजूद है (409 Conflict - PostgreSQL code '23505')।
 */
async function updateUom(uomId, updateData) {
    try {
        const set = db.helpers.set(updateData, ['name', 'symbol', 'type', 'is_active']);
        const where = 'WHERE uom_id = $1';
        
        if (set.length === 0) return getUomById(uomId); 

        const query = `
            UPDATE uoms ${set} ${where}
            RETURNING uom_id, name, symbol, type, is_active;
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

/**
 * ID द्वारा एक UOM को निष्क्रिय (Deactivate) करता है (सॉफ्ट डिलीट)।
 * @async
 * @function deactivateUom
 * @param {number} uomId - निष्क्रिय करने के लिए UOM ID।
 * @returns {Promise<object | null>} - निष्क्रिय UOM का ID या यदि पहले से ही निष्क्रिय है/नहीं मिला तो `null`।
 */
async function deactivateUom(uomId) {
    const query = 'UPDATE uoms SET is_active = FALSE WHERE uom_id = $1 AND is_active = TRUE RETURNING uom_id;';
    return db.oneOrNone(query, uomId);
}

// --- Validation Helper (Used by controller before deactivating) ---
/**
 * जांचता है कि UOM किसी भी Part द्वारा उपयोग किया जा रहा है या नहीं।
 * @async
 * @function isUomInUse
 * @param {number} uomId - जाँचने के लिए UOM ID।
 * @returns {Promise<boolean>} - यदि उपयोग में है तो `true`, अन्यथा `false`।
 */
async function isUomInUse(uomId) {
    // जांचता है कि UOM किसी भी सक्रिय या निष्क्रिय पार्ट द्वारा उपयोग किया जा रहा है या नहीं
    const query = 'SELECT EXISTS(SELECT 1 FROM parts WHERE uom_id = $1) AS in_use;';
    const result = await db.one(query, uomId);
    return result.in_use;
}


module.exports = {
    createUom,
    getUomById,
    getAllUoms,
    updateUom,
    deactivateUom,
    isUomInUse // Used by controller for business logic check
};