/**
 * @fileoverview Master Data Database Model.
 * @description यह मॉड्यूल विभिन्न मास्टर डेटा तालिकाओं (जैसे Parts, Vendors, Users) के लिए
 * डेटाबेस पहुँच लॉजिक (DAL) को संभालता है। यह PostgreSQL के साथ इंटरैक्ट करने के लिए pg-promise
 * और SQL Helpers का उपयोग करता है।
 * @module modules/masterData/admin/masterData.model
 * @requires ../../../database/db - PostgreSQL कनेक्शन ऑब्जेक्ट
 * @requires pg-promise
 */

const db = require('../../../database/db'); 
const pgp = require('pg-promise')({ capSQL: true });

// =========================================================================
// A. GENERIC UTILITY FUNCTIONS (Reusable for any Master Table) (3)
// =========================================================================

/** * 1. किसी भी मास्टर टेबल में एक नई एंट्री बनाता है।
 * @async
 * @function createMasterEntry
 * @param {string} tableName - टारगेट टेबल का PostgreSQL नाम (जैसे 'master_parts')।
 * @param {object} data - इंसर्ट करने के लिए की-वैल्यू पेयर (req.body)।
 * @returns {Promise<object>} - बनाया गया रिकॉर्ड ऑब्जेक्ट।
 */
const createMasterEntry = async (tableName, data) => {
    // Note: यहाँ data में केवल table_name के columns होने चाहिए।
    const columnSet = new pgp.helpers.ColumnSet(Object.keys(data), { table: tableName });
    const query = pgp.helpers.insert(data, columnSet) + ' RETURNING *';
    return db.one(query); 
};

/** * 2. किसी भी मास्टर टेबल में एक एंट्री को अद्यतन (Update) करता है।
 * @async
 * @function updateMasterEntry
 * @param {string} tableName - टारगेट टेबल का PostgreSQL नाम।
 * @param {string} primaryKey - टेबल की प्राथमिक कुंजी (Primary Key) का नाम (जैसे 'part_id')।
 * @param {number} id - अद्यतन करने के लिए रिकॉर्ड की ID।
 * @param {object} data - अद्यतन करने के लिए फ़ील्ड्स और वैल्यूज।
 * @returns {Promise<object | null>} - अद्यतन किया गया रिकॉर्ड या यदि नहीं मिला तो `null`।
 */
const updateMasterEntry = async (tableName, primaryKey, id, data) => {
    // Audit Trail: updated_at को स्वचालित रूप से जोड़ें
    data.updated_at = new Date(); 
    
    // Note: Update helpers केवल उन्हीं columns को लेंगे जो data object में हैं।
    const condition = pgp.as.format('WHERE $1:name = $2', [primaryKey, id]);
    const query = pgp.helpers.update(data, null, tableName) + condition + ' RETURNING *';
    
    return db.oneOrNone(query);
};

/** * 3. किसी भी मास्टर टेबल से सभी सक्रिय (Active) एंट्रीज प्राप्त करता है।
 * @async
 * @function getAllMasterEntries
 * @param {string} tableName - टारगेट टेबल का PostgreSQL नाम।
 * @param {string} [activeColumn='is_active'] - सक्रियता (activity) जाँचने के लिए कॉलम का नाम।
 * @returns {Promise<Array<object>>} - सक्रिय रिकॉर्ड्स की सरणी।
 */
const getAllMasterEntries = async (tableName, activeColumn = 'is_active') => {
    // सक्रिय रिकॉर्ड्स को फ़िल्टर करता है
    const query = `SELECT * FROM ${tableName} WHERE ${activeColumn} = TRUE ORDER BY 1 DESC`;
    return db.any(query);
};

// =========================================================================
// B. PARTS & UOM MANAGEMENT (4)
// =========================================================================

/** * 4. ID द्वारा Part Details प्राप्त करता है, जिसमें संबंधित UOM और Category नाम शामिल हैं।
 * @async
 * @function getPartDetailsById
 * @param {number} partId - पार्ट ID।
 * @returns {Promise<object | null>} - पार्ट डिटेल ऑब्जेक्ट या `null`।
 */
const getPartDetailsById = async (partId) => {
    const query = `
        SELECT 
            mp.*, mu.uom_code AS inventory_uom, mpt.category_name AS part_category
        FROM 
            master_parts mp
        LEFT JOIN 
            master_uoms mu ON mp.inventory_uom_id = mu.uom_id
        LEFT JOIN 
            master_part_categories mpt ON mp.category_id = mpt.category_id
        WHERE 
            mp.part_id = $1
    `;
    return db.oneOrNone(query, [partId]);
};

