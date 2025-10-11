/**
 * @fileoverview यह फ़ाइल Express API के लिए सभी प्रमुख व्यावसायिक तर्क (business logic) 
 * और डेटा इंटीग्रिटी (data integrity) सत्यापन (validation) फ़ंक्शन प्रदान करती है।
 * यह Master Data, Authentication, और Entity Validation को केंद्रित और मजबूत तरीके से संभालती है।
 */

// =========================================================================
// 0. CORE UTILITIES
// =========================================================================

/**
 * स्ट्रिंग को ट्रिम करता है और सुनिश्चित करता है कि यह खाली न हो।
 * @function tr
 * @param {string | null | undefined} s - इनपुट मान (Value)।
 * @returns {string} - ट्रिम की हुई स्ट्रिंग, यदि इनपुट null/undefined है तो खाली स्ट्रिंग।
 */
const tr = (s) => String(s || '').trim();

/**
 * जांच करता है कि एक मान (Value) संख्यात्मक (Numeric) है, और वैकल्पिक फ़ील्ड के लिए 
 * null/undefined/खाली स्ट्रिंग को अनुमति देता है।
 * @function isNumeric
 * @param {*} value - जांचने के लिए इनपुट मान।
 * @returns {boolean} - यदि मान संख्यात्मक है, या यदि यह वैकल्पिक खाली मान है, तो `true`।
 */
const isNumeric = (value) => {
    if (value === null || value === undefined || value === '') return true; 
    const num = Number(value);
    // जांचता है कि यह संख्या है और अनंत (infinity) नहीं है
    return !isNaN(num) && isFinite(num); 
};


// =========================================================================
// A. AUTHENTICATION HELPERS (OTP & Email)
// =========================================================================

/**
 * 🔑 6 अंकों का रैंडम OTP स्ट्रिंग जनरेट करता है।
 * @function generateOtp
 * @returns {string} - 6-digit OTP string.
 */
const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * ईमेल एड्रेस की कठोरता से जांच करता है, जिसमें फॉर्मेट और लंबाई (length) शामिल है।
 * @function handleEmailValidation
 * @param {string} email - इनपुट ईमेल।
 * @returns {string | null} - एरर मैसेज (यदि अमान्य है) या `null` (यदि मान्य है)।
 */
const handleEmailValidation = (email) => {
    const trimmedEmail = tr(email);
    if (!trimmedEmail) {
        return 'Email address is required.';
    }
    // एक सामान्य और कठोर ईमेल रेगुलर एक्सप्रेशन
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,30}$/; 
    if (!emailRegex.test(trimmedEmail)) {
        return 'Invalid email format.';
    }
    if (trimmedEmail.length > 100) {
        return 'Email address must be under 100 characters.';
    }
    return null;
};


// =========================================================================
// B. MASTER DATA VALIDATION (Parts, UOMs, Clients, Suppliers, Stock Types/Statuses)
// =========================================================================

/**
 * Master Part बनाने के लिए इनपुट डेटा को सत्यापित करता है। सभी आवश्यक फ़ील्ड की उपस्थिति और लंबाई की जाँच करता है।
 * @function validatePartCreation
 * @param {object} data - पार्ट डेटा ऑब्जेक्ट।
 * @param {string} data.part_no - पार्ट नंबर (अनिवार्य)।
 * @param {string} data.rev_no - संशोधन संख्या (Revision Number) (अनिवार्य)।
 * @param {string} data.part_name - पार्ट का नाम (अनिवार्य)।
 * @param {number} data.uom_id - यूनिट ऑफ मेजरमेंट ID (अनिवार्य, धनात्मक संख्या)।
 * @param {number} [data.std_weight_gm] - मानक वजन।
 * @param {number} [data.std_lead_time_days] - मानक लीड टाइम।
 * @returns {string | null}
 */
const validatePartCreation = (data) => {
    const { part_no, rev_no, part_name, uom_id, std_weight_gm, std_lead_time_days } = data;
    
    if (!tr(part_no) || tr(part_no).length > 50) return 'Part Number is required and must be under 50 characters.';
    if (!tr(rev_no) || tr(rev_no).length > 10) return 'Revision Number is required and must be under 10 characters.';
    if (!tr(part_name) || tr(part_name).length > 255) return 'Part Name is required and must be under 255 characters.';
    if (!uom_id || !isNumeric(uom_id) || Number(uom_id) <= 0) return 'Valid UOM ID (Unit of Measurement) is required and must be positive.';

    if (std_weight_gm !== undefined && std_weight_gm !== null && (!isNumeric(std_weight_gm) || Number(std_weight_gm) < 0)) return 'Standard Weight must be a non-negative number.';
    if (std_lead_time_days !== undefined && std_lead_time_days !== null && (!isNumeric(std_lead_time_days) || Number(std_lead_time_days) < 0)) return 'Standard Lead Time must be a non-negative number.';

    return null; 
};

