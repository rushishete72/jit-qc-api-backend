-- JIT/QC SCHEMA MODULE 06: PERFORMANCE INDEXES

-- 17. Indexes for Performance (To speed up common queries)
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_parts_partno ON master_parts (part_no);
CREATE INDEX IF NOT EXISTS idx_suppliers_gst ON master_suppliers (gst_no);
CREATE INDEX IF NOT EXISTS idx_clients_gst ON master_clients (gst_no);
CREATE INDEX IF NOT EXISTS idx_wo_part_status ON work_orders (part_id, status);
CREATE INDEX IF NOT EXISTS idx_logs_wo_process ON production_logs (wo_id, process_id);
CREATE INDEX IF NOT EXISTS idx_inventory_part_location ON master_inventories (part_id, storage_location);
CREATE INDEX IF NOT EXISTS idx_ncr_reason_code ON master_ncr_reasons (reason_code);