/** * 5. एक नए Part के लिए प्रारंभिक स्टॉक नियंत्रण डेटा (`master_part_control`) सेट करता है।
 * @async
 * @function initializePartControlData
 * @param {number} partId - पार्ट ID जिसके लिए डेटा इनिशियलाइज़ करना है।
 * @returns {Promise<object>} - बनाया गया कंट्रोल रिकॉर्ड।
 */
const initializePartControlData = async (partId) => {
    // Reorder Planning के लिए डिफ़ॉल्ट सेटिंग्स
    const data = {
        part_id: partId,
        reorder_level: 0,
        safety_stock: 0,
        standard_cost: 0.0,
        is_tracked_by_lot: false,
    };
    const columnSet = new pgp.helpers.ColumnSet(Object.keys(data), { table: 'master_part_control' });
    const query = pgp.helpers.insert(data, columnSet) + ' RETURNING *';
    return db.one(query);
};

/** * 6. सभी सक्रिय Units of Measure (UOM) प्राप्त करता है।
 * @async
 * @function getAllUoms
 * @returns {Promise<Array<object>>} - UOM रिकॉर्ड्स की सरणी।
 */
const getAllUoms = async () => {
    return db.any('SELECT * FROM master_uoms WHERE is_active = TRUE ORDER BY uom_code ASC');
};

/** * 7. एक Part के लिए BOM (`master_part_bom`) को अद्यतन (Update) करता है।
 * @async
 * @function updatePartBOM
 * @param {number} partId - Finished Good Part ID।
 * @param {Array<object>} bomLines - नए BOM लाइन्स की सरणी।
 * @returns {Promise<true>} - सफलता पर `true`।
 * @detail यह ऑपरेशन परमाणुता (atomicity) के लिए मौजूदा BOM को हटाता है और फिर नया BOM डालता है।
 */
const updatePartBOM = async (partId, bomLines) => {
    // मौजूदा BOM को हटाएँ
    await db.none('DELETE FROM master_part_bom WHERE finished_good_part_id = $1', [partId]);
    
    // नया BOM जोड़ें
    if (bomLines && bomLines.length > 0) {
        const linesWithId = bomLines.map(line => ({ 
            ...line, 
            finished_good_part_id: partId 
        }));
        const columnSet = new pgp.helpers.ColumnSet(['finished_good_part_id', 'component_part_id', 'quantity_required', 'uom_id'], { table: 'master_part_bom' });
        const query = pgp.helpers.insert(linesWithId, columnSet);
        return db.none(query);
    }
    return true;
};


// =========================================================================
// C. VENDOR & CUSTOMER MANAGEMENT (4)
// =========================================================================

/** * 8. ID द्वारा Vendor Details प्राप्त करता है।
 * @async
 * @function getVendorDetailsById
 * @param {number} vendorId - वेंडर ID।
 * @returns {Promise<object | null>} - वेंडर डिटेल ऑब्जेक्ट या `null`।
 */
const getVendorDetailsById = async (vendorId) => {
    return db.oneOrNone('SELECT * FROM master_vendors WHERE vendor_id = $1', [vendorId]);
};

/** * 9. ID द्वारा Customer Details प्राप्त करता है (Contact Info के साथ)।
 * @async
 * @function getCustomerDetailsById
 * @param {number} customerId - कस्टमर ID।
 * @returns {Promise<object | null>} - कस्टमर डिटेल ऑब्जेक्ट या `null`।
 */
const getCustomerDetailsById = async (customerId) => {
    const query = `
        SELECT 
            mc.*, mc.contact_email AS primary_contact_email, mc.phone_number AS primary_phone
        FROM 
            master_customers mc
        WHERE 
            mc.customer_id = $1
    `;
    return db.oneOrNone(query, [customerId]);
};

/** * 10. एक Customer के लिए सभी सक्रिय शिपिंग पते (`master_customer_addresses`) प्राप्त करता है।
 * @async
 * @function getCustomerShippingAddresses
 * @param {number} customerId - कस्टमर ID।
 * @returns {Promise<Array<object>>} - शिपिंग पतों की सरणी।
 */
const getCustomerShippingAddresses = async (customerId) => {
    return db.any('SELECT * FROM master_customer_addresses WHERE customer_id = $1 AND is_active = TRUE', [customerId]);
};

