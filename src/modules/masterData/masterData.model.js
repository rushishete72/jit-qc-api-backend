// modules/masterData/masterData.model.js (FINAL, COMPLETE, & PROFESSIONAL)

/**
 * @fileoverview यह मॉड्यूल विभिन्न मास्टर डेटा (Parts, UOMs, Suppliers, Clients) के लिए 
 * डेटाबेस इंटरैक्शन फ़ंक्शंस (PostgreSQL) को संभालता है, जिसमें pg-promise लाइब्रेरी का उपयोग किया जाता है।
 * इसमें CRUD ऑपरेशंस, सक्रिय/निष्क्रिय (active/deactive) करना, और पेजिंग/फ़िल्टरिंग शामिल है।
 */

// ✅ पाथ फिक्स: माना जाता है कि db.js अब 'database' फ़ोल्डर में है।
/**
 * @type {import('pg-promise').IDatabase} db
 * @description डेटाबेस कनेक्शन इंस्टेंस जिसे 'database/db' से आयात किया गया है।
 */
const { db } = require('../../database/db');

/**
 * @type {import('pg-promise').IInitOptions} pgp
 * @description pg-promise लाइब्रेरी इंस्टेंस, जिसे SQL हेल्पर फ़ंक्शंस के लिए कॉन्फ़िगर किया गया है।
 */
const pgp = require('pg-promise')({ capSQL: true });

// निर्यात के लिए db ऑब्जेक्ट को भी एक्सपोर्ट करें (ताकि कंट्रोलर/अन्य मॉडल इसका उपयोग कर सकें)
// यह एक अच्छा अभ्यास है, हालाँकि इस मॉड्यूल में इसकी आवश्यकता नहीं है।
module.exports.db = db; 

// ----------------================================================---------
// 1. MASTER PART FUNCTIONS (8 Functions)
// ----------------================================================---------

/**
 * 1. एक नया मास्टर पार्ट बनाता है।
 * @async
 * @function createPart
 * @param {object} data - पार्ट डेटा ऑब्जेक्ट।
 * @param {string} data.part_no - पार्ट नंबर (अनिवार्य)।
 * @param {string} data.rev_no - संशोधन नंबर (अनिवार्य)।
 * @param {string} data.part_name - पार्ट का नाम।
 * @param {string} [data.drawing_no] - ड्राइंग नंबर।
 * @param {number} data.uom_id - यूनिट ऑफ़ मेज़रमेंट (UOM) ID (master_uoms से)।
 * @param {number} [data.std_weight_gm] - मानक वज़न (ग्राम में)।
 * @param {string} [data.material_spec] - सामग्री विनिर्देश (Material Specification)।
 * @param {string} [data.surface_treatment] - सरफेस ट्रीटमेंट।
 * @param {boolean} [data.qc_required] - क्या QC आवश्यक है।
 * @param {number} [data.std_lead_time_days] - मानक लीड टाइम (दिनों में)।
 * @param {number} [data.default_supplier_id] - डिफ़ॉल्ट सप्लायर ID (master_suppliers से)।
 * @param {number} [data.default_client_id] - डिफ़ॉल्ट क्लाइंट ID (master_clients से)।
 * @returns {Promise<object>} बनाए गए पार्ट ऑब्जेक्ट सहित परिणाम।
 * @throws {Error} यदि क्वेरी विफल होती है।
 */
const createPart = async (data) => {
    /**
     * @type {import('pg-promise').helpers.ColumnSet} columnSet
     * @description `master_parts` तालिका के लिए Insert/Update के लिए कॉलम सेट परिभाषा।
     */
    const columnSet = new pgp.helpers.ColumnSet([
        'part_no', 'rev_no', 'part_name', 'drawing_no', 'uom_id', 
        'std_weight_gm', 'material_spec', 'surface_treatment', 
        'qc_required', 'std_lead_time_days', 'default_supplier_id', 
        'default_client_id'
    ], { table: 'master_parts' });
    
    /**
     * @type {string} query
     * @description pgp.helpers.insert द्वारा निर्मित SQL क्वेरी, जिसमें RETURNING * जोड़ा गया है।
     */
    const query = pgp.helpers.insert(data, columnSet) + ' RETURNING *';
    return db.one(query); 
};

/**
 * 2. Part No. और Rev. No. द्वारा पार्ट के अस्तित्व की जाँच करता है।
 * @async
 * @function checkPartExists
 * @param {string} partNo - पार्ट नंबर।
 * @param {string} revNo - संशोधन नंबर।
 * @returns {Promise<object|null>} यदि पार्ट मौजूद है तो `part_id` ऑब्जेक्ट, अन्यथा `null`।
 */
const checkPartExists = async (partNo, revNo) => {
    return db.oneOrNone(
        `SELECT part_id FROM master_parts WHERE part_no = $1 AND rev_no = $2`,
        [partNo, revNo]
    );
};

/**
 * 3. पार्ट ID द्वारा एक विशिष्ट पार्ट को रिट्रीव करता है (Joined Data के साथ)।
 * @async
 * @function getPartById
 * @param {number} partId - मास्टर पार्ट ID।
 * @returns {Promise<object|null>} जॉइन किए गए डेटा (UOM, Supplier, Client नाम) सहित पार्ट ऑब्जेक्ट, अन्यथा `null`।
 */
