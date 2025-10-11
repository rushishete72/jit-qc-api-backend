/**
 * @fileoverview JIT/QC Management System - SCHEMA MODULE 02: CORE MASTER DATA
 * @description यह मॉड्यूल उन प्रमुख मास्टर डेटा संस्थाओं को परिभाषित करता है जो 
 * संचालन (operations) और इन्वेंट्री को आधार प्रदान करती हैं।
 * इसमें UOMs, Clients, Suppliers, और Manufacturing Processes शामिल हैं।
 * @module 02_Master_UOMs_Entities
 */

-- ----------------------------------------------------------------------
-- 6. Master UOMs (Unit of Measurements)
-- ----------------------------------------------------------------------

/**
 * @table master_uoms
 * @description सभी इन्वेंट्री और पार्ट-स्पेसिफिक मेट्रिक्स के लिए माप की इकाइयाँ (Units of Measurement) संग्रहीत करता है।
 * @property {SERIAL} uom_id - प्राथमिक कुंजी (PK)।
 * @property {VARCHAR(10)} uom_code - UOM कोड (उदा. 'PC', 'KG') (अनिवार्य और अद्वितीय)।
 * @property {VARCHAR(50)} uom_name - UOM का पूरा नाम (उदा. 'Pieces', 'Kilogram') (अनिवार्य)।
 * @property {VARCHAR(255)} description - इकाई का विस्तृत विवरण।
 * @property {NUMERIC(10, 5)} conversion_factor - बेस यूनिट से रूपांतरण कारक (उदा. 1000, 0.001)। डिफ़ॉल्ट 1.0, धनात्मक चेक।
 * @property {BOOLEAN} is_active - क्या UOM उपयोग के लिए सक्रिय है (डिफ़ॉल्ट TRUE)।
 * @property {TIMESTAMP WITH TIME ZONE} created_at - रिकॉर्ड निर्माण का समय।
 * @property {TIMESTAMP WITH TIME ZONE} updated_at - रिकॉर्ड अद्यतन (update) का अंतिम समय।
 * @property {INTEGER} created_by - Users तालिका से FK (रिकॉर्ड किसने बनाया)। SET NULL पर डिलीट।
 * @property {INTEGER} updated_by - Users तालिका से FK (रिकॉर्ड को अंतिम बार किसने अपडेट किया)। SET NULL पर डिलीट।
 */
