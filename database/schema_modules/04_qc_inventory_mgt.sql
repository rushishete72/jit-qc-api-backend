-- JIT/QC SCHEMA MODULE 04: QUALITY CONTROL AND INVENTORY MANAGEMENT (Cleaned)

-- 12. Master QC Parameters (Audit Columns Added, FKs Removed)
CREATE TABLE IF NOT EXISTS master_qc_parameters (
    qc_param_id SERIAL PRIMARY KEY,
    part_id INTEGER, 
    process_id INTEGER, 
    parameter_name VARCHAR(100) NOT NULL,
    uom_id INTEGER NOT NULL, 
    tolerance_min NUMERIC(12, 4),
    tolerance_max NUMERIC(12, 4),
    inspection_type VARCHAR(50) NOT NULL,
    CONSTRAINT check_target_exists CHECK ( (part_id IS NOT NULL OR process_id IS NOT NULL) ),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER, 
    updated_by INTEGER 
);

-- 13. Master Inventories (Audit Columns Added, FKs Removed)
CREATE TABLE IF NOT EXISTS master_inventories (
    inventory_id SERIAL PRIMARY KEY,
    part_id INTEGER NOT NULL, 
    storage_location VARCHAR(50) NOT NULL,
    lot_number VARCHAR(50) UNIQUE,
    uom_id INTEGER NOT NULL, 
    quantity_on_hand NUMERIC(12, 3) NOT NULL DEFAULT 0.00 CHECK (quantity_on_hand >= 0),
    quantity_reserved NUMERIC(12, 3) NOT NULL DEFAULT 0.00 CHECK (quantity_reserved >= 0),
    last_moved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    updated_by INTEGER,
    CONSTRAINT inventory_location_part_unique UNIQUE (part_id, storage_location)
);

-- 14. Master NCR Reasons (FKs Removed)
CREATE TABLE IF NOT EXISTS master_ncr_reasons (
    reason_id SERIAL PRIMARY KEY,
    reason_code VARCHAR(20) NOT NULL UNIQUE,
    reason_description VARCHAR(255) NOT NULL,
    reason_category VARCHAR(50) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by INTEGER, 
    updated_by INTEGER, 
    deactivated_by INTEGER, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deactivated_at TIMESTAMP WITH TIME ZONE
);