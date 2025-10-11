# 📦 UOM Module: Unit of Measurement Management

---

## 📝 1. Overview और उद्देश्य (Purpose)
```
यह मॉड्यूल सिस्टम के भीतर सभी **इकाई माप (Unit of Measurement - UOM)** को प्रबंधित करने के लिए समर्पित है। UOM मास्टर डेटा का एक मूलभूत हिस्सा है, जिसका उपयोग **Parts, Inventory, और Quality Control** जैसे अन्य मॉड्यूल में मात्राओं को परिभाषित करने के लिए किया जाता है।

यह मॉड्यूल UOMs के लिए पूर्ण CRUD (Create, Read, Update, Deactivate) संचालन प्रदान करता है, साथ ही महत्वपूर्ण **व्यावसायिक नियम (Business Rules)** लागू करता है, विशेष रूप से UOM को निष्क्रिय करने से पहले।
```

### 🔑 मुख्य विशेषताएँ (Key Features)
```
1.  **सॉफ्ट डिलीट:** `is_active` फ़ील्ड का उपयोग करके विलोपन (Deletion) के बजाय निष्क्रियता (`Deactivation`) लागू करता है।
2.  **उपयोग जाँच:** यह सुनिश्चित करता है कि एक UOM को निष्क्रिय नहीं किया जा सकता है यदि वह वर्तमान में किसी **Master Part** द्वारा उपयोग में है, जिससे डेटा अखंडता बनी रहती है।
3.  **डायनामिक क्वेरीज़:** सूची (`getAllUoms`) को कुशलतापूर्वक पुनः प्राप्त करने के लिए खोज (`search`) और सक्रियता (`isActive`) फ़िल्टरिंग का समर्थन करता है।
4.  **संघर्ष निवारण:** डुप्लिकेट UOM नाम या सिंबल प्रविष्टियों को रोकता है।
```
---

## ⚙️ 2. फ़ोल्डर संरचना (Folder Structure)
```
src/modules/masterData/uom/
├── uom.controller.js     // Input Validation, Business Logic Checks (e.g., isUomInUse)
├── uom.model.js          // Database Access, Dynamic Filtering, Conflict Handling
├── uom.route.js          // Express Routes, RBAC Middleware Application
└── README.md             // Module Documentation (यह फ़ाइल)
```

---

## 🛠️ 3. फ़ाइल-वार लॉजिक और डेटाबेस इंटरैक्शन

### 3.1. `uom.controller.js`
```
कंट्रोलर व्यावसायिक लॉजिक और बाहरी API इंटरैक्शन के लिए जिम्मेदार है।
```
#### **सत्यापन (Validation):**
```
* `handleIdValidation`: URL से प्राप्त `uomId` पैरामीटर को पार्स और मान्य करता है।
* **इनपुट जाँच:** `createUom` और `updateUom` में `name` और `symbol` जैसे आवश्यक फ़ील्ड की उपस्थिति की जाँच करता है, यदि अनुपस्थित हो तो **400 Bad Request** लौटाता है।
```
#### **महत्वपूर्ण व्यावसायिक नियम:**
```
* **`deactivateUom`:** UOM को निष्क्रिय करने से पहले, यह फ़ंक्शन मॉडल (`uomModel.isUomInUse`) को कॉल करके जाँच करता है कि UOM किसी भी `parts` तालिका द्वारा उपयोग किया जा रहा है या नहीं।
    * **परिणाम:** यदि उपयोग में है, तो यह एक **409 Conflict** त्रुटि संदेश देता है, जिससे उपयोगकर्ता को पता चलता है कि UOM को पहले पार्ट्स से अनलिंक करने की आवश्यकता है।
```
### 3.2. `uom.model.js`
```
मॉडल डेटाबेस से इंटरैक्ट करता है और जटिल SQL लॉजिक को संभालता है।
```
#### **डेटा अखंडता (Data Integrity):**
```
| Operation | Postgres Error Code | Handled Action | HTTP Status |
| :--- | :--- | :--- | :--- |
| `createUom` / `updateUom` | `23505` (Unique Violation) | `APIError` थ्रो करता है। | `409 Conflict` |
| `getUomById` / `updateUom` | No Record Found | `APIError` थ्रो करता है (Controller द्वारा 404 पर मैप किया गया)। | `404 Not Found` |
```
#### **गतिशील पठन (Dynamic Read - `getAllUoms`):**
```
यह फ़ंक्शन एक एकल SQL क्वेरी का उपयोग करके सशर्त रूप से `WHERE` क्लॉज़ बनाता है:

javascript
// यह मॉडल लॉजिक 'uom.model.js' के भीतर है
if (isActive !== null) {
    // ... active/inactive फ़िल्टर जोड़ें
}
if (search) {
    // ... LOWER() और LIKE का उपयोग करके name/symbol सर्च जोड़ें
}
// ... db.any(query, params)
उपयोग जाँच (Usage Check):
JavaScript

// uom.model.js: isUomInUse
const query = 'SELECT EXISTS(SELECT 1 FROM parts WHERE uom_id = $1) AS in_use;';
// ...
```
### 3.3. uom.route.js
```
एक्सप्रेस रूट परिभाषाएँ, प्रमाणीकरण और प्राधिकरण लागू करती हैं।

एंडपॉइंट्स (Endpoints):
HTTP Method	Endpoint	Description	Required Permission
GET	/api/uoms	सभी UOMs सूचीबद्ध करें (फ़िल्टरिंग/सर्च)।	UOM_VIEW_ALL
POST	/api/uoms	नया UOM बनाएँ।	UOM_CREATE
GET	/api/uoms/:uomId	ID द्वारा UOM प्राप्त करें।	UOM_VIEW_ALL
PUT	/api/uoms/:uomId	ID द्वारा UOM अपडेट करें।	UOM_UPDATE
PATCH	/api/uoms/:uomId/deactivate	ID द्वारा UOM को निष्क्रिय करें।	UOM_DEACTIVATE
```
Export to Sheets
## 🛡️ 4. सुरक्षा और RBAC मैपिंग
सुरक्षा सुनिश्चित करने के लिए, सभी रूट्स पर authenticate (JWT) लागू किया जाता है, और प्राधिकरण के लिए विशिष्ट अनुमतियों का उपयोग किया जाता है:
---
JavaScript
```
// उदाहरण: UOM को निष्क्रिय करने के लिए
router.patch('/:uomId/deactivate', 
    authenticate, 
    authorize('UOM_DEACTIVATE'), 
    deactivateUom
);
```