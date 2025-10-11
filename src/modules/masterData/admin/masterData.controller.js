/**
 * @fileoverview Master Data Administration Controller.
 * @description यह कंट्रोलर जेनेरिक मास्टर डेटा CRUD (Create, Read, Update) ऑपरेशंस को डायनामिक टेबल
 * नाम (जैसे 'parts', 'vendors', 'customers') के साथ संभालता है। यह डेटाबेस मॉडल को कॉल करने से
 * पहले इनपुट सत्यापन और विशिष्ट व्यावसायिक लॉजिक (जैसे Part BOM या Vendor लिंकिंग) को लागू करता है।
 * @module modules/masterData/admin/masterData.controller
 * @requires ./masterData.model - डेटा एक्सेस लेयर
 * @requires ../../../utils/validation - ID सत्यापन हेल्पर
 */

const masterModel = require('./masterData.model'); 
const { handleNumericId } = require('../../../utils/validation'); 

// --- Configuration ---
/**
 * @const {object} VALID_TABLES - सुरक्षा के लिए मान्य शॉर्टहैंड टेबल नामों की सूची और उनका मैपिंग।
 * @property {object} key - टेबल का प्राइमरी की नाम।
 * @property {object} table - PostgreSQL में वास्तविक टेबल का नाम।
 */
const VALID_TABLES = {
    'parts': { table: 'master_parts', key: 'part_id' },
    'vendors': { table: 'master_vendors', key: 'vendor_id' },
    'customers': { table: 'master_customers', key: 'customer_id' },
    'users': { table: 'master_users', key: 'user_id' },
    'locations': { table: 'master_locations', key: 'location_id' },
};

/** * Helper: URL पैरामीटर से टेबल नाम और वैकल्पिक ID की जाँच करता है और आवश्यक कॉन्फ़िगरेशन प्रदान करता है।
 * @function validateTableAndId
 * @param {string} tableParam - URL से मास्टर डेटा टेबल का शॉर्टहैंड नाम।
 * @param {string} [id] - URL पैरामीटर से ID (वैकल्पिक, स्ट्रिंग के रूप में अपेक्षित)।
 * @returns {{config: object, id: number | null} | {error: string}} - कॉन्फ़िगरेशन या त्रुटि ऑब्जेक्ट।
 */
const validateTableAndId = (tableParam, id) => {
    const config = VALID_TABLES[tableParam];
    // handleNumericId का उपयोग करके ID को मान्य और पार्स करें
    const parsedId = id ? handleNumericId(id) : null; 

    if (!config) {
        return { error: 'Invalid master data table specified.' };
    }
    // केवल तभी जाँच करें जब ID प्रदान की गई हो
    if (id && parsedId === null) {
        return { error: `Invalid ID provided for ${tableParam}.` };
    }
    return { config, id: parsedId };
};

// =========================================================================
// A. GENERIC CRUD OPERATIONS (4)
// =========================================================================

/** * 1. एक विशिष्ट मास्टर डेटा टेबल के लिए सभी एंट्रीज़ की सूची प्राप्त करता है।
 * @async
 * @function getMasterList
 * @param {object} req - Express Request Object (अपेक्षा है कि req.params.tableName हो)।
 * @param {object} res - Express Response Object।
 * @param {function} next - Express Next Function।
 * @returns {Promise<void>} - JSON डेटा (200) या त्रुटि (400/500)।
 * @route GET /api/masterdata/:tableName
 */
const getMasterList = async (req, res, next) => {
    const { config, error } = validateTableAndId(req.params.tableName);
    if (error) return res.status(400).json({ error });

    try {
        const data = await masterModel.getAllMasterEntries(config.table);
        return res.status(200).json({ data });
    } catch (error) {
        return next(error);
    }
};

