/**
 * @fileoverview JSDoc Type Definitions for all Database Tables and Core Utilities.
 * @namespace DBTypes
 * @description यह फ़ाइल पूरे डेटाबेस स्कीमा के लिए केंद्रीय JSDoc typedefs को परिभाषित करती है, 
 * जिससे आपके JavaScript कोड में IntelliSense और type checking सक्षम होती है।
 */

// ----------------------------------------------------------------------
// CORE UTILITIES (From db.js)
// ----------------------------------------------------------------------

/**
 * PostgreSQL connection configuration object.
 * @typedef {object} ConnectionConfig
 * @property {string} host - Database host name or IP address.
 * @property {number} port - Database port number (default 5432).
 * @property {string} database - Database name.
 * @property {string} user - Database user.
 * @property {string} password - Database password.
 * @property {object|boolean} ssl - SSL configuration for secure connection.
 * @property {number} max - Maximum number of connections in the pool.
 */

// ----------------------------------------------------------------------
// SCHEMA MODULE 01: SECURITY AND USER MANAGEMENT TYPES
// ----------------------------------------------------------------------

/**
 * सिस्टम में विभिन्न उपयोगकर्ता भूमिकाओं को स्टोर करता है (उदा. Admin, QC Inspector, User)।
 * @typedef {object} Role
 * @property {number} role_id - प्राथमिक कुंजी (PK)।
 * @property {string} role_name - भूमिका का नाम (अनिवार्य और अद्वितीय)।
 * @property {Date} created_at - रिकॉर्ड निर्माण का समय।
 * @property {Date} updated_at - रिकॉर्ड अद्यतन (update) का अंतिम समय।
 */

/**
 * व्यक्तिगत अनुमतियाँ (granular permissions) स्टोर करता है।
 * @typedef {object} Permission
 * @property {number} permission_id - प्राथमिक कुंजी (PK)।
 * @property {string} permission_key - अनुमति कुंजी (अनिवार्य और अद्वितीय)।
 * @property {string} [description] - अनुमति का संक्षिप्त विवरण।
 * @property {Date} created_at - रिकॉर्ड निर्माण का समय।
 */

/**
 * Role और Permission के बीच मेनी-टू-मेनी संबंध को परिभाषित करती है।
 * @typedef {object} RolePermission
 * @property {number} role_id - Roles तालिका से विदेशी कुंजी (FK)।
 * @property {number} permission_id - Permissions तालिका से विदेशी कुंजी (FK)।
 */

/**
 * सभी सिस्टम उपयोगकर्ताओं की जानकारी संग्रहीत करता है।
 * @typedef {object} User
 * @property {number} user_id - प्राथमिक कुंजी (PK)।
 * @property {string} [employee_id] - कर्मचारी ID (अद्वितीय)।
 * @property {string} email - उपयोगकर्ता ईमेल (अनिवार्य और अद्वितीय)।
 * @property {string} [phone_number] - फ़ोन नंबर (अद्वितीय)।
 * @property {string} full_name - उपयोगकर्ता का पूरा नाम (अनिवार्य)।
 * @property {number} role_id - उपयोगकर्ता की भूमिका (FK)।
 * @property {string} [password_hash] - संग्रहीत पासवर्ड हैश।
 * @property {boolean} is_active - क्या उपयोगकर्ता सक्रिय है।
 * @property {boolean} is_verified - क्या ईमेल सत्यापित है।
 * @property {Date} created_at - रिकॉर्ड निर्माण का समय।
 * @property {Date} updated_at - रिकॉर्ड अद्यतन (update) का अंतिम समय।
 */