CREATE TABLE IF NOT EXISTS master_uoms (
    uom_id SERIAL PRIMARY KEY,
    uom_code VARCHAR(10) NOT NULL UNIQUE,
    uom_name VARCHAR(50) NOT NULL,
    description VARCHAR(255),
    conversion_factor NUMERIC(10, 5) DEFAULT 1.0 CHECK (conversion_factor > 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    updated_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL
);

-- ----------------------------------------------------------------------
-- 7. Master Clients (ग्राहक)
-- ----------------------------------------------------------------------

/**
 * @table master_clients
 * @description उन सभी ग्राहकों की जानकारी संग्रहीत करता है जिनके लिए माल (goods) का निर्माण किया जाता है या बेचा जाता है।
 * @property {SERIAL} client_id - प्राथमिक कुंजी (PK)।
 * @property {VARCHAR(20)} client_code - ग्राहक कोड (अनिवार्य और अद्वितीय)।
 * @property {VARCHAR(255)} client_name - ग्राहक का पूरा नाम (अनिवार्य)।
 * @property {VARCHAR(15)} gst_no - GST नंबर (अद्वितीय)।
 * @property {VARCHAR(10)} pan_no - PAN नंबर (अद्वितीय)।
 * @property {VARCHAR(100)} default_contact_person - डिफ़ॉल्ट संपर्क व्यक्ति का नाम।
 * @property {VARCHAR(20)} default_phone - डिफ़ॉल्ट संपर्क फ़ोन नंबर।
 * @property {TEXT} delivery_address - डिफ़ॉल्ट डिलीवरी पता।
 * @property {NUMERIC(12, 2)} credit_limit - ग्राहक के लिए अनुमत क्रेडिट सीमा। गैर-ऋणात्मक चेक।
 * @property {VARCHAR(50)} qc_policy - ग्राहक की डिफ़ॉल्ट QC नीति (उदा. 'AQL', '100%') (अनिवार्य)।
 * @property {BOOLEAN} is_active - क्या ग्राहक सक्रिय है (डिफ़ॉल्ट TRUE)।
 * @property {TIMESTAMP WITH TIME ZONE} created_at - रिकॉर्ड निर्माण का समय।
 * @property {TIMESTAMP WITH TIME ZONE} updated_at - रिकॉर्ड अद्यतन (update) का अंतिम समय।
 */
CREATE TABLE IF NOT EXISTS master_clients (
    client_id SERIAL PRIMARY KEY,
    client_code VARCHAR(20) NOT NULL UNIQUE,
    client_name VARCHAR(255) NOT NULL,
    gst_no VARCHAR(15) UNIQUE,
    pan_no VARCHAR(10) UNIQUE,
    default_contact_person VARCHAR(100),
    default_phone VARCHAR(20),
    delivery_address TEXT,
    credit_limit NUMERIC(12, 2) DEFAULT 0.00 CHECK (credit_limit >= 0),
    qc_policy VARCHAR(50) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------
-- 8. Master Suppliers (आपूर्तिकर्ता)
-- ----------------------------------------------------------------------

/**
 * @table master_suppliers
 * @description उन सभी आपूर्तिकर्ताओं की जानकारी संग्रहीत करता है जिनसे कच्चा माल (raw material) या सेवाएं खरीदी जाती हैं।
 * @property {SERIAL} supplier_id - प्राथमिक कुंजी (PK)।
 * @property {VARCHAR(20)} supplier_code - आपूर्तिकर्ता कोड (अनिवार्य और अद्वितीय)।
 * @property {VARCHAR(255)} supplier_name - आपूर्तिकर्ता का पूरा नाम (अनिवार्य)।
 * @property {VARCHAR(15)} gst_no - GST नंबर (अद्वितीय)।
 * @property {VARCHAR(10)} pan_no - PAN नंबर (अद्वितीय)।
 * @property {VARCHAR(50)} supplier_type - आपूर्तिकर्ता का प्रकार (उदा. 'MATERIAL', 'SERVICE') (अनिवार्य)।
 * @property {VARCHAR(100)} default_contact_person - डिफ़ॉल्ट संपर्क व्यक्ति का नाम।
 * @property {VARCHAR(50)} payment_terms - डिफ़ॉल्ट भुगतान शर्तें (उदा. 'NET 30', 'COD') (अनिवार्य)।
 * @property {INTEGER} std_lead_time_days - मानक लीड टाइम (दिनों में)। गैर-ऋणात्मक चेक।
 * @property {BOOLEAN} is_active - क्या आपूर्तिकर्ता सक्रिय है (डिफ़ॉल्ट TRUE)।
 * @property {TIMESTAMP WITH TIME ZONE} created_at - रिकॉर्ड निर्माण का समय।
 * @property {TIMESTAMP WITH TIME ZONE} updated_at - रिकॉर्ड अद्यतन (update) का अंतिम समय।
 */
CREATE TABLE IF NOT EXISTS master_suppliers (
    supplier_id SERIAL PRIMARY KEY,
    supplier_code VARCHAR(20) NOT NULL UNIQUE,
    supplier_name VARCHAR(255) NOT NULL,
    gst_no VARCHAR(15) UNIQUE,
    pan_no VARCHAR(10) UNIQUE,
    supplier_type VARCHAR(50) NOT NULL,
    default_contact_person VARCHAR(100),
    payment_terms VARCHAR(50) NOT NULL,
    std_lead_time_days INTEGER NOT NULL DEFAULT 0 CHECK (std_lead_time_days >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------
-- 9. Master Processes (विनिर्माण प्रक्रियाएँ)
-- ----------------------------------------------------------------------

/**
 * @table master_processes
 * @description सभी विनिर्माण प्रक्रियाओं (manufacturing processes) की जानकारी संग्रहीत करता है।
 * @property {SERIAL} process_id - प्राथमिक कुंजी (PK)।
 * @property {VARCHAR(20)} process_code - प्रक्रिया कोड (अनिवार्य और अद्वितीय)।
 * @property {VARCHAR(100)} process_name - प्रक्रिया का नाम (अनिवार्य)।
 * @property {VARCHAR(50)} process_type - प्रक्रिया का प्रकार (उदा. 'MACHINING', 'ASSEMBLY') (अनिवार्य)।
 * @property {NUMERIC(10, 3)} std_cycle_time_min - मानक चक्र समय (मिनटों में)। धनात्मक चेक।
 * @property {NUMERIC(10, 3)} std_setup_time_min - मानक सेटअप समय (मिनटों में)। गैर-ऋणात्मक चेक।
 * @property {VARCHAR(50)} default_work_center - डिफ़ॉल्ट कार्य केंद्र (work center)।
 * @property {BOOLEAN} is_active - क्या प्रक्रिया सक्रिय है (डिफ़ॉल्ट TRUE)।
 * @property {TIMESTAMP WITH TIME ZONE} created_at - रिकॉर्ड निर्माण का समय।
 * @property {TIMESTAMP WITH TIME ZONE} updated_at - रिकॉर्ड अद्यतन (update) का अंतिम समय।
 */
CREATE TABLE IF NOT EXISTS master_processes (
    process_id SERIAL PRIMARY KEY,
    process_code VARCHAR(20) NOT NULL UNIQUE,
    process_name VARCHAR(100) NOT NULL,
    process_type VARCHAR(50) NOT NULL,
    std_cycle_time_min NUMERIC(10, 3) CHECK (std_cycle_time_min > 0),
    std_setup_time_min NUMERIC(10, 3) CHECK (std_setup_time_min >= 0),
    default_work_center VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);