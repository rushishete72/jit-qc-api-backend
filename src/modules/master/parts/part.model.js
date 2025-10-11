/**
 * @fileoverview यह मॉड्यूल Parts मास्टर डेटा के लिए सभी डेटाबेस इंटरैक्शन लॉजिक को संभालता है।
 * इसमें SQL Syntax Errors (Whitespace issues) को ठीक किया गया है।
 * @module modules/master/parts/part.model
 */

// -------------------------------------------------------------------------
// Imports
// -------------------------------------------------------------------------

/**
 * @type {import('pg-promise').IMain<{}> & {db: import('pg-promise').IDatabase<{}>}}
 * @description डेटाबेस कनेक्शन इंस्टेंस (`pg-promise` से)।
 */
const { db } = require('../../../../database/db');
/**
 * @type {typeof import('../../../utils/errorHandler').APIError}
 * @description API-विशिष्ट त्रुटियों को संभालने के लिए कस्टम एरर क्लास।
 */
const { APIError } = require('../../../utils/errorHandler');

// -------------------------------------------------------------------------
// Type Definitions (For Documentation)
// -------------------------------------------------------------------------

/**
 * @typedef {object} PartData
 * @property {string} part_number - पार्ट का यूनिक नंबर।
 * @property {string} description - पार्ट का विवरण।
 * @property {string} rev_no - पार्ट का संशोधन संख्या (Revision Number)।
 * @property {number} uom_id - यूनिट ऑफ़ मेज़रमेंट (UOM) का फॉरेन ID।
 * @property {boolean} [is_active] - पार्ट सक्रिय है या नहीं।
 */

/**
 * @typedef {object} PartFilterParams
 * @property {number} limit - प्रति पृष्ठ रिकॉर्ड की अधिकतम संख्या।
 * @property {number} offset - स्किप किए जाने वाले रिकॉर्ड की संख्या।
 * @property {string} [search] - पार्ट नंबर या विवरण के लिए सर्च टर्म।
 * @property {boolean|null} [isActive] - सक्रिय/निष्क्रिय पार्ट के लिए फ़िल्टर (TRUE, FALSE, या null)।
 */

// -------------------------------------------------------------------------
// Part Core CRUD & Complex Queries
// -------------------------------------------------------------------------

/**
 * @async
 * @function createPart
 * @description डेटाबेस में एक नया पार्ट रिकॉर्ड बनाता है।
 * @param {PartData} partData - पार्ट के लिए आवश्यक डेटा।
 * @returns {Promise<object>} बनाया गया पार्ट ऑब्जेक्ट।
 * @throws {APIError} यदि पार्ट नंबर/रिवीज़न पहले से मौजूद है (409) या UOM ID अमान्य है (400)।
 */
async function createPart(partData) {
    try {
        // ✅ FIX: SQL Syntax Error को ठीक करने के लिए क्वेरी को एक ही लाइन में लिखा गया है।
        const query = `INSERT INTO parts (part_number, description, rev_no, uom_id, is_active) VALUES ($1, $2, $3, $4, TRUE) RETURNING part_id, part_number, rev_no, description, uom_id, is_active;`;
        
        return await db.one(query, [
            partData.part_number, 
            partData.description, 
            partData.rev_no, 
            partData.uom_id
        ]);
        
    } catch (error) {
        // 23505: unique_violation (part_number + rev_no)
        if (error.code === '23505') { 
            throw new APIError('Part Number and Revision combination already exists.', 409);
        }
        // 23503: foreign_key_violation (invalid uom_id)
        if (error.code === '23503') { 
            throw new APIError('Invalid UOM ID provided (UOM not found).', 400);
        }
        throw error;
    }
}

/**
 * @async
 * @function getPartById
 * @description पार्ट ID द्वारा एक विशिष्ट पार्ट रिकॉर्ड प्राप्त करता है।
 * @param {number} partId - प्राप्त किए जाने वाले पार्ट का ID।
 * @returns {Promise<object|null>} पार्ट ऑब्जेक्ट या यदि नहीं मिला तो null।
 */
async function getPartById(partId) {
    // ✅ FIX: SQL Syntax Error को ठीक करने के लिए क्वेरी को एक ही लाइन में लिखा गया है।
    const query = `SELECT p.*, u.name AS uom_name, u.symbol AS uom_symbol FROM parts p JOIN uoms u ON p.uom_id = u.uom_id WHERE p.part_id = $1;`;
    
    return db.oneOrNone(query, partId);
}

/**
 * @async
 * @function getAllParts
 * @description फ़िल्टरिंग, सर्चिंग और पेजिंग के साथ सभी पार्ट रिकॉर्ड्स की सूची प्राप्त करता है।
 * @param {PartFilterParams} params - पेजिंग, सर्च और सक्रियता फ़िल्टरिंग पैरामीटर।
 * @returns {Promise<{data: object[], total_count: number}>} पार्ट डेटा की एक सरणी और कुल रिकॉर्ड की संख्या।
 */