const getPartById = async (partId) => {
    /**
     * @type {string} query
     * @description `master_parts` से `master_uoms`, `master_suppliers`, और `master_clients` के साथ LEFT JOIN का उपयोग करके डेटा पुनर्प्राप्त करने के लिए SQL क्वेरी।
     */
    const query = `
        SELECT
            mp.*,
            mu.uom_code,
            ms.supplier_name AS default_supplier_name,
            mc.client_name AS default_client_name
        FROM 
            master_parts mp
        JOIN 
            master_uoms mu ON mp.uom_id = mu.uom_id
        LEFT JOIN
            master_suppliers ms ON mp.default_supplier_id = ms.supplier_id
        LEFT JOIN
            master_clients mc ON mp.default_client_id = mc.client_id
        WHERE 
            mp.part_id = $1
    `;
    return db.oneOrNone(query, [partId]);
};

/**
 * 4. Part No. और Rev. No. द्वारा विशिष्ट पार्ट को रिट्रीव करता है।
 * @async
 * @function getPartByPartNoRev
 * @param {string} partNo - पार्ट नंबर।
 * @param {string} revNo - संशोधन नंबर।
 * @returns {Promise<object|null>} जॉइन किए गए डेटा सहित पार्ट ऑब्जेक्ट, अन्यथा `null`।
 */
const getPartByPartNoRev = async (partNo, revNo) => {
     /**
     * @type {string} query
     * @description पार्ट नंबर और रिवीजन नंबर के आधार पर जॉइन किए गए डेटा के साथ पार्ट पुनर्प्राप्त करने के लिए SQL क्वेरी।
     */
     const query = `
        SELECT
            mp.*,
            mu.uom_code,
            ms.supplier_name AS default_supplier_name,
            mc.client_name AS default_client_name
        FROM 
            master_parts mp
        JOIN 
            master_uoms mu ON mp.uom_id = mu.uom_id
        LEFT JOIN
            master_suppliers ms ON mp.default_supplier_id = ms.supplier_id
        LEFT JOIN
            master_clients mc ON mp.default_client_id = mc.client_id
        WHERE 
            mp.part_no = $1 AND mp.rev_no = $2
    `;
    return db.oneOrNone(query, [partNo, revNo]);
};

/**
 * 5. सभी पार्ट्स को पेजिनेशन और फ़िल्टरिंग के साथ रिट्रीव करता है।
 * @async
 * @function getAllParts
 * @param {object} params - क्वेरी पैरामीटर।
 * @param {number} params.limit - प्रति पृष्ठ आइटम की अधिकतम संख्या।
 * @param {number} params.offset - स्किप्ड आइटम्स की संख्या (पेज इंडेक्स के लिए)।
 * @param {string} [params.search] - `part_no`, `part_name`, या `drawing_no` में खोजने के लिए स्ट्रिंग।
 * @param {boolean} [params.includeInactive=false] - निष्क्रिय (Inactive) पार्ट्स को शामिल करना है या नहीं।
 * @returns {Promise<{data: object[], total_count: number}>} पार्ट्स की एक सूची और कुल गणना।
 */
