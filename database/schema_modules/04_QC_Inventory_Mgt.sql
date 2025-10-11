/**
 * @fileoverview JIT/QC Management System - SCHEMA MODULE 04: QUALITY CONTROL AND INVENTORY MANAGEMENT
 * @description यह मॉड्यूल गुणवत्ता नियंत्रण (Quality Control) मापदंडों (Parameters), 
 * इन्वेंट्री (Inventory) के मास्टर डेटा, और नॉन-कन्फ़ॉर्मेन्स (Non-Conformance) कारणों 
 * को परिभाषित करता है।
 * @module 04_qc_inventory_Mgt
 */

-- ----------------------------------------------------------------------
-- 12. Master QC Parameters (गुणवत्ता नियंत्रण मापदंड)
-- ----------------------------------------------------------------------

/**
 * @table master_qc_parameters
 * @description पार्ट (Part) या प्रक्रिया (Process) के स्तर पर आवश्यक सभी 
 * निरीक्षण मापदंडों और उनकी सहनशीलता (tolerances) को संग्रहीत करता है।
 * @property {SERIAL} qc_param_id - प्राथमिक कुंजी (PK)।
 * @property {INTEGER} part_id - पार्ट जिस पर यह QC लागू होता है (FK)। CASCADE पर डिलीट।
 * @property {INTEGER} process_id - प्रक्रिया जिस पर यह QC लागू होता है (FK)। CASCADE पर डिलीट।
 * @property {VARCHAR(100)} parameter_name - मापदंड का नाम (उदा. 'Diameter A', 'Hardness') (अनिवार्य)।
 * @property {INTEGER} uom_id - माप की इकाई (FK) जो सहिष्णुता (tolerance) के लिए उपयोग की जाती है। RESTRICT पर डिलीट।
 * @property {NUMERIC(12, 4)} tolerance_min - स्वीकार्य निम्न सीमा (Minimum acceptable limit)।
 * @property {NUMERIC(12, 4)} tolerance_max - स्वीकार्य उच्च सीमा (Maximum acceptable limit)।
 * @property {VARCHAR(50)} inspection_type - निरीक्षण का प्रकार (उदा. 'MEASUREMENT', 'VISUAL') (अनिवार्य)।
 * @constraint check_target_exists - सुनिश्चित करता है कि या तो `part_id` या `process_id` में से कम से कम एक NULL न हो।
 * @property {BOOLEAN} is_active - क्या मापदंड सक्रिय है (डिफ़ॉल्ट TRUE)।
 * @property {TIMESTAMP WITH TIME ZONE} created_at - रिकॉर्ड निर्माण का समय।
 * @property {TIMESTAMP WITH TIME ZONE} updated_at - रिकॉर्ड अद्यतन (update) का अंतिम समय।
 */
