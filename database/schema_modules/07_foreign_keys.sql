-- JIT/QC SCHEMA MODULE 07: FINAL FOREIGN KEY CONSTRAINTS (CONSOLIDATED)
-- ZT FIX: Removed invalid 'IF NOT EXISTS' for ADD CONSTRAINT. 
-- REQUIRES database drop/reset before running, or use the reset_and_seed.js --force-reset flag.

-- ==========================================================
-- A. MODULE 01: AUTH & CIRCULAR DEPENDENCY KEYS
-- ==========================================================

-- Roles Audit Keys
ALTER TABLE IF EXISTS roles 
ADD CONSTRAINT fk_roles_created_by FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL NOT VALID;
ALTER TABLE IF EXISTS roles 
ADD CONSTRAINT fk_roles_updated_by FOREIGN KEY (updated_by) REFERENCES users(user_id) ON DELETE SET NULL NOT VALID;

-- Permissions Audit Keys
ALTER TABLE IF EXISTS permissions 
ADD CONSTRAINT fk_perms_created_by FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL NOT VALID;
ALTER TABLE IF EXISTS permissions 
ADD CONSTRAINT fk_perms_updated_by FOREIGN KEY (updated_by) REFERENCES users(user_id) ON DELETE SET NULL NOT VALID;

-- USERS Keys
ALTER TABLE IF EXISTS users
ADD CONSTRAINT fk_users_created_by FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL NOT VALID; 
ALTER TABLE IF EXISTS users
ADD CONSTRAINT fk_users_updated_by FOREIGN KEY (updated_by) REFERENCES users(user_id) ON DELETE SET NULL NOT VALID;
ALTER TABLE IF EXISTS users
ADD CONSTRAINT fk_users_role_id FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE RESTRICT NOT VALID;

-- Other Auth FKs
ALTER TABLE IF EXISTS registration_requests
ADD CONSTRAINT fk_reg_req_approved_by FOREIGN KEY (approved_by) REFERENCES users(user_id) ON DELETE SET NULL NOT VALID;

ALTER TABLE IF EXISTS role_permissions
ADD CONSTRAINT fk_rp_role_id FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE CASCADE NOT VALID;
ALTER TABLE IF EXISTS role_permissions
ADD CONSTRAINT fk_rp_permission_id FOREIGN KEY (permission_id) REFERENCES permissions(permission_id) ON DELETE CASCADE NOT VALID;


-- ==========================================================
-- B. MODULE 02: CORE MASTER DATA AUDIT KEYS
-- ==========================================================
ALTER TABLE IF EXISTS master_uoms
ADD CONSTRAINT fk_uoms_created_by FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL NOT VALID;
ALTER TABLE IF EXISTS master_uoms
ADD CONSTRAINT fk_uoms_updated_by FOREIGN KEY (updated_by) REFERENCES users(user_id) ON DELETE SET NULL NOT VALID;

ALTER TABLE IF EXISTS master_clients
ADD CONSTRAINT fk_clients_created_by FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL NOT VALID;
ALTER TABLE IF EXISTS master_clients
ADD CONSTRAINT fk_clients_updated_by FOREIGN KEY (updated_by) REFERENCES users(user_id) ON DELETE SET NULL NOT VALID;

ALTER TABLE IF EXISTS master_suppliers
ADD CONSTRAINT fk_suppliers_created_by FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL NOT VALID;
ALTER TABLE IF EXISTS master_suppliers
ADD CONSTRAINT fk_suppliers_updated_by FOREIGN KEY (updated_by) REFERENCES users(user_id) ON DELETE SET NULL NOT VALID;

ALTER TABLE IF EXISTS master_processes
ADD CONSTRAINT fk_proc_created_by FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL NOT VALID;
ALTER TABLE IF EXISTS master_processes
ADD CONSTRAINT fk_proc_updated_by FOREIGN KEY (updated_by) REFERENCES users(user_id) ON DELETE SET NULL NOT VALID;