/**
 * Master Part को अपडेट करने के लिए इनपुट डेटा को सत्यापित करता है। केवल उन फ़ील्ड की जाँच करता है जो मौजूद हैं।
 * @function validatePartUpdate
 * @param {object} data - पार्ट डेटा ऑब्जेक्ट।
 * @returns {string | null}
 */
const validatePartUpdate = (data) => {
    if (Object.keys(data).length === 0) return 'Update body cannot be empty. Please provide at least one field to update.';
    
    const { part_no, rev_no, part_name, drawing_no, uom_id, std_weight_gm, material_spec, std_lead_time_days } = data;

    if (part_no !== undefined && (!tr(part_no) || tr(part_no).length > 50)) return 'Part Number must be under 50 characters.';
    if (rev_no !== undefined && (!tr(rev_no) || tr(rev_no).length > 10)) return 'Revision Number must be under 10 characters.';
    if (part_name !== undefined && (!tr(part_name) || tr(part_name).length > 255)) return 'Part Name must be under 255 characters.';
    if (drawing_no !== undefined && (!tr(drawing_no) || tr(drawing_no).length > 50)) return 'Drawing Number must be under 50 characters.';
    if (uom_id !== undefined && (!isNumeric(uom_id) || Number(uom_id) <= 0)) return 'Valid UOM ID (Unit of Measurement) must be positive.';
    if (material_spec !== undefined && (!tr(material_spec) || tr(material_spec).length > 100)) return 'Material Specification must be under 100 characters.';

    if (std_weight_gm !== undefined && (!isNumeric(std_weight_gm) || (std_weight_gm !== null && Number(std_weight_gm) < 0))) return 'Standard Weight must be a non-negative number.';
    if (std_lead_time_days !== undefined && (!isNumeric(std_lead_time_days) || (std_lead_time_days !== null && Number(std_lead_time_days) < 0))) return 'Standard Lead Time must be a non-negative number.';

    return null; 
};

/**
 * UOM (Unit of Measurement) बनाने के लिए इनपुट डेटा को सत्यापित करता है।
 * @function validateUomCreation
 * @param {object} data - UOM डेटा ऑब्जेक्ट।
 * @param {string} data.uom_code - UOM कोड (अनिवार्य)।
 * @param {string} data.uom_name - UOM नाम (अनिवार्य)।
 * @returns {string | null}
 */
const validateUomCreation = (data) => {
    const { uom_code, uom_name } = data;
    if (!tr(uom_code) || tr(uom_code).length < 2 || tr(uom_code).length > 10) return 'UOM Code is required and must be between 2 and 10 characters (e.g., PC, KG).';
    if (!tr(uom_name) || tr(uom_name).length > 50) return 'UOM Name is required and must be under 50 characters.';
    return null; 
};

/**
 * Stock Type बनाने के लिए इनपुट डेटा को सत्यापित करता है।
 * @function validateStockTypeCreation
 * @param {object} data - स्टॉक टाइप डेटा ऑब्जेक्ट।
 * @param {string} data.type_code - टाइप कोड (अनिवार्य)।
 * @param {string} data.type_name - टाइप नाम (अनिवार्य)।
 * @returns {string | null}
 */
const validateStockTypeCreation = (data) => {
    const { type_code, type_name } = data;
    if (!tr(type_code) || tr(type_code).length < 2 || tr(type_code).length > 20) return 'Stock Type Code is required and must be between 2 and 20 characters (e.g., RAW, FINISHED).';
    if (!tr(type_name) || tr(type_name).length > 50) return 'Stock Type Name is required and must be under 50 characters.';
    return null; 
};

/**
 * Stock Status बनाने के लिए इनपुट डेटा को सत्यापित करता है।
 * @function validateStockStatusCreation
 * @param {object} data - स्टॉक स्टेटस डेटा ऑब्जेक्ट।
 * @param {string} data.status_code - स्टेटस कोड (अनिवार्य)।
 * @param {string} data.status_name - स्टेटस नाम (अनिवार्य)।
 * @param {boolean} [data.is_negative_allowed] - क्या नकारात्मक स्टॉक की अनुमति है।
 * @returns {string | null}
 */