const getAllParts = async ({ limit, offset, search, includeInactive = false }) => {
    /**
     * @type {string} whereClause
     * @description फ़िल्टरिंग शर्तें रखने के लिए SQL WHERE क्लॉज़।
     */
    let whereClause = `WHERE 1=1`; 
    /**
     * @type {Array<any>} queryParams
     * @description SQL क्वेरी के लिए पैरामीटर की एक सरणी।
     */
    let queryParams = [];
    /**
     * @type {number} paramIndex
     * @description क्वेरी में अगले प्लेसहोल्डर ($1, $2, आदि) के लिए इंडेक्स।
     */
    let paramIndex = 1;

    if (!includeInactive) {
        whereClause += ` AND mp.is_active = $${paramIndex++}`;
        queryParams.push(true);
    }
    
    if (search) {
        whereClause += ` AND (mp.part_no ILIKE $${paramIndex} OR mp.part_name ILIKE $${paramIndex} OR mp.drawing_no ILIKE $${paramIndex})`;
        queryParams.push(`%${search}%`); 
        paramIndex++;
    }
    
    /**
     * @type {string} countQuery
     * @description कुल रिकॉर्ड की संख्या प्राप्त करने के लिए SQL क्वेरी।
     */
    const countQuery = `SELECT COUNT(part_id) AS total_count FROM master_parts mp ${whereClause}`;
    /**
     * @type {object} totalResult
     * @description कुल गणना के साथ डेटाबेस परिणाम।
     */
    const totalResult = await db.one(countQuery, queryParams.slice(0, paramIndex - 1));
    /**
     * @type {number} total_count
     * @description फ़िल्टरिंग के बाद कुल रिकॉर्ड की संख्या।
     */
    const total_count = parseInt(totalResult.total_count, 10);
    
    // LIMIT और OFFSET को queryParams में जोड़ें
    queryParams.push(limit, offset);

    /**
     * @type {string} finalQuery
     * @description पेजिंग, फ़िल्टरिंग और सॉर्टिंग के साथ पार्ट्स को रिट्रीव करने के लिए अंतिम SQL क्वेरी।
     */
    let finalQuery = `
        SELECT 
            mp.part_id, mp.part_no, mp.rev_no, mp.part_name, mp.is_active, 
            mu.uom_code, ms.supplier_name
        FROM 
            master_parts mp
        JOIN master_uoms mu ON mp.uom_id = mu.uom_id
        LEFT JOIN master_suppliers ms ON mp.default_supplier_id = ms.supplier_id
        ${whereClause} 
        ORDER BY mp.part_no ASC 
        LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;
    
    /**
     * @type {object[]} data
     * @description वर्तमान पेज के लिए पार्ट्स की सरणी।
     */
    const data = await db.any(finalQuery, queryParams);

    return { data, total_count };
};

/**
 * 6. पार्ट ID द्वारा पार्ट को अपडेट करता है।
 * @async
 * @function updatePart
 * @param {number} partId - अपडेट किए जाने वाले पार्ट का ID।
 * @param {object} data - अपडेटेड पार्ट डेटा ऑब्जेक्ट।
 * @returns {Promise<object|null>} अपडेटेड पार्ट ऑब्जेक्ट, यदि अपडेट सफल होता है, अन्यथा `null`।
 */
const updatePart = async (partId, data) => {
    /**
     * @type {import('pg-promise').helpers.ColumnSet} columnSet
     * @description `master_parts` तालिका के लिए अपडेट के लिए कॉलम सेट परिभाषा, जिसमें `updated_at` टाइमस्टैम्प शामिल है।
     */
    const columnSet = new pgp.helpers.ColumnSet([
        'part_no', 'rev_no', 'part_name', 'drawing_no', 'uom_id', 
        'std_weight_gm', 'material_spec', 'surface_treatment', 
        'qc_required', 'std_lead_time_days', 'default_supplier_id', 
        'default_client_id', 'is_active',
        { name: 'updated_at', init: () => new Date(), def: 'now()' } 
    ], { table: 'master_parts' });

    /**
     * @description pg-promise को WHERE क्लॉज़ के लिए `part_id` का उपयोग करने में सक्षम बनाने हेतु डेटा ऑब्जेक्ट में `part_id` जोड़ता है।
     */
    data.part_id = partId;
    
    /**
     * @type {string} query
     * @description pgp.helpers.update द्वारा निर्मित SQL क्वेरी, जिसमें WHERE क्लॉज़ और RETURNING * जोड़ा गया है।
     */
    const query = pgp.helpers.update(data, columnSet, null, { table: 'master_parts' }) 
                + ' WHERE part_id = ${part_id} RETURNING *';
    
    return db.oneOrNone(query, data);
};

/**
 * 7. पार्ट को निष्क्रिय (deactivate) करता है (Soft Delete)।
 * @async
 * @function deactivatePart
 * @param {number} partId - निष्क्रिय किए जाने वाले पार्ट का ID।
 * @returns {Promise<object|null>} यदि अपडेट सफल होता है तो `part_id` और `is_active` मान, अन्यथा `null`।
 */
const deactivatePart = async (partId) => {
    /**
     * @type {string} query
     * @description `is_active` को FALSE पर सेट करने के लिए SQL UPDATE क्वेरी।
     */
    const query = `
        UPDATE master_parts 
        SET is_active = FALSE, updated_at = NOW() 
        WHERE part_id = $1 AND is_active = TRUE
        RETURNING part_id, is_active
    `;
    return db.oneOrNone(query, [partId]);
};

/**
 * 8. पार्ट को पुनः सक्रिय (activate) करता है।
 * @async
 * @function activatePart
 * @param {number} partId - सक्रिय किए जाने वाले पार्ट का ID।
 * @returns {Promise<object|null>} यदि अपडेट सफल होता है तो `part_id` और `is_active` मान, अन्यथा `null`।
 */
const activatePart = async (partId) => {
    /**
     * @type {string} query
     * @description `is_active` को TRUE पर सेट करने के लिए SQL UPDATE क्वेरी।
     */
    const query = `
        UPDATE master_parts 
        SET is_active = TRUE, updated_at = NOW() 
        WHERE part_id = $1 AND is_active = FALSE
        RETURNING part_id, is_active
    `;
    return db.oneOrNone(query, [partId]);
};


// ----------------================================================---------
// 2. UOM FUNCTIONS (5 Functions)
// -------------------------------------------------------------------------

/**
 * 1. एक नया UOM (Unit of Measurement) बनाता है।
 * @async
 * @function createUom
 * @param {object} data - UOM डेटा ऑब्जेक्ट।
 * @param {string} data.uom_code - UOM कोड (जैसे 'PCS', 'KG')।
 * @param {string} data.uom_name - UOM का पूरा नाम।
 * @returns {Promise<object>} बनाए गए UOM ऑब्जेक्ट सहित परिणाम।
 * @throws {Error} यदि क्वेरी विफल होती है।
 */
const createUom = async (data) => {
    /**
     * @type {import('pg-promise').helpers.ColumnSet} columnSet
     * @description `master_uoms` तालिका के लिए Insert/Update के लिए कॉलम सेट परिभाषा।
     */
    const columnSet = new pgp.helpers.ColumnSet([
        'uom_code', 'uom_name'
    ], { table: 'master_uoms' });
    /**
     * @type {string} query
     * @description pgp.helpers.insert द्वारा निर्मित SQL क्वेरी।
     */
    const query = pgp.helpers.insert(data, columnSet) + ' RETURNING *';
    return db.one(query); 
};

/**
 * 2. UOM कोड द्वारा चेक करता है कि UOM पहले से मौजूद है या नहीं।
 * @async
 * @function checkUomExists
 * @param {string} uomCode - जाँच करने के लिए UOM कोड।
 * @returns {Promise<object|null>} यदि UOM मौजूद है तो `uom_id` ऑब्जेक्ट, अन्यथा `null`।
 */
const checkUomExists = async (uomCode) => {
    return db.oneOrNone(
        `SELECT uom_id FROM master_uoms WHERE uom_code = $1`,
        [uomCode]
    );
};

/**
 * 3. सभी UOMs को रिट्रीव करता है।
 * @async
 * @function getAllUoms
 * @param {object} params - क्वेरी पैरामीटर।
 * @param {boolean} [params.includeInactive=false] - निष्क्रिय UOMs को शामिल करना है या नहीं।
 * @returns {Promise<object[]>} UOM ऑब्जेक्ट की एक सरणी।
 */
const getAllUoms = async ({ includeInactive = false }) => {
    /**
     * @type {string} whereClause
     * @description `is_active` पर फ़िल्टर करने के लिए WHERE क्लॉज़।
     */
    let whereClause = includeInactive ? '' : 'WHERE is_active = TRUE'; 
    /**
     * @type {string} query
     * @description सभी UOMs को पुनर्प्राप्त करने के लिए SQL क्वेरी।
     */
    let query = `SELECT * FROM master_uoms ${whereClause} ORDER BY uom_name ASC`;
    return db.any(query);
};

/**
 * 4. UOM ID द्वारा UOM को अपडेट करता है।
 * @async
 * @function updateUom
 * @param {number} uomId - अपडेट किए जाने वाले UOM का ID।
 * @param {object} data - अपडेटेड UOM डेटा ऑब्जेक्ट।
 * @returns {Promise<object|null>} अपडेटेड UOM ऑब्जेक्ट, यदि अपडेट सफल होता है, अन्यथा `null`।
 */
const updateUom = async (uomId, data) => {
    /**
     * @type {import('pg-promise').helpers.ColumnSet} columnSet
     * @description `master_uoms` तालिका के लिए अपडेट के लिए कॉलम सेट परिभाषा।
     */
    const columnSet = new pgp.helpers.ColumnSet([
        'uom_code', 'uom_name', 'is_active', 
        { name: 'updated_at', init: () => new Date(), def: 'now()' } 
    ], { table: 'master_uoms' });

    /**
     * @description pg-promise को WHERE क्लॉज़ के लिए `uom_id` का उपयोग करने में सक्षम बनाने हेतु डेटा ऑब्जेक्ट में `uom_id` जोड़ता है।
     */
    data.uom_id = uomId; 
    
    /**
     * @type {string} query
     * @description pgp.helpers.update द्वारा निर्मित SQL क्वेरी, जिसमें WHERE क्लॉज़ और RETURNING * जोड़ा गया है।
     */
    const query = pgp.helpers.update(data, columnSet, null, { table: 'master_uoms' }) 
                + ' WHERE uom_id = ${uom_id} RETURNING *';
    
    return db.oneOrNone(query, data);
};

/**
 * 5. UOM को निष्क्रिय (deactivate) करता है (Soft Delete)।
 * @async
 * @function deactivateUom
 * @param {number} uomId - निष्क्रिय किए जाने वाले UOM का ID।
 * @returns {Promise<object|null>} यदि अपडेट सफल होता है तो `uom_id` और `is_active` मान, अन्यथा `null`।
 */
const deactivateUom = async (uomId) => {
    /**
     * @type {string} query
     * @description `is_active` को FALSE पर सेट करने के लिए SQL UPDATE क्वेरी।
     */
    const query = `
        UPDATE master_uoms 
        SET is_active = FALSE, updated_at = NOW() 
        WHERE uom_id = $1 AND is_active = TRUE
        RETURNING uom_id, is_active
    `;
    return db.oneOrNone(query, [uomId]);
};


// ----------------================================================---------
// 3. SUPPLIER FUNCTIONS (7 Functions)
// -------------------------------------------------------------------------

/**
 * 1. एक नया सप्लायर बनाता है।
 * @async
 * @function createSupplier
 * @param {object} data - सप्लायर डेटा ऑब्जेक्ट।
 * @param {string} data.supplier_code - सप्लायर कोड (अनिवार्य)।
 * @param {string} data.supplier_name - सप्लायर का नाम (अनिवार्य)।
 * @param {string} [data.contact_name] - संपर्क व्यक्ति का नाम।
 * @param {string} [data.contact_email] - संपर्क ईमेल।
 * @param {string} [data.contact_phone] - संपर्क फ़ोन नंबर।
 * @param {string} [data.address_line_1] - पता लाइन 1।
 * @param {string} [data.city] - शहर।
 * @param {string} [data.state] - राज्य।
 * @param {string} [data.zip_code] - पिन कोड।
 * @param {string} [data.country] - देश।
 * @returns {Promise<object>} बनाए गए सप्लायर ऑब्जेक्ट सहित परिणाम।
 * @throws {Error} यदि क्वेरी विफल होती है।
 */
const createSupplier = async (data) => {
    /**
     * @type {import('pg-promise').helpers.ColumnSet} columnSet
     * @description `master_suppliers` तालिका के लिए Insert/Update के लिए कॉलम सेट परिभाषा।
     */
    const columnSet = new pgp.helpers.ColumnSet([
        'supplier_code', 'supplier_name', 'contact_name', 
        'contact_email', 'contact_phone', 'address_line_1', 
        'city', 'state', 'zip_code', 'country'
    ], { table: 'master_suppliers' });
    /**
     * @type {string} query
     * @description pgp.helpers.insert द्वारा निर्मित SQL क्वेरी।
     */
    const query = pgp.helpers.insert(data, columnSet) + ' RETURNING *';
    return db.one(query); 
};

/**
 * 2. सप्लायर कोड द्वारा चेक करता है कि सप्लायर पहले से मौजूद है या नहीं।
 * @async
 * @function checkSupplierExists
 * @param {string} supplierCode - जाँच करने के लिए सप्लायर कोड।
 * @returns {Promise<object|null>} यदि सप्लायर मौजूद है तो `supplier_id` ऑब्जेक्ट, अन्यथा `null`।
 */
const checkSupplierExists = async (supplierCode) => {
    return db.oneOrNone(
        `SELECT supplier_id FROM master_suppliers WHERE supplier_code = $1`,
        [supplierCode]
    );
};

/**
 * 3. सप्लायर ID द्वारा एक सप्लायर को रिट्रीव करता है।
 * @async
 * @function getSupplierById
 * @param {number} supplierId - मास्टर सप्लायर ID।
 * @returns {Promise<object|null>} सप्लायर ऑब्जेक्ट (सभी कॉलम), अन्यथा `null`।
 */
const getSupplierById = async (supplierId) => {
    return db.oneOrNone(
        `SELECT * FROM master_suppliers WHERE supplier_id = $1`,
        [supplierId]
    );
};

/**
 * 4. सभी सप्लायर्स को पेजिनेशन और फ़िल्टरिंग के साथ रिट्रीव करता है।
 * @async
 * @function getAllSuppliers
 * @param {object} params - क्वेरी पैरामीटर।
 * @param {number} params.limit - प्रति पृष्ठ आइटम की अधिकतम संख्या।
 * @param {number} params.offset - स्किप्ड आइटम्स की संख्या (पेज इंडेक्स के लिए)।
 * @param {string} [params.search] - `supplier_code` या `supplier_name` में खोजने के लिए स्ट्रिंग।
 * @param {boolean} [params.includeInactive=false] - निष्क्रिय सप्लायर्स को शामिल करना है या नहीं।
 * @returns {Promise<{data: object[], total_count: number}>} सप्लायर्स की एक सूची और कुल गणना।
 */
const getAllSuppliers = async ({ limit, offset, search, includeInactive = false }) => {
    let whereClause = `WHERE 1=1`; 
    let queryParams = [];
    let paramIndex = 1;
    
    if (!includeInactive) {
        whereClause += ` AND is_active = $${paramIndex++}`;
        queryParams.push(true);
    }
    
    if (search) {
        whereClause += ` AND (supplier_code ILIKE $${paramIndex} OR supplier_name ILIKE $${paramIndex})`;
        queryParams.push(`%${search}%`); 
        paramIndex++;
    }
    
    /**
     * @type {string} countQuery
     * @description कुल रिकॉर्ड की संख्या प्राप्त करने के लिए SQL क्वेरी।
     */
    const countQuery = `SELECT COUNT(supplier_id) AS total_count FROM master_suppliers ${whereClause}`;
    /**
     * @type {object} totalResult
     * @description कुल गणना के साथ डेटाबेस परिणाम।
     */
    const totalResult = await db.one(countQuery, queryParams.slice(0, paramIndex - 1));
    /**
     * @type {number} total_count
     * @description फ़िल्टरिंग के बाद कुल रिकॉर्ड की संख्या।
     */
    const total_count = parseInt(totalResult.total_count, 10);
    
    // LIMIT और OFFSET को queryParams में जोड़ें
    queryParams.push(limit, offset);

    /**
     * @type {string} finalQuery
     * @description पेजिंग, फ़िल्टरिंग और सॉर्टिंग के साथ सप्लायर्स को रिट्रीव करने के लिए अंतिम SQL क्वेरी।
     */
    let finalQuery = `
        SELECT * FROM master_suppliers ${whereClause} 
        ORDER BY supplier_name ASC 
        LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;
    
    /**
     * @type {object[]} data
     * @description वर्तमान पेज के लिए सप्लायर्स की सरणी।
     */
    const data = await db.any(finalQuery, queryParams);

    return { data, total_count };
};