-- ==========================================================
-- C. MODULE 03: PRODUCT STRUCTURE KEYS
-- ==========================================================
ALTER TABLE IF EXISTS master_parts
-- Core FKs
ADD CONSTRAINT fk_part_uom_id FOREIGN KEY (uom_id) REFERENCES master_uoms(uom_id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE IF EXISTS master_parts
ADD CONSTRAINT fk_part_supplier_id FOREIGN KEY (default_supplier_id) REFERENCES master_suppliers(supplier_id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE IF EXISTS master_parts
ADD CONSTRAINT fk_part_client_id FOREIGN KEY (default_client_id) REFERENCES master_clients(client_id) ON DELETE RESTRICT NOT VALID;
-- Audit Keys
ALTER TABLE IF EXISTS master_parts
ADD CONSTRAINT fk_part_created_by FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL NOT VALID;
ALTER TABLE IF EXISTS master_parts
ADD CONSTRAINT fk_part_updated_by FOREIGN KEY (updated_by) REFERENCES users(user_id) ON DELETE SET NULL NOT VALID;

ALTER TABLE IF EXISTS master_bom_routing
-- Core FKs
ADD CONSTRAINT fk_bom_parent_part_id FOREIGN KEY (parent_part_id) REFERENCES master_parts(part_id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE IF EXISTS master_bom_routing
ADD CONSTRAINT fk_bom_child_part_id FOREIGN KEY (child_part_id) REFERENCES master_parts(part_id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE IF EXISTS master_bom_routing
ADD CONSTRAINT fk_bom_process_id FOREIGN KEY (process_id) REFERENCES master_processes(process_id) ON DELETE RESTRICT NOT VALID;
-- Audit Keys
ALTER TABLE IF EXISTS master_bom_routing
ADD CONSTRAINT fk_bom_created_by FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL NOT VALID;
ALTER TABLE IF EXISTS master_bom_routing
ADD CONSTRAINT fk_bom_updated_by FOREIGN KEY (updated_by) REFERENCES users(user_id) ON DELETE SET NULL NOT VALID;


-- ==========================================================
-- D. MODULE 04: QC AND INVENTORY KEYS
-- ==========================================================
ALTER TABLE IF EXISTS master_qc_parameters
-- Core FKs
ADD CONSTRAINT fk_qc_param_part_id FOREIGN KEY (part_id) REFERENCES master_parts(part_id) ON DELETE CASCADE NOT VALID;
ALTER TABLE IF EXISTS master_qc_parameters
ADD CONSTRAINT fk_qc_param_process_id FOREIGN KEY (process_id) REFERENCES master_processes(process_id) ON DELETE CASCADE NOT VALID;
ALTER TABLE IF EXISTS master_qc_parameters
ADD CONSTRAINT fk_qc_param_uom_id FOREIGN KEY (uom_id) REFERENCES master_uoms(uom_id) ON DELETE RESTRICT NOT VALID;
-- Audit Keys
ALTER TABLE IF EXISTS master_qc_parameters
ADD CONSTRAINT fk_qc_param_created_by FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL NOT VALID;
ALTER TABLE IF EXISTS master_qc_parameters
ADD CONSTRAINT fk_qc_param_updated_by FOREIGN KEY (updated_by) REFERENCES users(user_id) ON DELETE SET NULL NOT VALID;

ALTER TABLE IF EXISTS master_inventories
-- Core FKs
ADD CONSTRAINT fk_inv_part_id FOREIGN KEY (part_id) REFERENCES master_parts(part_id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE IF EXISTS master_inventories
ADD CONSTRAINT fk_inv_uom_id FOREIGN KEY (uom_id) REFERENCES master_uoms(uom_id) ON DELETE RESTRICT NOT VALID;
-- Audit Keys
ALTER TABLE IF EXISTS master_inventories
ADD CONSTRAINT fk_inv_created_by FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL NOT VALID;
ALTER TABLE IF EXISTS master_inventories
ADD CONSTRAINT fk_inv_updated_by FOREIGN KEY (updated_by) REFERENCES users(user_id) ON DELETE SET NULL NOT VALID;

ALTER TABLE IF EXISTS master_ncr_reasons
-- Audit/Deactivation Keys
ADD CONSTRAINT fk_ncr_created_by FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL NOT VALID;
ALTER TABLE IF EXISTS master_ncr_reasons
ADD CONSTRAINT fk_ncr_updated_by FOREIGN KEY (updated_by) REFERENCES users(user_id) ON DELETE SET NULL NOT VALID;
ALTER TABLE IF EXISTS master_ncr_reasons
ADD CONSTRAINT fk_ncr_deactivated_by FOREIGN KEY (deactivated_by) REFERENCES users(user_id) ON DELETE SET NULL NOT VALID;


-- ==========================================================
-- E. MODULE 05: PRODUCTION EXECUTION KEYS
-- ==========================================================
ALTER TABLE IF EXISTS work_orders
-- Core FKs
ADD CONSTRAINT fk_wo_part_id FOREIGN KEY (part_id) REFERENCES master_parts(part_id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE IF EXISTS work_orders
ADD CONSTRAINT fk_wo_client_id FOREIGN KEY (client_id) REFERENCES master_clients(client_id) ON DELETE RESTRICT NOT VALID;
-- Audit Keys
ALTER TABLE IF EXISTS work_orders
ADD CONSTRAINT fk_wo_created_by FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL NOT VALID;
ALTER TABLE IF EXISTS work_orders
ADD CONSTRAINT fk_wo_updated_by FOREIGN KEY (updated_by) REFERENCES users(user_id) ON DELETE SET NULL NOT VALID;

ALTER TABLE IF EXISTS production_logs
-- Core FKs
ADD CONSTRAINT fk_pl_wo_id FOREIGN KEY (wo_id) REFERENCES work_orders(wo_id) ON DELETE CASCADE NOT VALID;
ALTER TABLE IF EXISTS production_logs
ADD CONSTRAINT fk_pl_process_id FOREIGN KEY (process_id) REFERENCES master_processes(process_id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE IF EXISTS production_logs
ADD CONSTRAINT fk_pl_operator_id FOREIGN KEY (operator_id) REFERENCES users(user_id) ON DELETE RESTRICT NOT VALID;
-- Audit Keys
ALTER TABLE IF EXISTS production_logs
ADD CONSTRAINT fk_pl_updated_by FOREIGN KEY (updated_by) REFERENCES users(user_id) ON DELETE SET NULL NOT VALID;