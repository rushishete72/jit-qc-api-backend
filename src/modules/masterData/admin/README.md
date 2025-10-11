# 📂 MasterData Module: Admin Sub-Module (Centralized Master Data Management)

---

## 📝 1. Overview और उद्देश्य (Purpose)

यह सब-मॉड्यूल **एडमिनिस्ट्रेशन पैनल** के लिए डिज़ाइन किया गया है और सिस्टम के भीतर विभिन्न **मास्टर डेटा तालिकाओं (Master Data Tables)** (जैसे Parts, Vendors, Customers, Locations) के CRUD (Create, Read, Update) संचालन को **केंद्रीकृत (Centralized) और डायनामिक (Dynamic)** तरीके से संभालता है।

यह पारंपरिक तरीके से प्रत्येक मास्टर टेबल के लिए अलग कंट्रोलर और मॉडल बनाने की आवश्यकता को समाप्त करता है, जिससे कोड की पुनरावृत्ति (redundancy) कम होती है और प्रबंधन आसान हो जाता है।

### 🔑 मुख्य विशेषताएँ (Key Features)

* **डायनामिक CRUD:** एक ही API रूट (`/api/masterdata/admin/:tableName`) का उपयोग करके कई मास्टर तालिकाओं का प्रबंधन।
* **सुरक्षा:** सभी एंडपॉइंट्स पर **JWT प्रमाणीकरण** (`authenticate`) और **RBAC प्राधिकरण** (`authorize`) लागू किया गया है।
* **स्पेशलाइज्ड लॉजिक:** जेनेरिक CRUD के अलावा, यह BOM अपडेट या Vendor-Part लिंकिंग जैसे जटिल, विशिष्ट संचालन को भी संभालता है।

---

## ⚙️ 2. फ़ोल्डर संरचना (Folder Structure)
```
src/modules/masterData/admin/
├── masterData.controller.js     // Business Logic, Dynamic Table Handling
├── masterData.model.js          // Database Access (Generic & Specific Queries)
├── masterData.route.js          // Express Routes (Dynamic Table and Linking Routes)
└── README.md                    // Module Documentation (यह फ़ाइल)

```
---

## 🛠️ 3. फ़ाइल-वार लॉजिक (File-by-File Logic)

### 3.1. `masterData.route.js` (Route Definitions)

यह फ़ाइल **डायनामिक URL पैरामीटर** (`:tableName` और `:id`) का उपयोग करके जेनेरिक रूट्स को परिभाषित करती है।

* **बेस पाथ:** `/api/masterdata/admin`
* **tableName उदाहरण:** `parts`, `vendors`, `customers`, `users`, `locations`

| Route Type | HTTP Method | Endpoint Pattern | Required RBAC Permission | Controller Function |
| :--- | :--- | :--- | :--- | :--- |
| **Generic List** | `GET` | `/:tableName` | `MASTER_READ_ONLY` | `getMasterList` |
| **Generic Create** | `POST` | `/:tableName` | `MASTER_MANAGE_ALL` | `createMasterRecord` |
| **Generic Update** | `PUT` | `/:tableName/:id` | `MASTER_MANAGE_ALL` | `updateMasterRecord` |
| **Specific BOM** | `PUT` | `/parts/:partId/bom` | `PART_MANAGE_BOM` | `updatePartBOM` |
| **Specific Link** | `POST` | `/linking/vendor-part` | `VENDOR_PART_LINK` | `linkVendorToPart` |

### 3.2. `masterData.controller.js` (Business Logic Layer)

यह कंट्रोलर मॉड्यूल का **हृदय** है, जो सुरक्षा और व्यावसायिक लॉजिक को लागू करता है।

#### 3.2.1. कोर लॉजिक

* **टेबल/ID वैलिडेशन:** यह सुनिश्चित करने के लिए कि `req.params.tableName` `VALID_TABLES` ऑब्जेक्ट में मौजूद है। यदि नहीं, तो **400 Bad Request** लौटाता है।
    ```javascript
    const VALID_TABLES = {
        'parts': { table: 'master_parts', key: 'part_id' },
        // ... अन्य मैपिंग
    };
    // validateTableAndId फ़ंक्शन इस मैपिंग का उपयोग करता है।
    ```
* **Part Initalization (CRITICAL):** `createMasterRecord` फ़ंक्शन में एक महत्वपूर्ण जाँच शामिल है:
    ```javascript
    if (config.table === 'master_parts') {
        // Part बनने के तुरंत बाद नियंत्रण डेटा बनाता है
        await masterModel.initializePartControlData(newRecord.part_id);
    }
    ```
* **डिटेल लुकअप:** `getMasterRecordDetails` फ़ंक्शन जेनेरिक कॉल के बजाय प्रत्येक टेबल के लिए विशिष्ट मॉडल फ़ंक्शन (जैसे `getPartDetailsById`, `getCustomerDetailsById`) का उपयोग करता है, ताकि आवश्यक **जॉइन्स** और **संबंधित डेटा** (जैसे Customer Addresses) को जोड़ा जा सके।

### 3.3. `masterData.model.js` (Data Access Layer)

यह फ़ाइल दो प्रकार के SQL लॉजिक को जोड़ती है:

#### 3.3.1. जेनेरिक यूटिलिटी (Generic Utility)

ये फ़ंक्शन `$1:name` सिंटैक्स और `pgp.helpers` का उपयोग करके किसी भी मास्टर टेबल पर काम करते हैं:

| Function | Purpose | SQL Mechanism |
| :--- | :--- | :--- |
| `createMasterEntry` | Dynamic Insert | `pgp.helpers.insert` |
| `updateMasterEntry` | Dynamic Update | `pgp.helpers.update` + `WHERE $1:name = $2` |
| `getAllMasterEntries` | Dynamic Select | `SELECT * FROM $1:name WHERE is_active = TRUE` |

#### 3.3.2. विशिष्ट/जटिल लॉजिक (Specific/Complex Logic)

ये फ़ंक्शन जटिल व्यावसायिक नियमों या कई तालिकाओं के जॉइन को संभालते हैं:

* **`updatePartBOM(partId, bomLines)`:** एक Transactional ऑपरेशन जहाँ पहले मौजूदा BOM को `DELETE` किया जाता है और फिर नया BOM `INSERT` किया जाता है।
* **`linkVendorToPart(vendorId, partId, ...)`:** वेंडर को अनुमोदित सप्लायर सूची में जोड़ने के लिए `ON CONFLICT DO UPDATE` का उपयोग करता है, जिससे डुप्लिकेट एंट्रीज रोकी जाती हैं।
* **`getCustomerShippingAddresses(customerId)`:** एक से अधिक पतों को फ़ेच करके Customer डिटेल ऑब्जेक्ट में जोड़ने के लिए डेटाबेस से अलग से कॉल किया जाता है।

---

## 🔑 4. सुरक्षा और RBAC मैपिंग

सुरक्षा बनाए रखने के लिए, रूट्स को उचित अनुमति स्तरों पर मैप किया गया है:

| Master Data Action | Required Permission |
| :--- | :--- |
| **Viewing/Listing** (`GET` requests) | `MASTER_READ_ONLY` |
| **Creation/Updating** (`POST`/`PUT` requests) | `MASTER_MANAGE_ALL` |
| **Part BOM Update** | `PART_MANAGE_BOM` |
| **Vendor-Part Linking** | `VENDOR_PART_LINK` |
| **User-Entity Linking** | `USER_MANAGE_ALL` |





