Markdown

# JIT/QC Database Schema Definition

यह दस्तावेज़ JIT/QC API के लिए उपयोग की जाने वाली PostgreSQL टेबलों की अंतिम संरचना को परिभाषित करता है। यह कोडबेस में मॉडल (model) लेयर के विकास और डेटाबेस इंटरेक्शन के लिए केंद्रीय संदर्भ बिंदु है।

---

## 1. SECURITY & USER MANAGEMENT

### 1.1 Roles
*यूज़र अनुमतियों (permissions) को ग्रुप करने के लिए उपयोग किया जाता है।*
```sql
CREATE TABLE IF NOT EXISTS roles (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
 ```


### 1.2 Permissions

सिस्टम में विशिष्ट अनुमतियों को परिभाषित करता है (जैसे 'MANAGE_USERS')।

SQL
```
CREATE TABLE IF NOT EXISTS permissions (
    permission_id SERIAL PRIMARY KEY,
    permission_key VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 1.3 Role Permissions (RBAC)
रोल्स (Roles) और अनुमतियों (Permissions) को जोड़ता है।

SQL
```
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INTEGER REFERENCES roles(role_id) ON DELETE CASCADE,
    permission_id INTEGER REFERENCES permissions(permission_id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);
```

### 1.4 Users
सिस्टम में सभी मानव यूज़र्स को संग्रहीत करता है, जिसमें ऑडिट ट्रेल के लिए विदेशी कुंजियाँ (Foreign Keys) शामिल हैं।

SQL
```
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    employee_id VARCHAR(20) UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone_number VARCHAR(20) UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    role_id INTEGER REFERENCES roles(role_id) ON DELETE RESTRICT NOT NULL,
    password_hash VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 1.5 User OTP
यूज़र सत्यापन (verification) और पासवर्ड रीसेट के लिए उपयोग किए जाने वाले वन-टाइम पासवर्ड (OTP) को अस्थायी रूप से संग्रहीत करता है।

SQL
```
CREATE TABLE IF NOT EXISTS user_otp (
    otp_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE NOT NULL,
    otp_code VARCHAR(72) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_otp_user UNIQUE (user_id)
);
``` 

## 2. CORE MASTER DATA
### 2.1 Master UOMs (Units of Measure)
वजन, लंबाई, संख्या, आदि के लिए माप की इकाइयों को परिभाषित करता है। पार्ट और QC पैरामीटर्स द्वारा उपयोग किया जाता है।

SQL
```
CREATE TABLE IF NOT EXISTS master_uoms (
    uom_id SERIAL PRIMARY KEY,
    uom_code VARCHAR(10) NOT NULL UNIQUE,
    uom_name VARCHAR(50) NOT NULL,
    description VARCHAR(255),
    conversion_factor NUMERIC(10, 5) DEFAULT 1.0 CHECK (conversion_factor > 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    updated_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL
);
```

### 2.2 Master Clients
ग्राहक (Client) के विवरण को संग्रहीत करता है, जिसका उपयोग वर्क ऑर्डर और QC नीतियों के लिए किया जाता है।

SQL
```
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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 2.3 Master Suppliers
कच्चे माल (raw material) या जॉब वर्क (job work) के सप्लायर्स का विवरण संग्रहीत करता है।

SQL
```
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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 2.4 Master Processes
उत्पादन (production) और QC चरणों (steps) को परिभाषित करता है, जिसमें मानक समय (standard time) शामिल है।

SQL
```
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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```
## 3. PRODUCT STRUCTURE & DEFINITION
### 3.1 Master Parts
उत्पाद संरचना की मुख्य इकाई। यह हर पार्ट, उसके रिविज़न (revision), मटेरियल, और डिफ़ॉल्ट सप्लायर को परिभाषित करता है।

SQL
```
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
```

### 3.2 Master BOM & Routing
उत्पाद का बिल ऑफ मटेरियल (BOM) और रूटिंग (processes का क्रम) परिभाषित करता है। इसमें child parts या processes हो सकते हैं।

SQL
```
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
```
## 4. QUALITY CONTROL & INVENTORY

### 4.1 Master QC Parameters
पार्ट्स या प्रोसेस के लिए आवश्यक क्वालिटी कंट्रोल पैरामीटर्स (जैसे सहिष्णुता सीमा - tolerance limits) को परिभाषित करता है।