const validateStockStatusCreation = (data) => {
    const { status_code, status_name, is_negative_allowed } = data;
    if (!tr(status_code) || tr(status_code).length < 2 || tr(status_code).length > 20) return 'Stock Status Code is required and must be between 2 and 20 characters (e.g., OK, REJECT).';
    if (!tr(status_name) || tr(status_name).length > 50) return 'Stock Status Name is required and must be under 50 characters.';
    if (is_negative_allowed !== undefined && typeof is_negative_allowed !== 'boolean') return 'is_negative_allowed must be a boolean.';
    return null; 
};

/**
 * Stock Status को अपडेट करने के लिए इनपुट डेटा को सत्यापित करता है।
 * @function validateStockStatusUpdate
 * @param {object} data - स्टॉक स्टेटस अपडेट डेटा ऑब्जेक्ट।
 * @returns {string | null}
 */
const validateStockStatusUpdate = (data) => {
    if (Object.keys(data).length === 0) return 'Update body cannot be empty. Please provide at least one field to update.';
    const { status_code, status_name, is_active, is_negative_allowed } = data;

    if (status_code !== undefined && (!tr(status_code) || tr(status_code).length < 2 || tr(status_code).length > 20)) return 'Stock Status Code must be between 2 and 20 characters.';
    if (status_name !== undefined && (!tr(status_name) || tr(status_name).length > 50)) return 'Stock Status Name must be under 50 characters.';
    if (is_active !== undefined && typeof is_active !== 'boolean') return 'is_active must be a boolean.';
    if (is_negative_allowed !== undefined && typeof is_negative_allowed !== 'boolean') return 'is_negative_allowed must be a boolean.';
    
    return null; 
};

// =========================================================================
// C. QC VALIDATION (Skipped for brevity, assume valid if not provided)
// =========================================================================

/**
 * QC Lot निर्माण के लिए प्लेसहोल्डर सत्यापन फ़ंक्शन।
 * @function validateQCLotCreation
 * @param {object} data - QC Lot डेटा।
 * @returns {string | null}
 */
const validateQCLotCreation = (data) => {
    // ... QC Lot validation logic ...
    return null;
};

/**
 * QC Lot अद्यतन के लिए प्लेसहोल्डर सत्यापन फ़ंक्शन।
 * @function validateQCLotUpdate
 * @param {object} data - QC Lot अपडेट डेटा।
 * @returns {string | null}
 */
const validateQCLotUpdate = (data) => {
    // ... QC Lot update validation logic ...
    return null;
};

/**
 * निरीक्षण परिणामों के लिए प्लेसहोल्डर सत्यापन फ़ंक्शन।
 * @function validateInspectionResults
 * @param {object} results - निरीक्षण परिणाम डेटा।
 * @returns {string | null}
 */
const validateInspectionResults = (results) => {
    // ... Inspection results validation logic ...
    return null;
};


// =========================================================================
// D. SUPPLIER & CLIENT VALIDATION (Final Focused Logic)
// =========================================================================

/**
 * सप्लायर बनाने के लिए इनपुट डेटा को सत्यापित करता है।
 * @function validateSupplierCreation
 * @param {object} data - सप्लायर डेटा ऑब्जेक्ट।
 * @param {string} data.supplier_name - सप्लायर का नाम (अनिवार्य)।
 * @param {string} data.supplier_code - सप्लायर कोड (अनिवार्य)।
 * @param {string} [data.email] - ईमेल (वैकल्पिक, लेकिन मान्य होना चाहिए यदि मौजूद है)।
 * @param {string} [data.phone] - फ़ोन नंबर (वैकल्पिक)।
 * @param {number} data.created_by - निर्माता उपयोगकर्ता ID (अनिवार्य)।
 * @returns {string | null}
 */
const validateSupplierCreation = (data) => {
    const { supplier_name, supplier_code, email, phone, created_by } = data;

    // 1. Supplier Name जाँचें
    if (!tr(supplier_name) || tr(supplier_name).length > 255) {
        return 'Supplier Name is required and must be under 255 characters.';
    }

    // 2. Supplier Code जाँचें
    if (!tr(supplier_code) || tr(supplier_code).length > 50) {
        return 'Supplier Code is required and must be under 50 characters.';
    }

    // 3. Email जाँचें (Optional but validate if present)
    if (email) {
        const emailError = handleEmailValidation(email);
        if (tr(email) && emailError) return `Email validation error for Supplier: ${emailError}`;
    }
    
    // 4. Phone जाँचें (Optional but validate if present)
    if (phone && tr(phone).length > 15) return 'Phone number must be under 15 characters.';

    // 5. Created By ID जाँचें
    if (!created_by || !isNumeric(created_by) || Number(created_by) <= 0) {
        return 'Creator ID (created_by) is required and must be a positive number.';
    }

    return null;
};

