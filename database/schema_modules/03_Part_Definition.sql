/**
 * @fileoverview JIT/QC Management System - SCHEMA MODULE 03: PRODUCT STRUCTURE AND DEFINITION
 * @description यह मॉड्यूल Master Parts, उनके संशोधन (Revisions), और 
 * बिल ऑफ मटेरियल (BOM) तथा रूटिंग स्ट्रक्चर को परिभाषित करता है।
 * यह विनिर्माण और QC प्रक्रियाओं के लिए आधारभूत डेटा है।
 * @module 03_Part_Definition
 */

-- ----------------------------------------------------------------------
-- 10. Master Parts (उत्पाद/घटक की परिभाषा)
-- ----------------------------------------------------------------------

/**
 * @table master_parts
 * @description निर्मित (manufactured), खरीदे गए (purchased), या स्टॉक किए गए 
 * सभी भागों (Parts) की मुख्य परिभाषाओं को संग्रहीत करता है।
 * @property {SERIAL} part_id - प्राथमिक कुंजी (PK)।
 * @property {VARCHAR(50)} part_no - पार्ट नंबर (अनिवार्य)।
 * @property {VARCHAR(10)} rev_no - संशोधन संख्या (Revision Number) (अनिवार्य)।
 * @property {VARCHAR(255)} part_name - पार्ट का नाम (अनिवार्य)।
 * @property {VARCHAR(50)} drawing_no - ड्राइंग नंबर (अनिवार्य)।
 * @property {INTEGER} uom_id - माप की इकाई (FK)। RESTRICT पर डिलीट।
 * @property {NUMERIC(10, 3)} std_weight_gm - मानक वजन (ग्राम में)। गैर-ऋणात्मक चेक।
 * @property {VARCHAR(100)} material_spec - सामग्री विनिर्देश (Material Specification) (अनिवार्य)।
 * @property {VARCHAR(100)} surface_treatment - सतह उपचार (Surface Treatment) का विवरण।
 * @property {BOOLEAN} qc_required - क्या इस पार्ट के लिए QC निरीक्षण आवश्यक है (डिफ़ॉल्ट FALSE)।
 * @property {INTEGER} std_lead_time_days - मानक लीड टाइम (दिनों में)। गैर-ऋणात्मक चेक।
 * @property {INTEGER} default_supplier_id - डिफ़ॉल्ट आपूर्तिकर्ता (FK)। RESTRICT पर डिलीट।
 * @property {INTEGER} default_client_id - डिफ़ॉल्ट ग्राहक (FK)। RESTRICT पर डिलीट।
 * @property {BOOLEAN} is_active - क्या पार्ट सक्रिय है (डिफ़ॉल्ट TRUE)।
 * @property {TIMESTAMP WITH TIME ZONE} created_at - रिकॉर्ड निर्माण का समय।
 * @property {TIMESTAMP WITH TIME ZONE} updated_at - रिकॉर्ड अद्यतन (update) का अंतिम समय।
 * @constraint part_rev_unique - सुनिश्चित करता है कि Part Number और Revision Number का संयोजन अद्वितीय हो।
 */
CREATE TABLE IF NOT EXISTS master_parts (
    part_id SERIAL PRIMARY KEY,
    part_no VARCHAR(50) NOT NULL,
    rev_no VARCHAR(10) NOT NULL,
    part_name VARCHAR(255) NOT NULL,
    drawing_no VARCHAR(50) NOT NULL,
    uom_id INTEGER REFERENCES master_uoms(uom_id) ON DELETE RESTRICT NOT NULL,
    std_weight_gm NUMERIC(10, 3) CHECK (std_weight_gm >= 0),
    material_spec VARCHAR(100) NOT NULL,
    surface_treatment VARCHAR(100),
    qc_required BOOLEAN NOT NULL DEFAULT FALSE,
    std_lead_time_days INTEGER NOT NULL DEFAULT 0 CHECK (std_lead_time_days >= 0),
    default_supplier_id INTEGER REFERENCES master_suppliers(supplier_id) ON DELETE RESTRICT,
    default_client_id INTEGER REFERENCES master_clients(client_id) ON DELETE RESTRICT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT part_rev_unique UNIQUE (part_no, rev_no)
);

-- ----------------------------------------------------------------------
-- 11. Master BOM & Routing (उत्पाद संरचना और विनिर्माण मार्ग)
-- ----------------------------------------------------------------------

/**
 * @table master_bom_routing
 * @description BOM (Bill of Material) और Routing (विनिर्माण अनुक्रम) दोनों को 
 * संग्रहीत करने के लिए एक जंक्शन तालिका।
 * @property {SERIAL} bom_routing_id - प्राथमिक कुंजी (PK)।
 * @property {INTEGER} parent_part_id - पैरेंट पार्ट (FK) जिसके लिए यह संरचना है। RESTRICT पर डिलीट।
 * @property {INTEGER} child_part_id - BOM के लिए आवश्यक चाइल्ड पार्ट (FK)। RESTRICT पर डिलीट।
 * @property {INTEGER} process_id - रूटिंग के लिए आवश्यक प्रक्रिया (FK)। RESTRICT पर डिलीट।
 * @property {NUMERIC(10, 3)} quantity - पैरेंट का एक यूनिट बनाने के लिए आवश्यक मात्रा। धनात्मक चेक (अनिवार्य)।
 * @property {INTEGER} sequence_no - BOM या रूटिंग में चरण का अनुक्रम नंबर (अनिवार्य)।
 * @property {TIMESTAMP WITH TIME ZONE} created_at - रिकॉर्ड निर्माण का समय।
 * @property {TIMESTAMP WITH TIME ZONE} updated_at - रिकॉर्ड अद्यतन (update) का अंतिम समय।
 * @constraint bom_sequence_unique - सुनिश्चित करता है कि एक पैरेंट पार्ट के लिए अनुक्रम संख्या अद्वितीय हो।
 * @constraint check_part_or_process - सुनिश्चित करता है कि BOM में या तो एक `child_part_id` (BOM लाइन) या 
 * एक `process_id` (Routing लाइन) परिभाषित हो, लेकिन दोनों नहीं।
 */
CREATE TABLE IF NOT EXISTS master_bom_routing (
    bom_routing_id SERIAL PRIMARY KEY,
    parent_part_id INTEGER REFERENCES master_parts(part_id) ON DELETE RESTRICT NOT NULL,
    child_part_id INTEGER REFERENCES master_parts(part_id) ON DELETE RESTRICT,
    process_id INTEGER REFERENCES master_processes(process_id) ON DELETE RESTRICT,
    quantity NUMERIC(10, 3) CHECK (quantity > 0) NOT NULL,
    sequence_no INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT bom_sequence_unique UNIQUE (parent_part_id, sequence_no),
    CONSTRAINT check_part_or_process CHECK ((child_part_id IS NOT NULL) OR (process_id IS NOT NULL))
);