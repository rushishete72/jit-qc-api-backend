# QUERIES.md (Detailed Application-Level SQL Query Reference)

यह दस्तावेज़ आपके JIT/QC एप्लिकेशन के विभिन्न मॉड्यूल (models) में उपयोग की जाने वाली मुख्य, व्यावसायिक-तर्क-आधारित (business-logic based) और जटिल SQL क्वेरीज़ के लिए विस्तृत संदर्भ प्रदान करता है।
---
## 1. AUTHENTICATION & USER MANAGEMENT
### 1.1. Get User and Role Details by Email (लॉगिन)
उद्देश्य: यूज़र के लॉगिन क्रेडेंशियल्स को सत्यापित (verify) करने के लिए उसका पासवर्ड हैश, रोल (role) का नाम और सक्रिय (active) स्थिति प्राप्त करना।

टेबल शामिल: users, roles

SQL
```
SELECT
    u.user_id,
    u.employee_id,
    u.email,
    u.password_hash,
    r.role_name,
    u.is_active
FROM
    users u
JOIN
    roles r ON u.role_id = r.role_id
WHERE
    u.email = $1;
```
### 1.2. Fetch All Permissions for a Role (अनुमति जाँच)
उद्देश्य: किसी विशिष्ट रोल से जुड़े सभी अनुमतियों (permissions) के permission_key प्राप्त करना, जिसका उपयोग API एंडपॉइंट एक्सेस को नियंत्रित करने के लिए किया जाता है (Authorization)।

टेबल शामिल: roles, role_permissions, permissions

SQL
```
SELECT
    p.permission_key
FROM
    roles r
JOIN
    role_permissions rp ON r.role_id = rp.role_id
JOIN
    permissions p ON rp.permission_id = p.permission_id
WHERE
    r.role_name = $1;
```

## 2. INVENTORY & PART STRUCTURE
### 2.1. Check Available Inventory Quantity (शुद्ध स्टॉक)
उद्देश्य: किसी पार्ट (part) की कुल उपलब्ध मात्रा की गणना करना (quantity_on_hand - quantity_reserved)। यह सुनिश्चित करता है कि उत्पादन शुरू करने से पहले पर्याप्त स्टॉक हो।

टेबल शामिल: master_inventories

SQL
```
SELECT
    COALESCE(SUM(quantity_on_hand - quantity_reserved), 0.00) AS available_stock
FROM
    master_inventories
WHERE
    part_id = $1;
```
### 2.2. Get Full BOM and Routing (उत्पाद संरचना)
उद्देश्य: Parent Part के निर्माण के लिए आवश्यक सभी चरणों (child parts or processes) को उनके क्रम (sequence) और आवश्यक मात्रा के साथ प्राप्त करना।

टेबल शामिल: master_bom_routing, master_parts, master_processes

SQL
```
SELECT
    b.sequence_no,
    b.quantity AS required_qty,
    COALESCE(p.part_name, pr.process_name) AS item_name,
    CASE
        WHEN b.child_part_id IS NOT NULL THEN 'PART'
        ELSE 'PROCESS'
    END AS item_type,
    COALESCE(p.part_no, pr.process_code) AS item_code
FROM
    master_bom_routing b
LEFT JOIN
    master_parts p ON b.child_part_id = p.part_id
LEFT JOIN
    master_processes pr ON b.process_id = pr.process_id
WHERE
    b.parent_part_id = $1
ORDER BY
    b.sequence_no ASC;
```
## 3. PRODUCTION & QC FLOW
### 3.1. Get Work Order Progress Summary (उत्पादन की प्रगति)
उद्देश्य: किसी Work Order (WO) की वर्तमान स्थिति और उसकी कुल आउटपुट मात्रा को संक्षेप में प्राप्त करना।

टेबल शामिल: work_orders, master_parts, production_logs

SQL
```
SELECT
    wo.wo_number,
    mp.part_name,
    wo.quantity_planned,
    wo.quantity_completed,
    (
        -- उप-क्वेरी: सभी उत्पादन लॉग्स से कुल OK मात्रा की गणना करता है
        SELECT
            COALESCE(SUM(pl.quantity_out_ok), 0)
        FROM
            production_logs pl
        WHERE
            pl.wo_id = wo.wo_id
    ) AS total_ok_output
FROM
    work_orders wo
JOIN
    master_parts mp ON wo.part_id = mp.part_id
WHERE
    wo.wo_id = $1;
```
### 3.2. Fetch QC Parameters for a Part (QC मापदंड)
उद्देश्य: किसी पार्ट के लिए आवश्यक QC पैरामीटर्स (tolerance limits, UOM) को सूचीबद्ध करना, जिसका उपयोग QC निरीक्षण फ़ॉर्म बनाने के लिए किया जाता है।

टेबल शामिल: master_qc_parameters, master_uoms

SQL
```
SELECT
    qcp.qc_param_id,
    qcp.parameter_name,
    qcp.tolerance_min,
    qcp.tolerance_max,
    mu.uom_code
FROM
    master_qc_parameters qcp
JOIN
    master_uoms mu ON qcp.uom_id = mu.uom_id
WHERE
    qcp.part_id = $1
    AND qcp.is_active = TRUE
ORDER BY
    qcp.parameter_name ASC;
```
## 4. GENERAL AUDIT & UTILITY
### 4.1. Get Record with Audit Names (ऑडिट लॉग)
उद्देश्य: किसी भी तालिका (table) से एक रिकॉर्ड प्राप्त करना, और created_by और updated_by ID को उनके पूर्ण नाम से बदलना।

टेबल शामिल: your_table_name (उदाहरण के लिए), users

SQL
```
SELECT
    t.*,
    creator.full_name AS created_by_name,
    updater.full_name AS updated_by_name
FROM
    your_table_name t  -- **ज़रूरी:** यहाँ तालिका (table) का नाम बदलें
LEFT JOIN
    users creator ON t.created_by = creator.user_id
LEFT JOIN
    users updater ON t.updated_by = updater.user_id
WHERE
    t.some_id = $1; -- यहाँ विशिष्ट रिकॉर्ड ID
    ```