/** * 11. Vendor को एक Part से लिंक करता है (`master_vendor_parts`) या कॉन्फ्लिक्ट होने पर अद्यतन करता है।
 * @async
 * @function linkVendorToPart
 * @param {number} vendorId - वेंडर ID।
 * @param {number} partId - पार्ट ID।
 * @param {number} price - पार्ट के लिए Vendor का नवीनतम/मानक मूल्य।
 * @param {number} [leadTime] - लीड टाइम (दिनों में)।
 * @returns {Promise<object>} - बनाया/अद्यतन किया गया लिंकिंग रिकॉर्ड।
 * @detail यह फ़ंक्शन ON CONFLICT DO UPDATE का उपयोग करता है।
 */
const linkVendorToPart = async (vendorId, partId, price, leadTime) => {
    const data = {
        vendor_id: vendorId,
        part_id: partId,
        last_price: price,
        standard_lead_time_days: leadTime,
        is_preferred: true
    };
    const columnSet = new pgp.helpers.ColumnSet(Object.keys(data), { table: 'master_vendor_parts' });
    const query = pgp.helpers.insert(data, columnSet) + ' ON CONFLICT (vendor_id, part_id) DO UPDATE SET last_price = EXCLUDED.last_price, standard_lead_time_days = EXCLUDED.standard_lead_time_days RETURNING *';
    return db.one(query);
};

// =========================================================================
// D. USER & LOCATION MANAGEMENT (4)
// =========================================================================

/** * 12. ID द्वारा User Details प्राप्त करता है (संवेदनशील फ़ील्ड्स को हटाकर)।
 * @async
 * @function getUserDetailsById
 * @param {number} userId - यूजर ID।
 * @returns {Promise<object | null>} - यूजर डिटेल ऑब्जेक्ट (बिना पासवर्ड हैश के) या `null`।
 */
const getUserDetailsById = async (userId) => {
    return db.oneOrNone('SELECT user_id, email, full_name, role, customer_id, vendor_id, is_active FROM master_users WHERE user_id = $1', [userId]);
};

/** * 13. एक उपयोगकर्ता को एक Customer या Vendor से लिंक करता है।
 * @async
 * @function linkUserToEntity
 * @param {number} userId - यूजर ID।
 * @param {number} entityId - कस्टमर ID या वेंडर ID।
 * @param {string} entityType - एंटिटी का प्रकार ('customer' या 'vendor')।
 * @returns {Promise<object | null>} - अद्यतन किया गया यूजर रिकॉर्ड या `null`।
 */
const linkUserToEntity = async (userId, entityId, entityType) => {
    // entityType: 'customer' or 'vendor'
    const column = entityType === 'customer' ? 'customer_id' : 'vendor_id';
    // dynamic column name update
    const query = pgp.as.format('UPDATE master_users SET $1:name = $2 WHERE user_id = $3 RETURNING *', [column, entityId, userId]);
    return db.oneOrNone(query);
};

/** * 14. ID द्वारा Location Details (Warehouse/Bin) प्राप्त करता है।
 * @async
 * @function getLocationDetailsById
 * @param {number} locationId - लोकेशन ID।
 * @returns {Promise<object | null>} - लोकेशन डिटेल ऑब्जेक्ट या `null`।
 */
const getLocationDetailsById = async (locationId) => {
    return db.oneOrNone('SELECT * FROM master_locations WHERE location_id = $1', [locationId]);
};

/** * 15. एक नए Bin (Sub-location) को एक Warehouse (Parent Location) से लिंक करता है।
 * @async
 * @function linkBinToWarehouse
 * @param {string} binName - नया Bin कोड/नाम।
 * @param {number} warehouseId - पैरेंट वेयरहाउस ID।
 * @returns {Promise<object>} - बनाया गया लोकेशन रिकॉर्ड।
 */
const linkBinToWarehouse = async (binName, warehouseId) => {
    const data = {
        location_code: binName,
        location_type: 'BIN',
        parent_location_id: warehouseId,
        is_active: true
    };
    return createMasterEntry('master_locations', data);
};

// =========================================================================
// FINAL EXPORTS (All 15 Functions)
// =========================================================================

module.exports = {
    // Generic CRUD (1-3)
    createMasterEntry,
    updateMasterEntry,
    getAllMasterEntries,

    // Parts & UOM (4-7)
    getPartDetailsById,
    initializePartControlData,
    getAllUoms,
    updatePartBOM,

    // Vendor & Customer (8-11)
    getVendorDetailsById,
    getCustomerDetailsById,
    getCustomerShippingAddresses,
    linkVendorToPart,
    
    // User & Location (12-15)
    getUserDetailsById,
    linkUserToEntity,
    getLocationDetailsById,
    linkBinToWarehouse,
};