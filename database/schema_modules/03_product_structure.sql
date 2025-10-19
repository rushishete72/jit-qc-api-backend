-- JIT/QC SCHEMA MODULE 03: PRODUCT STRUCTURE AND DEFINITION

-- 10. Master Parts (Depends on UOMs, Clients, Suppliers from Module 02)
CREATE TABLE IF NOT EXISTS master_parts (
part_id SERIAL PRIMARY KEY,
part_no VARCHAR(50) NOT NULL,
rev_no VARCHAR(10) NOT NULL,
part_name VARCHAR(255) NOT NULL,
drawing_no VARCHAR(50) NOT NULL,
uom_id INTEGER REFERENCES master_uoms(uom_id) ON DELETE RESTRICT NOT NULL,
std_weight_gm NUMERIC(10, 3) CHECK (std_weight_gm >= 0),
material_spec VARCHAR(100) NOT NULL,
surface_treatment VARCHAR(100),
qc_required BOOLEAN NOT NULL DEFAULT FALSE,
std_lead_time_days INTEGER NOT NULL DEFAULT 0 CHECK (std_lead_time_days >= 0),
default_supplier_id INTEGER REFERENCES master_suppliers(supplier_id) ON DELETE RESTRICT,
default_client_id INTEGER REFERENCES master_clients(client_id) ON DELETE RESTRICT,
is_active BOOLEAN NOT NULL DEFAULT TRUE,
created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
CONSTRAINT part_rev_unique UNIQUE (part_no, rev_no)
);

-- 11. Master BOM & Routing (Links Parts and Processes)
CREATE TABLE IF NOT EXISTS master_bom_routing (
bom_routing_id SERIAL PRIMARY KEY,
parent_part_id INTEGER REFERENCES master_parts(part_id) ON DELETE RESTRICT NOT NULL,
child_part_id INTEGER REFERENCES master_parts(part_id) ON DELETE RESTRICT,
process_id INTEGER REFERENCES master_processes(process_id) ON DELETE RESTRICT,
quantity NUMERIC(10, 3) CHECK (quantity > 0) NOT NULL,
sequence_no INTEGER NOT NULL,
created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
CONSTRAINT bom_sequence_unique UNIQUE (parent_part_id, sequence_no),
CONSTRAINT check_part_or_process CHECK ((child_part_id IS NOT NULL) OR (process_id IS NOT NULL))
);