/**
 * 5. सप्लायर ID द्वारा सप्लायर को अपडेट करता है।
 * @async
 * @function updateSupplier
 * @param {number} supplierId - अपडेट किए जाने वाले सप्लायर का ID।
 * @param {object} data - अपडेटेड सप्लायर डेटा ऑब्जेक्ट।
 * @returns {Promise<object|null>} अपडेटेड सप्लायर ऑब्जेक्ट, यदि अपडेट सफल होता है, अन्यथा `null`।
 */
const updateSupplier = async (supplierId, data) => {
    /**
     * @type {import('pg-promise').helpers.ColumnSet} columnSet
     * @description `master_suppliers` तालिका के लिए अपडेट के लिए कॉलम सेट परिभाषा।
     */
    const columnSet = new pgp.helpers.ColumnSet([
        'supplier_code', 'supplier_name', 'contact_name', 
        'contact_email', 'contact_phone', 'address_line_1', 
        'city', 'state', 'zip_code', 'country', 'is_active',
        { name: 'updated_at', init: () => new Date(), def: 'now()' } 
    ], { table: 'master_suppliers' });

    /**
     * @description pg-promise को WHERE क्लॉज़ के लिए `supplier_id` का उपयोग करने में सक्षम बनाने हेतु डेटा ऑब्जेक्ट में `supplier_id` जोड़ता है।
     */
    data.supplier_id = supplierId;
    
    /**
     * @type {string} query
     * @description pgp.helpers.update द्वारा निर्मित SQL क्वेरी, जिसमें WHERE क्लॉज़ और RETURNING * जोड़ा गया है।
     */
    const query = pgp.helpers.update(data, columnSet, null, { table: 'master_suppliers' }) 
                + ' WHERE supplier_id = ${supplier_id} RETURNING *';
    
    return db.oneOrNone(query, data);
};