/**
 * उपयोगकर्ता सत्यापन (verification) या पासवर्ड रीसेट के लिए उत्पन्न OTP को संग्रहीत करता है।
 * @typedef {object} UserOtp
 * @property {number} otp_id - प्राथमिक कुंजी (PK)।
 * @property {number} user_id - Users तालिका से विदेशी कुंजी (FK)।
 * @property {string} otp_code - OTP हैश या कोड।
 * @property {Date} expires_at - OTP की समाप्ति का समय (Expiration time)।
 * @property {number} attempts - विफल प्रयासों की संख्या।
 * @property {Date} created_at - रिकॉर्ड निर्माण का समय।
 */

// ----------------------------------------------------------------------
// SCHEMA MODULE 02: CORE MASTER DATA TYPES
// ----------------------------------------------------------------------

/**
 * सभी इन्वेंट्री और पार्ट-स्पेसिफिक मेट्रिक्स के लिए माप की इकाइयाँ (Units of Measurement) संग्रहीत करता है।
 * @typedef {object} MasterUom
 * @property {number} uom_id - प्राथमिक कुंजी (PK)।
 * @property {string} uom_code - UOM कोड (अनिवार्य और अद्वितीय)।
 * @property {string} uom_name - UOM का पूरा नाम (अनिवार्य)।
 * @property {string} [description] - इकाई का विस्तृत विवरण।
 * @property {number} conversion_factor - बेस यूनिट से रूपांतरण कारक।
 * @property {boolean} is_active - क्या UOM उपयोग के लिए सक्रिय है।
 * @property {Date} created_at - रिकॉर्ड निर्माण का समय।
 * @property {Date} updated_at - रिकॉर्ड अद्यतन (update) का अंतिम समय।
 * @property {number} [created_by] - Users तालिका से FK (रिकॉर्ड किसने बनाया)।
 * @property {number} [updated_by] - Users तालिका से FK (रिकॉर्ड को अंतिम बार किसने अपडेट किया)।
 */

/**
 * उन सभी ग्राहकों की जानकारी संग्रहीत करता है जिनके लिए माल का निर्माण किया जाता है या बेचा जाता है।
 * @typedef {object} MasterClient
 * @property {number} client_id - प्राथमिक कुंजी (PK)।
 * @property {string} client_code - ग्राहक कोड (अनिवार्य और अद्वितीय)।
 * @property {string} client_name - ग्राहक का पूरा नाम (अनिवार्य)।
 * @property {string} [gst_no] - GST नंबर (अद्वितीय)।
 * @property {string} [pan_no] - PAN नंबर (अद्वितीय)।
 * @property {string} [default_contact_person] - डिफ़ॉल्ट संपर्क व्यक्ति का नाम।
 * @property {string} [default_phone] - डिफ़ॉल्ट संपर्क फ़ोन नंबर।
 * @property {string} [delivery_address] - डिफ़ॉल्ट डिलीवरी पता (TEXT)।
 * @property {number} credit_limit - ग्राहक के लिए अनुमत क्रेडिट सीमा।
 * @property {string} qc_policy - ग्राहक की डिफ़ॉल्ट QC नीति (अनिवार्य)।
 * @property {boolean} is_active - क्या ग्राहक सक्रिय है।
 * @property {Date} created_at - रिकॉर्ड निर्माण का समय।
 * @property {Date} updated_at - रिकॉर्ड अद्यतन (update) का अंतिम समय।
 */

/**
 * उन सभी आपूर्तिकर्ताओं की जानकारी संग्रहीत करता है जिनसे कच्चा माल या सेवाएं खरीदी जाती हैं।
 * @typedef {object} MasterSupplier
 * @property {number} supplier_id - प्राथमिक कुंजी (PK)।
 * @property {string} supplier_code - आपूर्तिकर्ता कोड (अनिवार्य और अद्वितीय)।
 * @property {string} supplier_name - आपूर्तिकर्ता का पूरा नाम (अनिवार्य)।
 * @property {string} [gst_no] - GST नंबर (अद्वितीय)।
 * @property {string} [pan_no] - PAN नंबर (अद्वितीय)।
 * @property {string} supplier_type - आपूर्तिकर्ता का प्रकार (अनिवार्य)।
 * @property {string} [default_contact_person] - डिफ़ॉल्ट संपर्क व्यक्ति का नाम।
 * @property {string} payment_terms - डिफ़ॉल्ट भुगतान शर्तें (अनिवार्य)।
 * @property {number} std_lead_time_days - मानक लीड टाइम (दिनों में)।
 * @property {boolean} is_active - क्या आपूर्तिकर्ता सक्रिय है।
 * @property {Date} created_at - रिकॉर्ड निर्माण का समय।
 * @property {Date} updated_at - रिकॉर्ड अद्यतन (update) का अंतिम समय।
 */

