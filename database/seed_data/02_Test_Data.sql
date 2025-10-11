/**
 * @fileoverview JIT/QC Management System - SEED DATA MODULE 02: PARTS AND INITIAL TEST TRANSACTIONS
 * @description यह स्क्रिप्ट Master Parts, Bill of Material (BOM), 
 * प्रारंभिक इन्वेंट्री स्तरों और एक उदाहरण Work Order और Production Log को 
 * डेटाबेस में सम्मिलित करती है।
 * @module 02_Parts_and_Transactions
 */

-- I. PART DEFINITION AND INVENTORY
--------------------------------------------------

-- Get FK IDs from already seeded data (Temporary variables for readability and safety)
-- Note: These temporary variable declarations might need adjustment based on the PostgreSQL client tool used.
-- SELECT uom_id INTO temp_kg_id FROM master_uoms WHERE uom_code = 'KG';
-- SELECT uom_id INTO temp_pc_id FROM master_uoms WHERE uom_code = 'PC';
-- SELECT supplier_id INTO temp_sup_id FROM master_suppliers WHERE supplier_code = 'SUP001';
-- SELECT client_id INTO temp_cli_id FROM master_clients WHERE client_code = 'CL001';
-- SELECT process_id INTO temp_cut_id FROM master_processes WHERE process_code = 'CUT';


-- 1. Master Parts (पार्ट परिभाषाएँ)
/** @insert master_parts - दो उदाहरण Parts (एक निर्मित, एक कच्चा माल) सम्मिलित करता है। */
INSERT INTO master_parts (part_no, rev_no, part_name, drawing_no, uom_id, std_weight_gm, material_spec, qc_required, default_supplier_id, default_client_id) VALUES
('P-1001', 'A', 'Bracket Assembly', 'DRG-1001', (SELECT uom_id FROM master_uoms WHERE uom_code = 'PC'), 550.0, 'MS Grade A', TRUE, (SELECT supplier_id FROM master_suppliers WHERE supplier_code = 'SUP001'), (SELECT client_id FROM master_clients WHERE client_code = 'CL001')),
('P-2002', 'B', 'Base Plate', 'DRG-2002', (SELECT uom_id FROM master_uoms WHERE uom_code = 'PC'), 250.0, 'SS304', FALSE, NULL, NULL)
ON CONFLICT (part_no, rev_no) DO NOTHING;

-- Get the Part ID for BOM and Inventory
-- SELECT part_id INTO temp_part1_id FROM master_parts WHERE part_no = 'P-1001';

-- 2. Master BOM & Routing (पार्ट P-1001 के लिए रूटिंग)
/** @insert master_bom_routing - P-1001 के लिए दो-चरणीय रूटिंग (CUT, WELD) परिभाषित करता है। */
INSERT INTO master_bom_routing (parent_part_id, process_id, quantity, sequence_no) VALUES
((SELECT part_id FROM master_parts WHERE part_no = 'P-1001'), (SELECT process_id FROM master_processes WHERE process_code = 'CUT'), 1.0, 1),
((SELECT part_id FROM master_parts WHERE part_no = 'P-1001'), (SELECT process_id FROM master_processes WHERE process_code = 'WELD'), 1.0, 2)
ON CONFLICT (parent_part_id, sequence_no) DO NOTHING;


-- 3. Master Inventories (प्रारंभिक इन्वेंट्री)
/** @insert master_inventories - P-2002 (Base Plate) के लिए 500 यूनिट का प्रारंभिक स्टॉक सम्मिलित करता है। */
INSERT INTO master_inventories (part_id, storage_location, uom_id, quantity_on_hand) VALUES
((SELECT part_id FROM master_parts WHERE part_no = 'P-2002'), 'STORE-RM', (SELECT uom_id FROM master_uoms WHERE uom_code = 'PC'), 500.0)
ON CONFLICT (part_id, storage_location) DO NOTHING;


-- II. PRODUCTION TRANSACTION DATA
--------------------------------------------------

-- 4. Work Orders (एक उदाहरण Work Order)
/** @insert work_orders - 100 यूनिट के P-1001 के निर्माण के लिए एक वर्क ऑर्डर बनाता है। */
INSERT INTO work_orders (wo_number, part_id, client_id, quantity_planned, due_date, created_by) VALUES
(
    'WO-24001', 
    (SELECT part_id FROM master_parts WHERE part_no = 'P-1001'), 
    (SELECT client_id FROM master_clients WHERE client_code = 'CL001'),
    100.0, 
    CURRENT_DATE + interval '7 days', 
    (SELECT user_id FROM users WHERE email = 'admin@sidhant.com')
)
ON CONFLICT (wo_number) DO NOTHING;

-- Get WO ID and Operator ID
-- SELECT wo_id INTO temp_wo_id FROM work_orders WHERE wo_number = 'WO-24001';
-- SELECT user_id INTO temp_op_id FROM users WHERE email = 'admin@sidhant.com'; 

-- 5. Production Logs (पहला चरण शुरू)
/** @insert production_logs - WO-24001 के लिए पहले चरण (CUT) की शुरुआत को लॉग करता है। */
INSERT INTO production_logs (wo_id, process_id, sequence_no, quantity_in, start_time, operator_id, log_status) VALUES
(
    (SELECT wo_id FROM work_orders WHERE wo_number = 'WO-24001'),
    (SELECT process_id FROM master_processes WHERE process_code = 'CUT'),
    1,
    100.0,
    CURRENT_TIMESTAMP,
    (SELECT user_id FROM users WHERE email = 'admin@sidhant.com'),
    'STARTED'
);

-- Clean up temporary variables
-- DROP TABLE IF EXISTS temp_kg_id, temp_pc_id, temp_sup_id, temp_cli_id, temp_cut_id, temp_part1_id, temp_wo_id, temp_op_id;