/**
 * 6. सप्लायर ID द्वारा सप्लायर को निष्क्रिय (deactivate) करता है (Soft Delete)।
 * @async
 * @function deactivateSupplier
 * @param {number} supplierId - निष्क्रिय किए जाने वाले सप्लायर का ID।
 * @returns {Promise<object|null>} यदि अपडेट सफल होता है तो `supplier_id` और `is_active` मान, अन्यथा `null`।
 */
const deactivateSupplier = async (supplierId) => {
    /**
     * @type {string} query
     * @description `is_active` को FALSE पर सेट करने के लिए SQL UPDATE क्वेरी।
     */
    const query = `
        UPDATE master_suppliers 
        SET is_active = FALSE, updated_at = NOW() 
        WHERE supplier_id = $1 AND is_active = TRUE
        RETURNING supplier_id, is_active
    `;
    return db.oneOrNone(query, [supplierId]);
};

/**
 * 7. सप्लायर ID द्वारा सप्लायर को पुनः सक्रिय (activate) करता है।
 * @async
 * @function activateSupplier
 * @param {number} supplierId - सक्रिय किए जाने वाले सप्लायर का ID।
 * @returns {Promise<object|null>} यदि अपडेट सफल होता है तो `supplier_id` और `is_active` मान, अन्यथा `null`।
 */