/**
 * सप्लायर को अपडेट करने के लिए इनपुट डेटा को सत्यापित करता है।
 * @function validateSupplierUpdate
 * @param {object} data - सप्लायर अपडेट डेटा ऑब्जेक्ट।
 * @returns {string | null}
 */
const validateSupplierUpdate = (data) => {
    if (Object.keys(data).length === 0) return 'Update body cannot be empty. Please provide at least one field to update.';

    const { supplier_name, supplier_code, email, phone } = data;
    
    if (supplier_name !== undefined && (!tr(supplier_name) || tr(supplier_name).length > 255)) return 'Supplier Name must be under 255 characters.';
    if (supplier_code !== undefined && (!tr(supplier_code) || tr(supplier_code).length > 50)) return 'Supplier Code must be under 50 characters.';

    if (email !== undefined && tr(email)) {
        const emailError = handleEmailValidation(email);
        if (emailError) return `Email validation error for Supplier: ${emailError}`;
    }
    
    if (phone !== undefined && tr(phone).length > 15) return 'Phone number must be under 15 characters.';

    return null;
};


/**
 * क्लाइंट बनाने के लिए इनपुट डेटा को सत्यापित करता है।
 * @function validateClientCreation
 * @param {object} data - क्लाइंट डेटा ऑब्जेक्ट।
 * @param {string} data.client_name - क्लाइंट का नाम (अनिवार्य)।
 * @param {string} [data.email] - ईमेल (वैकल्पिक, लेकिन मान्य होना चाहिए यदि मौजूद है)।
 * @param {string} [data.phone] - फ़ोन नंबर (वैकल्पिक)।
 * @param {number} data.created_by - निर्माता उपयोगकर्ता ID (अनिवार्य)।
 * @returns {string | null}
 */
const validateClientCreation = (data) => {
    const { client_name, email, phone, created_by } = data;
    
    if (!tr(client_name) || tr(client_name).length > 255) return 'Client Name is required and must be under 255 characters.';
    if (email) {
        const emailError = handleEmailValidation(email);
        if (tr(email) && emailError) return `Email validation error for Client: ${emailError}`;
    }
    if (phone && tr(phone).length > 15) return 'Phone number must be under 15 characters.';
    if (!created_by || !isNumeric(created_by) || Number(created_by) <= 0) return 'Creator ID (created_by) is required and must be a positive number.';
    
    return null;
};

/**
 * क्लाइंट को अपडेट करने के लिए इनपुट डेटा को सत्यापित करता है।
 * @function validateClientUpdate
 * @param {object} data - क्लाइंट अपडेट डेटा ऑब्जेक्ट।
 * @returns {string | null}
 */
const validateClientUpdate = (data) => {
    if (Object.keys(data).length === 0) return 'Update body cannot be empty. Please provide at least one field to update.';
    const { client_name, email, phone } = data;

    if (client_name !== undefined && (!tr(client_name) || tr(client_name).length > 255)) return 'Client Name must be under 255 characters.';
    if (email !== undefined && tr(email)) {
        const emailError = handleEmailValidation(email);
        if (emailError) return `Email validation error for Client: ${emailError}`;
    }
    if (phone !== undefined && tr(phone).length > 15) return 'Phone number must be under 15 characters.';

    return null;
};


// =========================================================================
// E. FINAL EXPORTS (Module Interface)
// =========================================================================

module.exports = {
    // 0. Core Helpers
    isNumeric, 
    tr,
    
    // A. Authentication Helpers
    generateOtp, 
    handleEmailValidation, 
    
    // B. Master Part & UOM
    validatePartCreation,
    validatePartUpdate, 
    validateUomCreation, 
    /** @function validateUomUpdate - UOM अद्यतन के लिए प्लेसहोल्डर। */
    validateUomUpdate: (data) => { /* Add actual UOM update logic here */ return null; }, 
    
    // B. Master Client & Supplier 
    validateSupplierCreation, 
    validateSupplierUpdate,
    validateClientCreation,
    validateClientUpdate,
    
    // B. Master Stock Type & Status
    validateStockTypeCreation,
    /** @function validateStockTypeUpdate - Stock Type अद्यतन के लिए प्लेसहोल्डर। */
    validateStockTypeUpdate: (data) => { /* Add actual Stock Type update logic here */ return null; }, 
    validateStockStatusCreation,
    validateStockStatusUpdate,
    
    // C. QC Module
    validateQCLotCreation,
    validateQCLotUpdate, 
    validateInspectionResults,
};