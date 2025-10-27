/**
 * Auth Module Seed Data
 * Inserts core roles, permissions, and the initial Super Admin user.
 */

-- ----------------------------------------------------
-- A. Insert Core Roles (ON CONFLICT on UNIQUE Column role_name)
-- ----------------------------------------------------
INSERT INTO roles (role_id, role_name, description, is_active) VALUES
(1, 'Super_Admin', 'Full system access and primary configuration.', TRUE),
(2, 'Admin', 'Operational administrator for module data.', TRUE),
(3, 'QC_Manager', 'Can approve requests and manage quality control tasks.', TRUE), 
(4, 'Basic_User', 'Standard user access, data entry only.', TRUE) 
ON CONFLICT (role_name) 
DO UPDATE SET 
    role_name = EXCLUDED.role_name,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active;


-- ----------------------------------------------------
-- B. Insert Initial Super Admin User (ON CONFLICT on UNIQUE Column email)
-- ----------------------------------------------------

INSERT INTO users (user_id, email, full_name, password_hash, role_id, is_active, is_verified) VALUES
(1, 'rushishete72@gmail.com', 'System Super Admin', '$2a$10$hx/7bGccsLhjceCCgRMwv.QtPy5W/DWNtPyErAqX56cjy2qRtUn1.', 1, TRUE, TRUE)
ON CONFLICT (email) 
DO UPDATE SET 
    password_hash = EXCLUDED.password_hash,
    full_name = EXCLUDED.full_name,
    role_id = EXCLUDED.role_id,
    is_active = EXCLUDED.is_active,
    is_verified = EXCLUDED.is_verified;


-- ----------------------------------------------------
-- C. Insert Core Permissions (ON CONFLICT on UNIQUE Column permission_code)
-- ----------------------------------------------------

INSERT INTO permissions (permission_id, permission_code, description, created_by) VALUES
(1, 'USER_APPROVE', 'Allows approval or rejection of new registration requests.', 1),
(2, 'VIEW_PENDING', 'Allows viewing of pending registration requests.', 1),
(3, 'USER_CHANGE_ROLE', 'Allows modification of other users role_id.', 1),
(4, 'USER_DEACTIVATE', 'Allows activation and deactivation of user accounts.', 1),
(5, 'PART_CREATE', 'Allows creation of new inventory parts.', 1),
(6, 'PART_UPDATE', 'Allows updating existing inventory parts.', 1),
(7, 'ROLE_MANAGE', 'Allows creation, update, and deletion of Roles and Permissions (RBAC Config).', 1)
ON CONFLICT (permission_code) 
DO UPDATE SET 
    description = EXCLUDED.description;


-- ----------------------------------------------------
-- D. Link Roles to Permissions (ROLE_PERMISSIONS) 
-- ON CONFLICT DO NOTHING added to all blocks.
-- ----------------------------------------------------

-- 1. Super Admin (Role ID 1):
INSERT INTO role_permissions (role_id, permission_id) VALUES
(1, 7) -- Super_Admin gets ROLE_MANAGE (Permission ID 7)
ON CONFLICT DO NOTHING;


-- 2. Admin (Role ID 2): Operational Management Permissions
INSERT INTO role_permissions (role_id, permission_id) VALUES
-- User Management & Approval
(2, 1), -- USER_APPROVE
(2, 2), -- VIEW_PENDING
(2, 3), -- USER_CHANGE_ROLE
(2, 4), -- USER_DEACTIVATE
-- Master Data Management
(2, 5), -- PART_CREATE
(2, 6) -- PART_UPDATE
ON CONFLICT DO NOTHING;


-- 3. QC Manager (Role ID 3): Approval aur Viewing (Example)
INSERT INTO role_permissions (role_id, permission_id) VALUES
(3, 2) -- VIEW_PENDING
ON CONFLICT DO NOTHING;


-- ----------------------------------------------------
-- E. Reset Sequences and Link Audit Columns (UNCHANGED)
-- ----------------------------------------------------

-- 1. Reset sequences to avoid conflicts on subsequent inserts
SELECT setval('roles_role_id_seq', (SELECT MAX(role_id) FROM roles));
SELECT setval('users_user_id_seq', (SELECT MAX(user_id) FROM users));
SELECT setval('permissions_permission_id_seq', (SELECT MAX(permission_id) FROM permissions));

-- 2. Link Audit Columns (Assuming Admin 1 created the roles)
UPDATE roles 
SET created_by = 1
WHERE created_by IS NULL;

-- NEW: Link permissions audit column
UPDATE permissions
SET created_by = 1
WHERE created_by IS NULL;