const activateSupplier = async (supplierId) => {
    /**
     * @type {string} query
     * @description `is_active` को TRUE पर सेट करने के लिए SQL UPDATE क्वेरी।
     */
    const query = `
        UPDATE master_suppliers 
        SET is_active = TRUE, updated_at = NOW() 
        WHERE supplier_id = $1 AND is_active = FALSE
        RETURNING supplier_id, is_active
    `;
    return db.oneOrNone(query, [supplierId]);
};


// ----------------================================================---------
// 4. CLIENT FUNCTIONS (7 Functions)
// -------------------------------------------------------------------------

/**
 * 1. एक नया क्लाइंट बनाता है।
 * @async
 * @function createClient
 * @param {object} data - क्लाइंट डेटा ऑब्जेक्ट।
 * @param {string} data.client_code - क्लाइंट कोड (अनिवार्य)।
 * @param {string} data.client_name - क्लाइंट का नाम (अनिवार्य)।
 * @param {string} [data.contact_name] - संपर्क व्यक्ति का नाम।
 * @param {string} [data.contact_email] - संपर्क ईमेल।
 * @param {string} [data.contact_phone] - संपर्क फ़ोन नंबर।
 * @param {string} [data.address_line_1] - पता लाइन 1।
 * @param {string} [data.city] - शहर।
 * @param {string} [data.state] - राज्य।
 * @param {string} [data.zip_code] - पिन कोड।
 * @param {string} [data.country] - देश।
 * @returns {Promise<object>} बनाए गए क्लाइंट ऑब्जेक्ट सहित परिणाम।
 * @throws {Error} यदि क्वेरी विफल होती है।
 */
const createClient = async (data) => {
    /**
     * @type {import('pg-promise').helpers.ColumnSet} columnSet
     * @description `master_clients` तालिका के लिए Insert/Update के लिए कॉलम सेट परिभाषा।
     */
    const columnSet = new pgp.helpers.ColumnSet([
        'client_code', 'client_name', 'contact_name', 
        'contact_email', 'contact_phone', 'address_line_1', 
        'city', 'state', 'zip_code', 'country'
    ], { table: 'master_clients' });
    /**
     * @type {string} query
     * @description pgp.helpers.insert द्वारा निर्मित SQL क्वेरी।
     */
    const query = pgp.helpers.insert(data, columnSet) + ' RETURNING *';
    return db.one(query); 
};