async function getAllParts({ limit, offset, search, isActive }) {
    let where = 'WHERE 1=1'; 
    const params = []; 

    if (isActive !== null && isActive !== undefined) {
        params.push(isActive);
        where += ` AND is_active = $${params.length}`;
    }
    
    if (search) {
        params.push(`%${search.toLowerCase()}%`);
        where += ` AND (LOWER(part_number) LIKE $${params.length} OR LOWER(description) LIKE $${params.length})`;
    }

    params.push(limit, offset);
    
    // ✅ FIX: SQL Syntax Error को ठीक करने के लिए क्वेरी को एक ही लाइन में लिखा गया है।
    const dataQuery = `SELECT p.*, u.name AS uom_name, u.symbol AS uom_symbol FROM parts p JOIN uoms u ON p.uom_id = u.uom_id ${where} ORDER BY p.part_number LIMIT $${params.length - 1} OFFSET $${params.length};`;
    
    // ✅ FIX: SQL Syntax Error को ठीक करने के लिए क्वेरी को एक ही लाइन में लिखा गया है।
    const countQuery = `SELECT COUNT(*) FROM parts ${where};`;

    const data = await db.any(dataQuery, params);
    
    // COUNT क्वेरी में LIMIT/OFFSET पैरामीटर शामिल नहीं होते हैं, इसलिए उन्हें स्लाइस करें
    const total_count_result = await db.one(countQuery, params.slice(0, params.length - 2));

    return { data, total_count: parseInt(total_count_result.count, 10) };
}

/**
 * @async
 * @function updatePart
 * @description पार्ट ID द्वारा एक मौजूदा पार्ट रिकॉर्ड को अपडेट करता है।
 * @param {number} partId - अपडेट किए जाने वाले पार्ट का ID।
 * @param {Partial<PartData>} updateData - अपडेट किए जाने वाले फ़ील्ड्स।
 * @returns {Promise<object>} अपडेटेड पार्ट का संक्षिप्त ऑब्जेक्ट।
 * @throws {APIError} यदि पार्ट नंबर/रिवीज़न यूनिक नहीं है (409) या पार्ट नहीं मिला (404)।
 */
async function updatePart(partId, updateData) {
    try {
        // अपडेट के लिए उपयोग किए जाने वाले फ़ील्ड्स को परिभाषित करें
        const allowedFields = ['part_number', 'description', 'rev_no', 'uom_id', 'is_active'];
        
        // pg-promise helpers का उपयोग करके SET क्लॉज़ का निर्माण करें
        const set = db.helpers.set(updateData, allowedFields);
        const where = 'WHERE part_id = $1';
        
        // यदि कोई फ़ील्ड अपडेट के लिए पास नहीं किया गया है
        if (!set) return getPartById(partId); 

        // ✅ FIX: SQL Syntax Error को ठीक करने के लिए क्वेरी को एक ही लाइन में लिखा गया है।
        const query = `UPDATE parts ${set} ${where} RETURNING part_id, part_number, rev_no;`;
        
        const updatedPart = await db.oneOrNone(query, [partId]);
        
        if (!updatedPart) {
            throw new APIError(`Part with ID ${partId} not found.`, 404);
        }
        return updatedPart;
        
    } catch (error) {
        if (error.code === '23505') throw new APIError('Part Number and Revision combination already exists.', 409);
        if (error.code === '23503') throw new APIError('Invalid UOM ID provided.', 400); 
        
        if (error instanceof APIError) throw error; 
        throw error;
    }
}

/**
 * @async
 * @function deactivatePart
 * @description पार्ट ID द्वारा एक पार्ट को निष्क्रिय (`is_active = FALSE`) करता है।
 */
async function deactivatePart(partId) {
    const query = 'UPDATE parts SET is_active = FALSE WHERE part_id = $1 AND is_active = TRUE RETURNING part_id;';
    return db.oneOrNone(query, partId);
}

/**
 * @async
 * @function activatePart
 * @description पार्ट ID द्वारा एक पार्ट को पुनः सक्रिय (`is_active = TRUE`) करता है।
 */
async function activatePart(partId) {
    const query = 'UPDATE parts SET is_active = TRUE WHERE part_id = $1 AND is_active = FALSE RETURNING part_id;';
    return db.oneOrNone(query, partId);
}

// -------------------------------------------------------------------------
// Exports
// -------------------------------------------------------------------------

module.exports = {
    createPart,
    getPartById,
    getAllParts,
    updatePart,
    deactivatePart,
    activatePart,
};