/** * 2. एक विशिष्ट मास्टर डेटा टेबल में एक नई एंट्री बनाता है।
 * @async
 * @function createMasterRecord
 * @param {object} req - Express Request Object (अपेक्षा है कि req.params.tableName और req.body हो)।
 * @param {object} res - Express Response Object।
 * @param {function} next - Express Next Function।
 * @returns {Promise<void>} - बनाया गया रिकॉर्ड (201 Created) या त्रुटि (400/500)।
 * @route POST /api/masterdata/:tableName
 * @detail Part बनाने के बाद, यह पार्ट कंट्रोल डेटा को इनिशियलाइज़ करने के लिए `initializePartControlData` को कॉल करता है।
 */
const createMasterRecord = async (req, res, next) => {
    const { config, error } = validateTableAndId(req.params.tableName);
    if (error) return res.status(400).json({ error });

    try {
        const newRecord = await masterModel.createMasterEntry(config.table, req.body);
        
        // CRITICAL: Part बनाने के बाद कंट्रोल डेटा इनिशियलाइज़ करें
        if (config.table === 'master_parts') {
            await masterModel.initializePartControlData(newRecord.part_id);
        }

        return res.status(201).json({ 
            message: `${req.params.tableName} record created.`, 
            data: newRecord 
        });
    } catch (error) {
        return next(error);
    }
};

/** * 3. ID द्वारा एक मास्टर एंट्री को अद्यतन करता है।
 * @async
 * @function updateMasterRecord
 * @param {object} req - Express Request Object (अपेक्षा है कि req.params.tableName, req.params.id और req.body हो)।
 * @param {object} res - Express Response Object।
 * @param {function} next - Express Next Function।
 * @returns {Promise<void>} - अपडेटेड रिकॉर्ड (200 OK) या त्रुटि (400/404/500)।
 * @route PUT /api/masterdata/:tableName/:id
 */
const updateMasterRecord = async (req, res, next) => {
    const { config, id: recordId, error } = validateTableAndId(req.params.tableName, req.params.id);
    if (error) return res.status(400).json({ error });

    try {
        const updatedRecord = await masterModel.updateMasterEntry(config.table, config.key, recordId, req.body);

        if (!updatedRecord) return res.status(404).json({ error: 'Record not found or update failed.' });

        return res.status(200).json({
            message: `${req.params.tableName} record ${recordId} updated.`,
            data: updatedRecord
        });
    } catch (error) {
        return next(error);
    }
};

/** * 4. ID द्वारा एक मास्टर एंट्री प्राप्त करता है (डिटेल और संबंधित डेटा के साथ)।
 * @async
 * @function getMasterRecordDetails
 * @param {object} req - Express Request Object (अपेक्षा है कि req.params.tableName और req.params.id हो)।
 * @param {object} res - Express Response Object।
 * @param {function} next - Express Next Function।
 * @returns {Promise<void>} - रिकॉर्ड डिटेल (200 OK) या त्रुटि (400/404/500)।
 * @route GET /api/masterdata/:tableName/:id
 * @detail यह फ़ंक्शन Customer रिकॉर्ड के लिए शिपिंग पते (`shipping_addresses`) जैसे संबंधित डेटा को भी जोड़ता है।
 */
const getMasterRecordDetails = async (req, res, next) => {
    const { config, id: recordId, error } = validateTableAndId(req.params.tableName, req.params.id);
    if (error) return res.status(400).json({ error });

    try {
        let details = null;
        // विशिष्ट लुकअप फ़ंक्शंस का उपयोग करें (मॉडल से)
        if (config.table === 'master_parts') details = await masterModel.getPartDetailsById(recordId);
        else if (config.table === 'master_vendors') details = await masterModel.getVendorDetailsById(recordId);
        else if (config.table === 'master_customers') details = await masterModel.getCustomerDetailsById(recordId);
        else if (config.table === 'master_users') details = await masterModel.getUserDetailsById(recordId);
        else details = await masterModel.getLocationDetailsById(recordId); 

        if (!details) return res.status(404).json({ error: 'Record not found.' });

        // Add related data (e.g., Customer Addresses)
        if (config.table === 'master_customers') {
            details.shipping_addresses = await masterModel.getCustomerShippingAddresses(recordId);
        }

        return res.status(200).json({ data: details });
    } catch (error) {
        return next(error);
    }
};


