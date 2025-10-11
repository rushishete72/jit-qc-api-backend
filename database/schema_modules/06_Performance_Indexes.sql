/**
 * @fileoverview JIT/QC Management System - SCHEMA MODULE 06: PERFORMANCE INDEXES
 * @description यह मॉड्यूल डेटाबेस क्वेरी प्रदर्शन (query performance) को बेहतर बनाने 
 * और सामान्य लुकअप (lookups), फ़िल्टरिंग, और सॉर्टिंग ऑपरेशन्स को गति देने के लिए 
 * आवश्यक अनुक्रमणिकाओं (indexes) को परिभाषित करता है।
 * @module 06_performance_indexes
 */

-- ----------------------------------------------------------------------
-- 17. Indexes for Performance (सामान्य क्वेरी गति बढ़ाने हेतु अनुक्रमणिकाएँ)
-- ----------------------------------------------------------------------

/**
 * @index idx_users_email
 * @on users
 * @columns email
 * @description उपयोगकर्ता लॉगिन/प्राप्ति (login/retrieval) को तेज़ करने के लिए, क्योंकि ईमेल अद्वितीय है और अक्सर खोजा जाता है।
 */
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

/**
 * @index idx_parts_partno
 * @on master_parts
 * @columns part_no
 * @description Master Parts को उनके पार्ट नंबर से खोजने के लिए अनुक्रमणिका।
 */
CREATE INDEX IF NOT EXISTS idx_parts_partno ON master_parts (part_no);

/**
 * @index idx_suppliers_gst
 * @on master_suppliers
 * @columns gst_no
 * @description आपूर्तिकर्ता (Supplier) को GST नंबर से खोजने के लिए अनुक्रमणिका।
 */
CREATE INDEX IF NOT EXISTS idx_suppliers_gst ON master_suppliers (gst_no);

/**
 * @index idx_clients_gst
 * @on master_clients
 * @columns gst_no
 * @description ग्राहक (Client) को GST नंबर से खोजने के लिए अनुक्रमणिका।
 */
CREATE INDEX IF NOT EXISTS idx_clients_gst ON master_clients (gst_no);

/**
 * @index idx_wo_part_status
 * @on work_orders
 * @columns part_id, status
 * @description किसी विशिष्ट पार्ट (part) के लिए सक्रिय/नियोजित Work Orders को कुशलतापूर्वक फ़िल्टर करने के लिए अनुक्रमणिका।
 */
CREATE INDEX IF NOT EXISTS idx_wo_part_status ON work_orders (part_id, status);

/**
 * @index idx_logs_wo_process
 * @on production_logs
 * @columns wo_id, process_id
 * @description किसी विशिष्ट Work Order के लिए किसी दिए गए Process के सभी Production Logs को पुनर्प्राप्त करने के लिए अनुक्रमणिका।
 */
CREATE INDEX IF NOT EXISTS idx_logs_wo_process ON production_logs (wo_id, process_id);

/**
 * @index idx_inventory_part_location
 * @on master_inventories
 * @columns part_id, storage_location
 * @description किसी विशिष्ट पार्ट के स्टॉक को एक विशिष्ट भंडारण स्थान पर तेज़ी से खोजने/अपडेट करने के लिए अनुक्रमणिका।
 */
CREATE INDEX IF NOT EXISTS idx_inventory_part_location ON master_inventories (part_id, storage_location);

/**
 * @index idx_ncr_reason_code
 * @on master_ncr_reasons
 * @columns reason_code
 * @description NCR कारणों को उनके कोड द्वारा त्वरित रूप से देखने के लिए अनुक्रमणिका।
 */
CREATE INDEX IF NOT EXISTS idx_ncr_reason_code ON master_ncr_reasons (reason_code);