/**
 * सभी विनिर्माण प्रक्रियाओं (manufacturing processes) की जानकारी संग्रहीत करता है।
 * @typedef {object} MasterProcess
 * @property {number} process_id - प्राथमिक कुंजी (PK)।
 * @property {string} process_code - प्रक्रिया कोड (अनिवार्य और अद्वितीय)।
 * @property {string} process_name - प्रक्रिया का नाम (अनिवार्य)।
 * @property {string} process_type - प्रक्रिया का प्रकार (अनिवार्य)।
 * @property {number} [std_cycle_time_min] - मानक चक्र समय (मिनटों में)।
 * @property {number} [std_setup_time_min] - मानक सेटअप समय (मिनटों में)।
 * @property {string} [default_work_center] - डिफ़ॉल्ट कार्य केंद्र (work center)।
 * @property {boolean} is_active - क्या प्रक्रिया सक्रिय है।
 * @property {Date} created_at - रिकॉर्ड निर्माण का समय।
 * @property {Date} updated_at - रिकॉर्ड अद्यतन (update) का अंतिम समय।
 */

// ----------------------------------------------------------------------
// SCHEMA MODULE 03: PRODUCT STRUCTURE AND DEFINITION TYPES
// ----------------------------------------------------------------------

/**
 * निर्मित, खरीदे गए, या स्टॉक किए गए सभी भागों (Parts) की मुख्य परिभाषाओं को संग्रहीत करता है।
 * @typedef {object} MasterPart
 * @property {number} part_id - प्राथमिक कुंजी (PK)।
 * @property {string} part_no - पार्ट नंबर (अनिवार्य)।
 * @property {string} rev_no - संशोधन संख्या (Revision Number) (अनिवार्य)।
 * @property {string} part_name - पार्ट का नाम (अनिवार्य)।
 * @property {string} drawing_no - ड्राइंग नंबर (अनिवार्य)।
 * @property {number} uom_id - माप की इकाई (FK)।
 * @property {number} [std_weight_gm] - मानक वजन (ग्राम में)।
 * @property {string} material_spec - सामग्री विनिर्देश (अनिवार्य)।
 * @property {string} [surface_treatment] - सतह उपचार का विवरण।
 * @property {boolean} qc_required - क्या इस पार्ट के लिए QC निरीक्षण आवश्यक है।
 * @property {number} std_lead_time_days - मानक लीड टाइम (दिनों में)।
 * @property {number} [default_supplier_id] - डिफ़ॉल्ट आपूर्तिकर्ता (FK)।
 * @property {number} [default_client_id] - डिफ़ॉल्ट ग्राहक (FK)।
 * @property {boolean} is_active - क्या पार्ट सक्रिय है।
 * @property {Date} created_at - रिकॉर्ड निर्माण का समय।
 * @property {Date} updated_at - रिकॉर्ड अद्यतन (update) का अंतिम समय।
 */