/**
 * 2. क्लाइंट कोड द्वारा चेक करता है कि क्लाइंट पहले से मौजूद है या नहीं।
 * @async
 * @function checkClientExists
 * @param {string} clientCode - जाँच करने के लिए क्लाइंट कोड।
 * @returns {Promise<object|null>} यदि क्लाइंट मौजूद है तो `client_id` ऑब्जेक्ट, अन्यथा `null`।
 */
const checkClientExists = async (clientCode) => {
    return db.oneOrNone(
        `SELECT client_id FROM master_clients WHERE client_code = $1`,
        [clientCode]
    );
};

/**
 * 3. क्लाइंट ID द्वारा एक क्लाइंट को रिट्रीव करता है।
 * @async
 * @function getClientById
 * @param {number} clientId - मास्टर क्लाइंट ID।
 * @returns {Promise<object|null>} क्लाइंट ऑब्जेक्ट (सभी कॉलम), अन्यथा `null`।
 */
const getClientById = async (clientId) => {
    return db.oneOrNone(
        `SELECT * FROM master_clients WHERE client_id = $1`,
        [clientId]
    );
};

/**
 * 4. सभी क्लाइंट्स को पेजिनेशन और फ़िल्टरिंग के साथ रिट्रीव करता है।
 * @async
 * @function getAllClients
 * @param {object} params - क्वेरी पैरामीटर।
 * @param {number} params.limit - प्रति पृष्ठ आइटम की अधिकतम संख्या।
 * @param {number} params.offset - स्किप्ड आइटम्स की संख्या (पेज इंडेक्स के लिए)।
 * @param {string} [params.search] - `client_code` या `client_name` में खोजने के लिए स्ट्रिंग।
 * @param {boolean} [params.includeInactive=false] - निष्क्रिय क्लाइंट्स को शामिल करना है या नहीं।
 * @returns {Promise<{data: object[], total_count: number}>} क्लाइंट्स की एक सूची और कुल गणना।
 */
