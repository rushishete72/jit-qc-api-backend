/**
 * @fileoverview JIT/QC Management System - SEED DATA MODULE 01: AUTH AND CORE MASTER DATA
 * @description यह स्क्रिप्ट डेटाबेस को बूटस्ट्रैप करने के लिए आवश्यक प्रारंभिक 
 * डेटा (Initial Data) सम्मिलित करती है, जिसमें कोर यूज़र रोल्स और मास्टर डेटा शामिल हैं।
 * यह सुनिश्चित करता है कि ऑडिट ट्रेल (audit trail) के लिए एक एडमिन यूज़र हमेशा मौजूद रहे।
 * @module 01_Initial_Setup
 */

-- I. ROLES, PERMISSIONS, AND ADMIN USER SETUP
--------------------------------------------------

-- 1. Roles (भूमिकाएँ पहले बनाई जाती हैं)
/** @insert roles - चार मुख्य भूमिकाएँ सम्मिलित करता है। */
INSERT INTO roles (role_name) VALUES
('System_Admin'),
('Production_Manager'),
('QC_Inspector'),
('Operator')
ON CONFLICT (role_name) DO NOTHING;

-- Get the Admin Role ID for the initial user
-- Assuming the first role inserted is 'System_Admin' (role_id = 1, but we use subquery for safety)

-- 2. Initial Admin User (ऑडिट कॉलम से पहले सम्मिलित करना अनिवार्य है)
/** @insert users - डिफ़ॉल्ट 'System Administrator' यूज़र बनाता है। */
INSERT INTO users (employee_id, email, phone_number, full_name, role_id, password_hash, is_active, is_verified) VALUES
(
    'EMP001', 
    'admin@sidhant.com', 
    '9999900000', 
    'System Administrator', 
    (SELECT role_id FROM roles WHERE role_name = 'System_Admin'),
    -- Sample hash for 'password123' (USE REAL HASH IN PRODUCTION!)
    '$2a$10$w1e7F/n/uTzM3I0J0bS1w.i/nJ0bS1w.i/nJ0bS1w.i', 
    TRUE, 
    TRUE
)
ON CONFLICT (email) DO NOTHING;

-- 3. Permissions (सरलीकृत शुरुआती सीडिंग के लिए)
/** @insert permissions - कुछ बुनियादी अनुमतियाँ सम्मिलित करता है। */
INSERT INTO permissions (permission_key, description) VALUES
('READ_ALL_MASTERS', 'View all master data (Parts, Clients, UOMs, etc.)'),
('MANAGE_USERS', 'Create, update, and delete user accounts.'),
('CREATE_WO', 'Create new Work Orders.')
ON CONFLICT (permission_key) DO NOTHING;

-- 4. Role Permissions (एडमिन को सभी मास्टर रीड और यूज़र मैनेजमेंट अनुमतियाँ दें)
/** @insert role_permissions - Admin Role को MANAGE_USERS अनुमति निर्दिष्ट करता है। */
INSERT INTO role_permissions (role_id, permission_id) 
SELECT 
    (SELECT role_id FROM roles WHERE role_name = 'System_Admin'),
    (SELECT permission_id FROM permissions WHERE permission_key = 'MANAGE_USERS')
ON CONFLICT (role_id, permission_id) DO NOTHING;


-- II. CORE MASTER DATA SEEDING
--------------------------------------------------

-- Get the Admin User ID for created_by columns
-- Note: PostgreSQL supports using the subquery directly in INSERT or setting a variable 
-- or using RETURNING, this temporary variable approach is illustrative.
-- SELECT user_id INTO temp_admin_id FROM users WHERE email = 'admin@sidhant.com'; 
-- (This line is usually environment-dependent and kept as-is or commented out if not supported by client driver)

-- 5. Master UOMs (माप की इकाइयाँ)
/** @insert master_uoms - डिफ़ॉल्ट UOMs (KG, PC, M) सम्मिलित करता है। */
INSERT INTO master_uoms (uom_code, uom_name, created_by, updated_by) VALUES
('KG', 'Kilogram', (SELECT user_id FROM users WHERE email = 'admin@sidhant.com'), (SELECT user_id FROM users WHERE email = 'admin@sidhant.com')),
('PC', 'Piece', (SELECT user_id FROM users WHERE email = 'admin@sidhant.com'), (SELECT user_id FROM users WHERE email = 'admin@sidhant.com')),
('M', 'Meter', (SELECT user_id FROM users WHERE email = 'admin@sidhant.com'), (SELECT user_id FROM users WHERE email = 'admin@sidhant.com'))
ON CONFLICT (uom_code) DO NOTHING;

-- 6. Master Clients (ग्राहक)
/** @insert master_clients - दो उदाहरण ग्राहक (Client) सम्मिलित करता है। */
INSERT INTO master_clients (client_code, client_name, qc_policy) VALUES
('CL001', 'Alpha Mfg Co.', 'STANDARD'),
('CL002', 'Beta Components', 'ZERO_DEFECT')
ON CONFLICT (client_code) DO NOTHING;

-- 7. Master Suppliers (आपूर्तिकर्ता)
/** @insert master_suppliers - दो उदाहरण आपूर्तिकर्ता (Supplier) सम्मिलित करता है। */
INSERT INTO master_suppliers (supplier_code, supplier_name, supplier_type, payment_terms) VALUES
('SUP001', 'Raw Material Inc.', 'RAW', 'NET_30'),
('SUP002', 'Job Work Solutions', 'PROCESS', 'NET_45')
ON CONFLICT (supplier_code) DO NOTHING;

-- 8. Master Processes (विनिर्माण प्रक्रियाएँ)
/** @insert master_processes - तीन बुनियादी विनिर्माण प्रक्रियाओं को सम्मिलित करता है। */
INSERT INTO master_processes (process_code, process_name, process_type, std_cycle_time_min, std_setup_time_min) VALUES
('CUT', 'Cutting', 'PRIMARY', 5.0, 15.0),
('WELD', 'Welding', 'SECONDARY', 12.5, 30.0),
('FINISH', 'Final Inspection', 'QC', 2.0, 5.0)
ON CONFLICT (process_code) DO NOTHING;

-- 9. Master NCR Reasons (NCR कारण)
/** @insert master_ncr_reasons - दो उदाहरण NCR कारण सम्मिलित करता है। */
INSERT INTO master_ncr_reasons (reason_code, reason_description, reason_category, created_by) VALUES
('DIM_FAIL', 'Dimensional Failure', 'MANUFACTURING', (SELECT user_id FROM users WHERE email = 'admin@sidhant.com')),
('SCRATCH', 'Surface Scratch/Damage', 'SURFACE', (SELECT user_id FROM users WHERE email = 'admin@sidhant.com'))
ON CONFLICT (reason_code) DO NOTHING;

-- Clean up temporary variable if used by client (like pg-promise)
-- DROP TABLE IF EXISTS temp_admin_id;