CREATE TABLE IF NOT EXISTS master_qc_parameters (
    qc_param_id SERIAL PRIMARY KEY,
    part_id INTEGER REFERENCES master_parts(part_id) ON DELETE CASCADE,
    process_id INTEGER REFERENCES master_processes(process_id) ON DELETE CASCADE,
    parameter_name VARCHAR(100) NOT NULL,
    uom_id INTEGER REFERENCES master_uoms(uom_id) ON DELETE RESTRICT NOT NULL,
    tolerance_min NUMERIC(12, 4),
    tolerance_max NUMERIC(12, 4),
    inspection_type VARCHAR(50) NOT NULL,
    CONSTRAINT check_target_exists CHECK ( (part_id IS NOT NULL OR process_id IS NOT NULL) ),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------
-- 13. Master Inventories (मास्टर इन्वेंट्री स्टॉक)
-- ----------------------------------------------------------------------

/**
 * @table master_inventories
 * @description प्रत्येक पार्ट की वर्तमान इन्वेंट्री स्थिति को संग्रहीत करता है, जिसे 
 * भंडारण स्थान (storage location) के आधार पर ट्रैक किया जाता है।
 * @property {SERIAL} inventory_id - प्राथमिक कुंजी (PK)।
 * @property {INTEGER} part_id - पार्ट (FK) जिसका स्टॉक ट्रैक किया जा रहा है। RESTRICT पर डिलीट (अनिवार्य)।
 * @property {VARCHAR(50)} storage_location - विशिष्ट भंडारण स्थान (उदा. 'RACK A1', 'WIP-AREA') (अनिवार्य)।
 * @property {VARCHAR(50)} lot_number - वैकल्पिक बैच या लॉट नंबर (अद्वितीय)।
 * @property {INTEGER} uom_id - स्टॉक की इकाई (FK)। RESTRICT पर डिलीट (अनिवार्य)।
 * @property {NUMERIC(12, 3)} quantity_on_hand - वर्तमान भौतिक मात्रा (गैर-ऋणात्मक, डिफ़ॉल्ट 0)।
 * @property {NUMERIC(12, 3)} quantity_reserved - आरक्षित मात्रा (गैर-ऋणात्मक, डिफ़ॉल्ट 0)।
 * @property {TIMESTAMP WITH TIME ZONE} last_moved_at - अंतिम बार स्टॉक कब ले जाया गया।
 * @property {TIMESTAMP WITH TIME ZONE} updated_at - रिकॉर्ड अद्यतन (update) का अंतिम समय।
 * @constraint inventory_location_part_unique - सुनिश्चित करता है कि एक ही पार्ट/लोकेशन संयोजन एक बार ही मौजूद हो।
 */
CREATE TABLE IF NOT EXISTS master_inventories (
    inventory_id SERIAL PRIMARY KEY,
    part_id INTEGER REFERENCES master_parts(part_id) ON DELETE RESTRICT NOT NULL,
    storage_location VARCHAR(50) NOT NULL,
    lot_number VARCHAR(50) UNIQUE,
    uom_id INTEGER REFERENCES master_uoms(uom_id) ON DELETE RESTRICT NOT NULL,
    quantity_on_hand NUMERIC(12, 3) NOT NULL DEFAULT 0.00 CHECK (quantity_on_hand >= 0),
    quantity_reserved NUMERIC(12, 3) NOT NULL DEFAULT 0.00 CHECK (quantity_reserved >= 0),
    last_moved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT inventory_location_part_unique UNIQUE (part_id, storage_location)
);

-- ----------------------------------------------------------------------
-- 14. Master NCR Reasons (नॉन-कन्फ़ॉर्मेन्स रिपोर्ट के कारण)
-- ----------------------------------------------------------------------

/**
 * @table master_ncr_reasons
 * @description सभी संभावित गैर-अनुपालन (Non-Conformance) कारणों और उनके प्रबंधन विवरणों को संग्रहीत करता है।
 * @property {SERIAL} reason_id - प्राथमिक कुंजी (PK)।
 * @property {VARCHAR(20)} reason_code - कारण का संक्षिप्त कोड (उदा. 'DIM-FAIL', 'SCRATCH') (अनिवार्य और अद्वितीय)।
 * @property {VARCHAR(255)} reason_description - कारण का विस्तृत विवरण (अनिवार्य)।
 * @property {VARCHAR(50)} reason_category - कारण की श्रेणी (उदा. 'MATERIAL', 'MACHINING') (अनिवार्य)।
 * @property {BOOLEAN} is_active - क्या कारण सक्रिय है (डिफ़ॉल्ट TRUE)।
 * @property {INTEGER} created_by - Users तालिका से FK (रिकॉर्ड किसने बनाया)। SET NULL पर डिलीट।
 * @property {INTEGER} updated_by - Users तालिका से FK (रिकॉर्ड को अंतिम बार किसने अपडेट किया)। SET NULL पर डिलीट।
 * @property {INTEGER} deactivated_by - Users तालिका से FK (किसने निष्क्रिय किया)। SET NULL पर डिलीट।
 * @property {TIMESTAMP WITH TIME ZONE} created_at - रिकॉर्ड निर्माण का समय।
 * @property {TIMESTAMP WITH TIME ZONE} updated_at - रिकॉर्ड अद्यतन (update) का अंतिम समय।
 * @property {TIMESTAMP WITH TIME ZONE} deactivated_at - रिकॉर्ड के निष्क्रिय होने का समय।
 */
CREATE TABLE IF NOT EXISTS master_ncr_reasons (
    reason_id SERIAL PRIMARY KEY,
    reason_code VARCHAR(20) NOT NULL UNIQUE,
    reason_description VARCHAR(255) NOT NULL,
    reason_category VARCHAR(50) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    updated_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    deactivated_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deactivated_at TIMESTAMP WITH TIME ZONE
);