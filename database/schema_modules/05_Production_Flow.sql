/**
 * @fileoverview JIT/QC Management System - SCHEMA MODULE 05: PRODUCTION AND EXECUTION FLOW
 * @description यह मॉड्यूल विनिर्माण वर्क ऑर्डर (Work Orders) और उनकी निष्पादन (Execution) 
 * लॉगिंग को परिभाषित करता है। यह उत्पादन ट्रैकिंग और दक्षता (efficiency) के लिए महत्वपूर्ण है।
 * @module 05_production_flow
 */

-- ----------------------------------------------------------------------
-- 15. Work Orders (विनिर्माण आदेश)
-- ----------------------------------------------------------------------

/**
 * @table work_orders
 * @description विनिर्माण या संयोजन (assembly) के लिए जारी किए गए प्रत्येक 
 * उत्पादन आदेश (production order) को संग्रहीत करता है।
 * @property {SERIAL} wo_id - प्राथमिक कुंजी (PK)।
 * @property {VARCHAR(50)} wo_number - वर्क ऑर्डर नंबर (अनिवार्य और अद्वितीय)।
 * @property {INTEGER} part_id - वह पार्ट (FK) जिसका निर्माण किया जाना है (अनिवार्य)। RESTRICT पर डिलीट।
 * @property {INTEGER} client_id - वह ग्राहक (FK) जिसके लिए यह WO है। RESTRICT पर डिलीट।
 * @property {VARCHAR(50)} sales_order_ref - संबंधित बिक्री आदेश (Sales Order) का संदर्भ संख्या।
 * @property {NUMERIC(10, 3)} quantity_planned - योजनाबद्ध उत्पादन मात्रा (धनात्मक चेक)।
 * @property {NUMERIC(10, 3)} quantity_completed - पूर्ण की गई मात्रा (गैर-ऋणात्मक, डिफ़ॉल्ट 0)।
 * @property {DATE} due_date - उत्पादन पूरा करने की नियत तारीख (अनिवार्य)।
 * @property {VARCHAR(20)} status - वर्तमान स्थिति (उदा. 'PLANNED', 'IN_PROGRESS', 'COMPLETED') (डिफ़ॉल्ट 'PLANNED')।
 * @property {VARCHAR(10)} priority - प्राथमिकता स्तर (उदा. 'HIGH', 'MEDIUM') (डिफ़ॉल्ट 'MEDIUM')।
 * @property {INTEGER} created_by - Users तालिका से FK (WO किसने बनाया)। SET NULL पर डिलीट।
 * @property {TIMESTAMP WITH TIME ZONE} created_at - रिकॉर्ड निर्माण का समय।
 * @property {TIMESTAMP WITH TIME ZONE} updated_at - रिकॉर्ड अद्यतन (update) का अंतिम समय।
 */
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

-- ----------------------------------------------------------------------
-- 16. Production Logs (उत्पादन चरण ट्रैकिंग)
-- ----------------------------------------------------------------------

/**
 * @table production_logs
 * @description वर्क ऑर्डर के भीतर प्रत्येक प्रक्रिया चरण (routing step) के निष्पादन 
 * (execution) को ट्रैक करता है।
 * @property {BIGSERIAL} log_id - प्राथमिक कुंजी (PK)।
 * @property {INTEGER} wo_id - संबंधित वर्क ऑर्डर (FK)। CASCADE पर डिलीट (अनिवार्य)।
 * @property {INTEGER} process_id - निष्पादित की गई प्रक्रिया (FK)। RESTRICT पर डिलीट (अनिवार्य)।
 * @property {INTEGER} sequence_no - रूटिंग में इस चरण का अनुक्रम नंबर (अनिवार्य)।
 * @property {NUMERIC(10, 3)} quantity_in - इस चरण में दर्ज की गई मात्रा (गैर-ऋणात्मक चेक)।
 * @property {NUMERIC(10, 3)} quantity_out_ok - प्रक्रिया से सफलतापूर्वक बाहर निकलने वाली मात्रा (गैर-ऋणात्मक, डिफ़ॉल्ट 0)।
 * @property {NUMERIC(10, 3)} quantity_out_reject - प्रक्रिया के दौरान अस्वीकृत (rejected) मात्रा (गैर-ऋणात्मक, डिफ़ॉल्ट 0)।
 * @property {TIMESTAMP WITH TIME ZONE} start_time - प्रक्रिया शुरू होने का समय (अनिवार्य)।
 * @property {TIMESTAMP WITH TIME ZONE} end_time - प्रक्रिया समाप्त होने का समय।
 * @property {INTEGER} operator_id - ऑपरेटर (FK) जिसने प्रक्रिया पूरी की (अनिवार्य)। RESTRICT पर डिलीट।
 * @property {VARCHAR(50)} work_center - कार्य केंद्र (work center) जहां काम किया गया था।
 * @property {VARCHAR(20)} log_status - लॉग की स्थिति (उदा. 'STARTED', 'COMPLETED') (डिफ़ॉल्ट 'STARTED')।
 * @property {TIMESTAMP WITH TIME ZONE} created_at - रिकॉर्ड निर्माण का समय।
 * @constraint fk_wo_process_seq - सुनिश्चित करता है कि किसी दिए गए Work Order के लिए एक 
 * Sequence Number केवल एक बार लॉग किया जाए।
 */
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