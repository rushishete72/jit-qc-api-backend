-- JIT/QC SCHEMA MODULE 05: PRODUCTION AND EXECUTION FLOW (Cleaned)

-- 15. Work Orders (Audit Column Added, FKs Removed)
CREATE TABLE IF NOT EXISTS work_orders (
    wo_id SERIAL PRIMARY KEY,
    wo_number VARCHAR(50) NOT NULL UNIQUE,
    part_id INTEGER NOT NULL, 
    client_id INTEGER, 
    sales_order_ref VARCHAR(50),
    quantity_planned NUMERIC(10, 3) CHECK (quantity_planned > 0) NOT NULL,
    quantity_completed NUMERIC(10, 3) NOT NULL DEFAULT 0.00 CHECK (quantity_completed >= 0),
    due_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PLANNED',
    priority VARCHAR(10) NOT NULL DEFAULT 'MEDIUM',
    created_by INTEGER, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER -- Missing Audit Column Added
);

-- 16. Production Logs (Audit Column Added, FKs Removed)
CREATE TABLE IF NOT EXISTS production_logs (
    log_id BIGSERIAL PRIMARY KEY,
    wo_id INTEGER NOT NULL, 
    process_id INTEGER NOT NULL, 
    sequence_no INTEGER NOT NULL,
    quantity_in NUMERIC(10, 3) CHECK (quantity_in >= 0) NOT NULL,
    quantity_out_ok NUMERIC(10, 3) NOT NULL DEFAULT 0.00 CHECK (quantity_out_ok >= 0),
    quantity_out_reject NUMERIC(10, 3) NOT NULL DEFAULT 0.00 CHECK (quantity_out_reject >= 0),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    operator_id INTEGER NOT NULL, 
    work_center VARCHAR(50),
    log_status VARCHAR(20) NOT NULL DEFAULT 'STARTED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, -- Missing Audit Column Added
    updated_by INTEGER, -- Missing Audit Column Added
    CONSTRAINT fk_wo_process_seq UNIQUE (wo_id, sequence_no)
);