/**
 * BOM (Bill of Material) और Routing (विनिर्माण अनुक्रम) दोनों को संग्रहीत करने के लिए जंक्शन तालिका।
 * @typedef {object} MasterBomRouting
 * @property {number} bom_routing_id - प्राथमिक कुंजी (PK)।
 * @property {number} parent_part_id - पैरेंट पार्ट (FK)।
 * @property {number} [child_part_id] - BOM के लिए आवश्यक चाइल्ड पार्ट (FK)।
 * @property {number} [process_id] - रूटिंग के लिए आवश्यक प्रक्रिया (FK)।
 * @property {number} quantity - पैरेंट का एक यूनिट बनाने के लिए आवश्यक मात्रा (अनिवार्य)।
 * @property {number} sequence_no - BOM या रूटिंग में चरण का अनुक्रम नंबर (अनिवार्य)।
 * @property {Date} created_at - रिकॉर्ड निर्माण का समय।
 * @property {Date} updated_at - रिकॉर्ड अद्यतन (update) का अंतिम समय।
 */

// ----------------------------------------------------------------------
// SCHEMA MODULE 04: QUALITY CONTROL AND INVENTORY MANAGEMENT TYPES
// ----------------------------------------------------------------------

/**
 * पार्ट या प्रक्रिया के स्तर पर आवश्यक सभी निरीक्षण मापदंडों और उनकी सहनशीलता को संग्रहीत करता है।
 * @typedef {object} MasterQcParameter
 * @property {number} qc_param_id - प्राथमिक कुंजी (PK)।
 * @property {number} [part_id] - पार्ट जिस पर यह QC लागू होता है (FK)।
 * @property {number} [process_id] - प्रक्रिया जिस पर यह QC लागू होता है (FK)।
 * @property {string} parameter_name - मापदंड का नाम (अनिवार्य)।
 * @property {number} uom_id - माप की इकाई (FK)।
 * @property {number} [tolerance_min] - स्वीकार्य निम्न सीमा।
 * @property {number} [tolerance_max] - स्वीकार्य उच्च सीमा।
 * @property {string} inspection_type - निरीक्षण का प्रकार (अनिवार्य)।
 * @property {boolean} is_active - क्या मापदंड सक्रिय है।
 * @property {Date} created_at - रिकॉर्ड निर्माण का समय।
 * @property {Date} updated_at - रिकॉर्ड अद्यतन (update) का अंतिम समय।
 */

/**
 * प्रत्येक पार्ट की वर्तमान इन्वेंट्री स्थिति को संग्रहीत करता है।
 * @typedef {object} MasterInventory
 * @property {number} inventory_id - प्राथमिक कुंजी (PK)।
 * @property {number} part_id - पार्ट (FK) जिसका स्टॉक ट्रैक किया जा रहा है (अनिवार्य)।
 * @property {string} storage_location - विशिष्ट भंडारण स्थान (अनिवार्य)।
 * @property {string} [lot_number] - वैकल्पिक बैच या लॉट नंबर (अद्वितीय)।
 * @property {number} uom_id - स्टॉक की इकाई (FK) (अनिवार्य)।
 * @property {number} quantity_on_hand - वर्तमान भौतिक मात्रा।
 * @property {number} quantity_reserved - आरक्षित मात्रा।
 * @property {Date} last_moved_at - अंतिम बार स्टॉक कब ले जाया गया।
 * @property {Date} updated_at - रिकॉर्ड अद्यतन (update) का अंतिम समय।
 */

/**
 * सभी संभावित गैर-अनुपालन (Non-Conformance) कारणों और उनके प्रबंधन विवरणों को संग्रहीत करता है।
 * @typedef {object} MasterNcrReason
 * @property {number} reason_id - प्राथमिक कुंजी (PK)।
 * @property {string} reason_code - कारण का संक्षिप्त कोड (अनिवार्य और अद्वितीय)।
 * @property {string} reason_description - कारण का विस्तृत विवरण (अनिवार्य)।
 * @property {string} reason_category - कारण की श्रेणी (अनिवार्य)।
 * @property {boolean} is_active - क्या कारण सक्रिय है।
 * @property {number} [created_by] - Users तालिका से FK (रिकॉर्ड किसने बनाया)।
 * @property {number} [updated_by] - Users तालिका से FK (रिकॉर्ड को अंतिम बार किसने अपडेट किया)।
 * @property {number} [deactivated_by] - Users तालिका से FK (किसने निष्क्रिय किया)।
 * @property {Date} created_at - रिकॉर्ड निर्माण का समय।
 * @property {Date} updated_at - रिकॉर्ड अद्यतन (update) का अंतिम समय।
 * @property {Date} [deactivated_at] - रिकॉर्ड के निष्क्रिय होने का समय।
 */