SQL
```
CREATE TABLE IF NOT EXISTS master_qc_parameters (
    qc_param_id SERIAL PRIMARY KEY,
    part_id INTEGER REFERENCES master_parts(part_id) ON DELETE CASCADE,
    process_id INTEGER REFERENCES master_processes(process_id) ON DELETE CASCADE,
    parameter_name VARCHAR(100) NOT NULL,
    uom_id INTEGER REFERENCES master_uoms(uom_id) ON DELETE RESTRICT NOT NULL,
    tolerance_min NUMERIC(12, 4),
    tolerance_max NUMERIC(12, 4),
    inspection_type VARCHAR(50) NOT NULL,
    CONSTRAINT check_target_exists CHECK ( (part_id IS NOT NULL OR process_id IS NOT NULL) ),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 4.2 Master Inventories
वास्तविक स्टॉक मात्रा (quantity on hand) और स्थान (storage location) का ट्रैक रखता है।

SQL
```
CREATE TABLE IF NOT EXISTS master_inventories (
    inventory_id SERIAL PRIMARY KEY,
    part_id INTEGER REFERENCES master_parts(part_id) ON DELETE RESTRICT NOT NULL,
    storage_location VARCHAR(50) NOT NULL,
    lot_number VARCHAR(50) UNIQUE,
    uom_id INTEGER REFERENCES master_uoms(uom_id) ON DELETE RESTRICT NOT NULL,
    quantity_on_hand NUMERIC(12, 3) NOT NULL DEFAULT 0.00 CHECK (quantity_on_hand >= 0),
    quantity_reserved NUMERIC(12, 3) NOT NULL DEFAULT 0.00 CHECK (quantity_reserved >= 0),
    last_moved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT inventory_location_part_unique UNIQUE (part_id, storage_location)
);
```
### 4.3 Master NCR Reasons
गैर-अनुरूपता रिपोर्ट (Non-Conformance Report) में उपयोग किए जाने वाले अस्वीकृति (rejection) और दोष (defect) के कारणों को परिभाषित करता है।

SQL
```
CREATE TABLE IF NOT EXISTS master_ncr_reasons (
    reason_id SERIAL PRIMARY KEY,
    reason_code VARCHAR(20) NOT NULL UNIQUE,
    reason_description VARCHAR(255) NOT NULL,
    reason_category VARCHAR(50) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    updated_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    deactivated_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    deactivated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## 5. PRODUCTION & EXECUTION FLOW
### 5.1 Work Orders
ग्राहक की मांग (customer demand) या उत्पादन योजना (production plan) के आधार पर बनाए गए कार्य ऑर्डर।

SQL
```
CREATE TABLE IF NOT EXISTS work_orders (
    wo_id SERIAL PRIMARY KEY,
    wo_number VARCHAR(50) NOT NULL UNIQUE,
    part_id INTEGER REFERENCES master_parts(part_id) ON DELETE RESTRICT NOT NULL,
    client_id INTEGER REFERENCES master_clients(client_id) ON DELETE RESTRICT,
    sales_order_ref VARCHAR(50),
    quantity_planned NUMERIC(10, 3) CHECK (quantity_planned > 0) NOT NULL,
    quantity_completed NUMERIC(10, 3) NOT NULL DEFAULT 0.00 CHECK (quantity_completed >= 0),
    due_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PLANNED',
    priority VARCHAR(10) NOT NULL DEFAULT 'MEDIUM',
    created_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 5.2 Production Logs
उत्पादन प्रक्रिया (production process) में प्रत्येक चरण (process/sequence) पर इनपुट, आउटपुट और ऑपरेटर विवरण लॉग करता है।

SQL
```
CREATE TABLE IF NOT EXISTS production_logs (
    log_id BIGSERIAL PRIMARY KEY,
    wo_id INTEGER REFERENCES work_orders(wo_id) ON DELETE CASCADE NOT NULL,
    process_id INTEGER REFERENCES master_processes(process_id) ON DELETE RESTRICT NOT NULL,
    sequence_no INTEGER NOT NULL,
    quantity_in NUMERIC(10, 3) CHECK (quantity_in >= 0) NOT NULL,
    quantity_out_ok NUMERIC(10, 3) NOT NULL DEFAULT 0.00 CHECK (quantity_out_ok >= 0),
    quantity_out_reject NUMERIC(10, 3) NOT NULL DEFAULT 0.00 CHECK (quantity_out_reject >= 0),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    operator_id INTEGER REFERENCES users(user_id) ON DELETE RESTRICT NOT NULL,
    work_center VARCHAR(50),
    log_status VARCHAR(20) NOT NULL DEFAULT 'STARTED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_wo_process_seq UNIQUE (wo_id, sequence_no)
);
```

## 6. PERFORMANCE INDEXES
### 6.1 Performance Indexes
सामान्य और महत्वपूर्ण क्वेरीज़ की गति (speed) को अनुकूलित करने के लिए उपयोग किए जाने वाले गैर-अद्वितीय इंडेक्स।

SQL
```
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_parts_partno ON master_parts (part_no);
CREATE INDEX IF NOT EXISTS idx_suppliers_gst ON master_suppliers (gst_no);
CREATE INDEX IF NOT EXISTS idx_clients_gst ON master_clients (gst_no);
CREATE INDEX IF NOT EXISTS idx_wo_part_status ON work_orders (part_id, status);
CREATE INDEX IF NOT EXISTS idx_logs_wo_process ON production_logs (wo_id, process_id);
CREATE INDEX IF NOT EXISTS idx_inventory_part_location ON master_inventories (part_id, storage_location);
CREATE INDEX IF NOT EXISTS idx_ncr_reason_code ON master_ncr_reasons (reason_code);
```

## 7. SEED DATA REFERENCE
 

यह खंड दिखाता है कि डेटाबेस को चलाने के लिए कौन सा न्यूनतम प्रारंभिक (initial) डेटा मौजूद होना चाहिए।

मॉड्यूल	टेबल	प्रमुख डाला गया डेटा (Key Inserts)
```
Auth	roles	System_Admin, Production_Manager, QC_Inspector, Operator
Auth	users	admin@sidhant.com (System_Admin)
Auth	permissions	READ_ALL_MASTERS, MANAGE_USERS, CREATE_WO
Master	master_uoms	KG, PC, M
Master	master_clients	CL001, CL002
Master	master_processes	CUT, WELD, FINISH
Product	master_parts	P-1001 (Bracket), P-2002 (Plate)
Production	work_orders	WO-24001
```