// =========================================================================
// B. SPECIFIC LINKING OPERATIONS (3)
// =========================================================================

/** * 5. एक Part के Bill of Materials (BOM) को अद्यतन करता है।
 * @async
 * @function updatePartBOM
 * @param {object} req - Express Request Object (अपेक्षा है कि req.params.partId और req.body.bom_lines Array हो)।
 * @param {object} res - Express Response Object।
 * @param {function} next - Express Next Function।
 * @returns {Promise<void>} - सफलता संदेश (200 OK) या त्रुटि (400/500)।
 * @route PUT /api/masterdata/parts/:partId/bom
 */
const updatePartBOM = async (req, res, next) => {
    const { error, id: partId } = handleIdValidation(req.params.partId, 'Part ID');
    if (error) return res.status(400).json({ error });

    const bomLines = req.body.bom_lines;
    if (!Array.isArray(bomLines)) return res.status(400).json({ error: 'BOM lines must be an array.' });
    
    try {
        await masterModel.updatePartBOM(partId, bomLines);
        return res.status(200).json({ message: `BOM updated successfully for Part ${partId}.` });
    } catch (error) {
        return next(error);
    }
};

/** * 6. एक Vendor को एक Part से लिंक करता है (Approved Supplier के रूप में)।
 * @async
 * @function linkVendorToPart
 * @param {object} req - Express Request Object (अपेक्षा है कि req.body में vendorId, partId, price और वैकल्पिक leadTime हो)।
 * @param {object} res - Express Response Object।
 * @param {function} next - Express Next Function।
 * @returns {Promise<void>} - लिंकिंग रिकॉर्ड (200 OK) या त्रुटि (400/500)।
 * @route POST /api/masterdata/link-vendor-part
 */
const linkVendorToPart = async (req, res, next) => {
    const { vendorId, partId, price, leadTime } = req.body;
    // Simple validation
    if (!vendorId || !partId || !price) return res.status(400).json({ error: 'Vendor ID, Part ID, and Price are required.' });

    try {
        const link = await masterModel.linkVendorToPart(vendorId, partId, price, leadTime);
        return res.status(200).json({ 
            message: 'Vendor linked to Part successfully.', 
            data: link
        });
    } catch (error) {
        return next(error);
    }
};

/** * 7. एक User को Customer या Vendor Entity से लिंक करता है।
 * @async
 * @function linkUserEntity
 * @param {object} req - Express Request Object (अपेक्षा है कि req.body में userId, entityId और entityType ('customer'/'vendor') हो)।
 * @param {object} res - Express Response Object।
 * @param {function} next - Express Next Function।
 * @returns {Promise<void>} - अपडेटेड यूजर रिकॉर्ड (200 OK) या त्रुटि (400/404/500)।
 * @route POST /api/masterdata/link-user-entity
 */
const linkUserEntity = async (req, res, next) => {
    const { userId, entityId, entityType } = req.body;
    if (!userId || !entityId || !['customer', 'vendor'].includes(entityType)) {
        return res.status(400).json({ error: 'User ID, Entity ID, and valid Entity Type (customer/vendor) are required.' });
    }

    try {
        const updatedUser = await masterModel.linkUserToEntity(userId, entityId, entityType);
        if (!updatedUser) return res.status(404).json({ error: 'User not found.' });

        return res.status(200).json({
            message: `User ${userId} linked to ${entityType} ${entityId}.`,
            data: updatedUser
        });
    } catch (error) {
        return next(error);
    }
};


// -------------------------------------------------------------------------
// FINAL EXPORTS 
// -------------------------------------------------------------------------

module.exports = {
    // Generic (1-4)
    getMasterList,
    getMasterRecordDetails,
    createMasterRecord,
    updateMasterRecord,

    // Specific Linking (5-7)
    updatePartBOM,
    linkVendorToPart,
    linkUserEntity,
};