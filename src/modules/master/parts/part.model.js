// src/modules/master/parts/part.model.js

/**
 * @fileoverview यह मॉड्यूल Parts मास्टर डेटा के लिए सभी डेटाबेस इंटरैक्शन लॉजिक को संभालता है।
 * यह PostgreSQL के साथ कुशलतापूर्वक इंटरैक्ट करने के लिए `pg-promise` (db) का उपयोग करता है।
 */

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

// --- Part Core CRUD & Complex Queries ---

/**
 * @async
 * @function createPart
 * @description डेटाबेस में एक नया पार्ट रिकॉर्ड बनाता है।
 * @param {PartData} partData - पार्ट के लिए आवश्यक डेटा।
 * @returns {Promise<object>} बनाया गया पार्ट ऑब्जेक्ट, जिसमें ID और अन्य फ़ील्ड्स शामिल हैं।
 * @throws {APIError} यदि पार्ट नंबर/रिवीज़न पहले से मौजूद है (HTTP 409) या UOM ID अमान्य है (HTTP 400)।
 */
async function createPart(partData) {
    try {
        const query = `
            INSERT INTO parts (part_number, description, rev_no, uom_id, is_active)
            VALUES ($1, $2, $3, $4, TRUE)
            RETURNING part_id, part_number, rev_no, description, uom_id, is_active;
        `;
        // db.one का उपयोग यह सुनिश्चित करता है कि ठीक एक रिकॉर्ड लौटाया गया है।
        return await db.one(query, [partData.part_number, partData.description, partData.rev_no, partData.uom_id]);
    } catch (error) {
        // 23505: unique_violation (part_number + rev_no का यूनिक संयोजन)
        if (error.code === '23505') { 
            throw new APIError('Part Number and Revision combination already exists.', 409);
        }
        // 23503: foreign_key_violation (invalid uom_id)
        if (error.code === '23503') { 
            throw new APIError('Invalid UOM ID provided.', 400);
        }
        throw error; // अन्य त्रुटियों को पास करें
    }
}

/**
 * @async
 * @function getPartById
 * @description पार्ट ID द्वारा एक विशिष्ट पार्ट रिकॉर्ड प्राप्त करता है, जिसमें संबंधित UOM जानकारी शामिल होती है।
 * @param {number} partId - प्राप्त किए जाने वाले पार्ट का ID।
 * @returns {Promise<object|null>} पार्ट ऑब्जेक्ट या यदि नहीं मिला तो null।
 */
async function getPartById(partId) {
    const query = `
        SELECT p.*, u.name AS uom_name, u.symbol AS uom_symbol 
        FROM parts p 
        JOIN uoms u ON p.uom_id = u.uom_id 
        WHERE p.part_id = $1;
    `;
    // db.oneOrNone का उपयोग यह सुनिश्चित करता है कि 0 या 1 रिकॉर्ड लौटाया गया है।
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
    let where = 'WHERE 1=1'; // डायनामिक WHERE क्लॉज़ के लिए बेस
    const params = []; // SQL क्वेरी के लिए पैरामीटर सरणी

    // isActive फ़िल्टरिंग
    if (isActive !== null) {
        params.push(isActive);
        where += ` AND is_active = $${params.length}`;
    }
    // Search फ़िल्टरिंग (part_number या description में)
    if (search) {
        params.push(`%${search.toLowerCase()}%`);
        // एक ही पैरामीटर को दो बार उपयोग करने के लिए $${params.length}
        where += ` AND (LOWER(part_number) LIKE $${params.length} OR LOWER(description) LIKE $${params.length})`;
    }

    // Pagination (LIMIT और OFFSET) को पैरामीटर सरणी में जोड़ें
    params.push(limit, offset);
    
    // मुख्य डेटा क्वेरी (UOM के साथ JOIN)
    const dataQuery = `
        SELECT p.*, u.name AS uom_name, u.symbol AS uom_symbol 
        FROM parts p 
        JOIN uoms u ON p.uom_id = u.uom_id 
        ${where} 
        ORDER BY p.part_number
        LIMIT $${params.length - 1} OFFSET $${params.length};
    `;
    // कुल गणना क्वेरी
    const countQuery = `SELECT COUNT(*) FROM parts ${where};`;

    // क्वेरीज़ चलाएँ
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
 * @throws {APIError} यदि पार्ट नंबर/रिवीज़न यूनिक नहीं है (HTTP 409), UOM ID अमान्य है (HTTP 400), या पार्ट नहीं मिला (HTTP 404)।
 */
async function updatePart(partId, updateData) {
    try {
        // pg-promise helpers का उपयोग करके SET क्लॉज़ का निर्माण करें
        const set = db.helpers.set(updateData, ['part_number', 'description', 'rev_no', 'uom_id', 'is_active']);
        const where = 'WHERE part_id = $1';
        
        // यदि कोई फ़ील्ड अपडेट के लिए पास नहीं किया गया है, तो वर्तमान पार्ट लौटाएँ
        if (set.length === 0) return getPartById(partId);

        const query = `
            UPDATE parts ${set} ${where}
            RETURNING part_id, part_number, rev_no;
        `;
        
        const updatedPart = await db.oneOrNone(query, partId);
        if (!updatedPart) throw new APIError(`Part with ID ${partId} not found.`, 404);
        return updatedPart;
    } catch (error) {
        if (error.code === '23505') throw new APIError('Part Number and Revision combination already exists.', 409);
        if (error.code === '23503') throw new APIError('Invalid UOM ID provided.', 400);
        
        // यदि एरर एक APIError है (जैसे 404), तो इसे पुनः फेंक दें
        if (error instanceof APIError) throw error; 
        throw error;
    }
}

// Deactivate/Activate logic (using set)
/**
 * @async
 * @function deactivatePart
 * @description पार्ट ID द्वारा एक पार्ट को निष्क्रिय (`is_active = FALSE`) करता है।
 * @param {number} partId - निष्क्रिय किए जाने वाले पार्ट का ID।
 * @returns {Promise<object|null>} निष्क्रिय किए गए पार्ट का ID या यदि पहले से ही निष्क्रिय या नहीं मिला तो null।
 */
async function deactivatePart(partId) {
    const query = 'UPDATE parts SET is_active = FALSE WHERE part_id = $1 AND is_active = TRUE RETURNING part_id;';
    return db.oneOrNone(query, partId);
}
/**
 * @async
 * @function activatePart
 * @description पार्ट ID द्वारा एक पार्ट को पुनः सक्रिय (`is_active = TRUE`) करता है।
 * @param {number} partId - सक्रिय किए जाने वाले पार्ट का ID।
 * @returns {Promise<object|null>} सक्रिय किए गए पार्ट का ID या यदि पहले से ही सक्रिय या नहीं मिला तो null।
 */
async function activatePart(partId) {
    const query = 'UPDATE parts SET is_active = TRUE WHERE part_id = $1 AND is_active = FALSE RETURNING part_id;';
    return db.oneOrNone(query, partId);
}

// Add remaining complex Part functions (getActiveQCPlan, getPartQCSummary, getAllRevisions) here...

/**
 * @exports PartModel
 * @description पार्ट मास्टर डेटा को प्रबंधित करने के लिए सभी डेटाबेस इंटरैक्शन फ़ंक्शंस का निर्यात।
 */
module.exports = {
    createPart,
    getPartById,
    getAllParts,
    updatePart,
    deactivatePart,
    activatePart,
    // ... export remaining functions
};