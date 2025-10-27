-- JIT/QC SCHEMA MODULE 02: CORE MASTER DATA (Cleaned)

-- 6. Master UOMs (Audit Columns Added, FKs Removed)
CREATE TABLE IF NOT EXISTS master_uoms (
    uom_id SERIAL PRIMARY KEY,
    uom_code VARCHAR(10) NOT NULL UNIQUE,
    uom_name VARCHAR(50) NOT NULL,
    description VARCHAR(255),
    conversion_factor NUMERIC(10, 5) DEFAULT 1.0 CHECK (conversion_factor > 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER, 
    updated_by INTEGER 
);

-- 7. Master Clients (Audit Columns Added, FKs Removed)
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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER, 
    updated_by INTEGER  
);

-- 8. Master Suppliers (Audit Columns Added, FKs Removed)
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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER, 
    updated_by INTEGER  
);

-- 9. Master Processes (Audit Columns Added, FKs Removed)
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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER, 
    updated_by INTEGER  
);

-- ❌ FOREIGN KEY ADDITIONS block REMOVED. Now consolidated in 07_foreign_keys.sql.