const getAllClients = async ({ limit, offset, search, includeInactive = false }) => {
    let whereClause = `WHERE 1=1`; 
    let queryParams = [];
    let paramIndex = 1;
    
    if (!includeInactive) {
        whereClause += ` AND is_active = $${paramIndex++}`;
        queryParams.push(true);
    }
    
    if (search) {
        whereClause += ` AND (client_code ILIKE $${paramIndex} OR client_name ILIKE $${paramIndex})`;
        queryParams.push(`%${search}%`); 
        paramIndex++;
    }
    
    /**
     * @type {string} countQuery
     * @description कुल रिकॉर्ड की संख्या प्राप्त करने के लिए SQL क्वेरी।
     */
    const countQuery = `SELECT COUNT(client_id) AS total_count FROM master_clients ${whereClause}`;
    /**
     * @type {object} totalResult
     * @description कुल गणना के साथ डेटाबेस परिणाम।
     */
    const totalResult = await db.one(countQuery, queryParams.slice(0, paramIndex - 1));
    /**
     * @type {number} total_count
     * @description फ़िल्टरिंग के बाद कुल रिकॉर्ड की संख्या।
     */
    const total_count = parseInt(totalResult.total_count, 10);
    
    // LIMIT और OFFSET को queryParams में जोड़ें
    queryParams.push(limit, offset);

    /**
     * @type {string} finalQuery
     * @description पेजिंग, फ़िल्टरिंग और सॉर्टिंग के साथ क्लाइंट्स को रिट्रीव करने के लिए अंतिम SQL क्वेरी।
     */
    let finalQuery = `
        SELECT * FROM master_clients ${whereClause} 
        ORDER BY client_name ASC 
        LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;
    
    /**
     * @type {object[]} data
     * @description वर्तमान पेज के लिए क्लाइंट्स की सरणी।
     */
    const data = await db.any(finalQuery, queryParams);

    return { data, total_count };
};

/**
 * 5. क्लाइंट ID द्वारा क्लाइंट को अपडेट करता है।
 * @async
 * @function updateClient
 * @param {number} clientId - अपडेट किए जाने वाले क्लाइंट का ID।
 * @param {object} data - अपडेटेड क्लाइंट डेटा ऑब्जेक्ट।
 * @returns {Promise<object|null>} अपडेटेड क्लाइंट ऑब्जेक्ट, यदि अपडेट सफल होता है, अन्यथा `null`।
 */
const updateClient = async (clientId, data) => {
    /**
     * @type {import('pg-promise').helpers.ColumnSet} columnSet
     * @description `master_clients` तालिका के लिए अपडेट के लिए कॉलम सेट परिभाषा।
     */
    const columnSet = new pgp.helpers.ColumnSet([
        'client_code', 'client_name', 'contact_name', 
        'contact_email', 'contact_phone', 'address_line_1', 
        'city', 'state', 'zip_code', 'country', 'is_active',
        { name: 'updated_at', init: () => new Date(), def: 'now()' } 
    ], { table: 'master_clients' });

    /**
     * @description pg-promise को WHERE क्लॉज़ के लिए `client_id` का उपयोग करने में सक्षम बनाने हेतु डेटा ऑब्जेक्ट में `client_id` जोड़ता है।
     */
    data.client_id = clientId;
    
    /**
     * @type {string} query
     * @description pgp.helpers.update द्वारा निर्मित SQL क्वेरी, जिसमें WHERE क्लॉज़ और RETURNING * जोड़ा गया है।
     */
    const query = pgp.helpers.update(data, columnSet, null, { table: 'master_clients' }) 
                + ' WHERE client_id = ${client_id} RETURNING *';
    
    return db.oneOrNone(query, data);
};

/**
 * 6. क्लाइंट ID द्वारा क्लाइंट को निष्क्रिय (deactivate) करता है (Soft Delete)।
 * @async
 * @function deactivateClient
 * @param {number} clientId - निष्क्रिय किए जाने वाले क्लाइंट का ID।
 * @returns {Promise<object|null>} यदि अपडेट सफल होता है तो `client_id` और `is_active` मान, अन्यथा `null`।
 */
const deactivateClient = async (clientId) => {
    /**
     * @type {string} query
     * @description `is_active` को FALSE पर सेट करने के लिए SQL UPDATE क्वेरी।
     */
    const query = `
        UPDATE master_clients 
        SET is_active = FALSE, updated_at = NOW() 
        WHERE client_id = $1 AND is_active = TRUE
        RETURNING client_id, is_active
    `;
    return db.oneOrNone(query, [clientId]);
};

/**
 * 7. क्लाइंट ID द्वारा क्लाइंट को पुनः सक्रिय (activate) करता है।
 * @async
 * @function activateClient
 * @param {number} clientId - सक्रिय किए जाने वाले क्लाइंट का ID।
 * @returns {Promise<object|null>} यदि अपडेट सफल होता है तो `client_id` और `is_active` मान, अन्यथा `null`।
 */
const activateClient = async (clientId) => {
    /**
     * @type {string} query
     * @description `is_active` को TRUE पर सेट करने के लिए SQL UPDATE क्वेरी।
     */
    const query = `
        UPDATE master_clients 
        SET is_active = TRUE, updated_at = NOW() 
        WHERE client_id = $1 AND is_active = FALSE
        RETURNING client_id, is_active
    `;
    return db.oneOrNone(query, [clientId]);
};

// ----------------================================================---------
// FINAL EXPORTS (All Model Functions)
// ----------------================================-------------------------

/**
 * @exports masterDataModel
 * @description सभी मास्टर डेटा मॉडल फ़ंक्शंस का निर्यात।
 */
module.exports = {
    // DB EXPORT
    db, // pg-promise डेटाबेस इंस्टेंस
    
    // PART EXPORTS
    createPart, // एक नया पार्ट बनाता है
    checkPartExists, // पार्ट नंबर और रिवीज़न द्वारा अस्तित्व की जाँच करता है
    getPartById, // पार्ट ID द्वारा पार्ट विवरण प्राप्त करता है
    getPartByPartNoRev, // पार्ट नंबर और रिवीज़न द्वारा पार्ट विवरण प्राप्त करता है
    getAllParts, // पेजिंग और फ़िल्टरिंग के साथ सभी पार्ट्स प्राप्त करता है
    updatePart, // पार्ट ID द्वारा पार्ट अपडेट करता है
    deactivatePart, // पार्ट को निष्क्रिय करता है (soft delete)
    activatePart, // पार्ट को पुनः सक्रिय करता है
    
    // UOM EXPORTS
    createUom, // एक नया UOM बनाता है
    checkUomExists, // UOM कोड द्वारा अस्तित्व की जाँच करता है
    getAllUoms, // सभी UOMs को प्राप्त करता है
    updateUom, // UOM ID द्वारा UOM अपडेट करता है
    deactivateUom, // UOM को निष्क्रिय करता है
    
    // SUPPLIER EXPORTS
    createSupplier, // एक नया सप्लायर बनाता है
    checkSupplierExists, // सप्लायर कोड द्वारा अस्तित्व की जाँच करता है
    getSupplierById, // सप्लायर ID द्वारा सप्लायर विवरण प्राप्त करता है
    getAllSuppliers, // पेजिंग और फ़िल्टरिंग के साथ सभी सप्लायर्स प्राप्त करता है
    updateSupplier, // सप्लायर ID द्वारा सप्लायर अपडेट करता है
    deactivateSupplier, // सप्लायर को निष्क्रिय करता है
    activateSupplier, // सप्लायर को पुनः सक्रिय करता है

    // CLIENT EXPORTS
    createClient, // एक नया क्लाइंट बनाता है
    checkClientExists, // क्लाइंट कोड द्वारा अस्तित्व की जाँच करता है
    getClientById, // क्लाइंट ID द्वारा क्लाइंट विवरण प्राप्त करता है
    getAllClients, // पेजिंग और फ़िल्टरिंग के साथ सभी क्लाइंट्स प्राप्त करता है
    updateClient, // क्लाइंट ID द्वारा क्लाइंट अपडेट करता है
    deactivateClient, // क्लाइंट को निष्क्रिय करता है
    activateClient, // क्लाइंट को पुनः सक्रिय करता है
};