// ----------------------------------------------------------------------
// SCHEMA MODULE 05: PRODUCTION AND EXECUTION FLOW TYPES
// ----------------------------------------------------------------------

/**
 * विनिर्माण या संयोजन के लिए जारी किए गए प्रत्येक उत्पादन आदेश को संग्रहीत करता है।
 * @typedef {object} WorkOrder
 * @property {number} wo_id - प्राथमिक कुंजी (PK)।
 * @property {string} wo_number - वर्क ऑर्डर नंबर (अनिवार्य और अद्वितीय)।
 * @property {number} part_id - वह पार्ट (FK) जिसका निर्माण किया जाना है (अनिवार्य)।
 * @property {number} [client_id] - वह ग्राहक (FK) जिसके लिए यह WO है।
 * @property {string} [sales_order_ref] - संबंधित बिक्री आदेश का संदर्भ संख्या।
 * @property {number} quantity_planned - योजनाबद्ध उत्पादन मात्रा।
 * @property {number} quantity_completed - पूर्ण की गई मात्रा।
 * @property {string} due_date - उत्पादन पूरा करने की नियत तारीख (अनिवार्य)। (Note: SQL DATE is often handled as string in JS before conversion)
 * @property {string} status - वर्तमान स्थिति (उदा. 'PLANNED', 'IN_PROGRESS', 'COMPLETED')।
 * @property {string} priority - प्राथमिकता स्तर (उदा. 'HIGH', 'MEDIUM')।
 * @property {number} [created_by] - Users तालिका से FK (WO किसने बनाया)।
 * @property {Date} created_at - रिकॉर्ड निर्माण का समय।
 * @property {Date} updated_at - रिकॉर्ड अद्यतन (update) का अंतिम समय।
 */

/**
 * वर्क ऑर्डर के भीतर प्रत्येक प्रक्रिया चरण के निष्पादन (execution) को ट्रैक करता है।
 * @typedef {object} ProductionLog
 * @property {number} log_id - प्राथमिक कुंजी (PK) (BIGSERIAL)।
 * @property {number} wo_id - संबंधित वर्क ऑर्डर (FK) (अनिवार्य)।
 * @property {number} process_id - निष्पादित की गई प्रक्रिया (FK) (अनिवार्य)।
 * @property {number} sequence_no - रूटिंग में इस चरण का अनुक्रम नंबर (अनिवार्य)।
 * @property {number} quantity_in - इस चरण में दर्ज की गई मात्रा।
 * @property {number} quantity_out_ok - प्रक्रिया से सफलतापूर्वक बाहर निकलने वाली मात्रा।
 * @property {number} quantity_out_reject - प्रक्रिया के दौरान अस्वीकृत मात्रा।
 * @property {Date} start_time - प्रक्रिया शुरू होने का समय (अनिवार्य)।
 * @property {Date} [end_time] - प्रक्रिया समाप्त होने का समय।
 * @property {number} operator_id - ऑपरेटर (FK) जिसने प्रक्रिया पूरी की (अनिवार्य)।
 * @property {string} [work_center] - कार्य केंद्र जहां काम किया गया था।
 * @property {string} log_status - लॉग की स्थिति (उदा. 'STARTED', 'COMPLETED')।
 * @property {Date} created_at - रिकॉर्ड निर्माण का समय।
 */