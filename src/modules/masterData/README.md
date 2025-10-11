# Master Data Module (MDM) Overview
```
यह मॉड्यूल मुख्य रूप से चार कोर मास्टर डेटा संस्थाओं (Entities) को प्रबंधित करता है: Parts, UOMs (Unit of Measurement), Suppliers, और Clients। इसमें डेटाबेस इंटरेक्शन (.model.js) और API राउटिंग (.route.js) शामिल हैं।
```
## 1. Module Files & Responsibilities
```
इस मॉड्यूल में दो प्राथमिक फ़ाइलें हैं, जो एक MVC (Model-View-Controller) पैटर्न के मॉडल और रूटिंग लेयर का प्रतिनिधित्व करती हैं:
```
### 1.1. masterData.model.js (डेटाबेस लॉजिक)
```
// File: modules/masterData/masterData.model.js
जिम्मेदारी: PostgreSQL के साथ इंटरैक्ट करना, pg-promise का उपयोग करके सुरक्षित और कुशल SQL क्वेरी चलाना।

प्रभाव: डेटाबेस की चार मुख्य तालिकाओं (master_parts, master_uoms, master_suppliers, master_clients) पर सीधे प्रभाव डालता है।

कोर विशेषताएँ:

डेटा बनाने/अपडेट करने के लिए pgp.helpers.ColumnSet का उपयोग।

सभी deactivate फ़ंक्शंस के माध्यम से सॉफ़्ट डिलीट (is_active = FALSE) लागू करना।

updated_at टाइमस्टैम्प को स्वचालित रूप से अपडेट करना।
```
### 1.2. masterData.route.js (API राउटिंग)
```
// File: modules/masterData/masterData.route.js
जिम्मेदारी: Express.js राउटर्स को परिभाषित करना और HTTP मेथड को कंट्रोलर फ़ंक्शंस से मैप करना।

बेस पाथ: सभी राउट्स /api/master प्रीफ़िक्स के तहत माउंट किए जाते हैं।

कोर विशेषताएँ: इन्वेंट्री-संबंधित राउट्स (/uoms) के लिए एक सब-राउटर (inventoryRouter) का उपयोग करता है, जिसे /inventory प्रीफ़िक्स के तहत माउंट किया जाता है।
```
## 2. Core Master Data Sub-Modules (3 Groups)
```
चार मास्टर संस्थाओं को उनकी कार्यक्षमता के आधार पर तीन तार्किक समूहों में विभाजित किया गया है:
```
### 2.1. ### A. Parts Master (8 Functions)
```
यह सबसे जटिल मॉड्यूल है क्योंकि इसमें अन्य मास्टर डेटा (UOM, Supplier, Client) से ज्वाइन (JOIN) किया गया डेटा शामिल है।
```
---
```
Model Functions (masterData.model.js)
फ़ंक्शन का नाम	उद्देश्य	SQL ऑपरेशन
createPart(data)	एक नया पार्ट रिकॉर्ड बनाता है।	INSERT ... RETURNING *
checkPartExists(no, rev)	पार्ट नंबर और रिवीज़न द्वारा अस्तित्व की जाँच करता है।	SELECT part_id (oneOrNone)
getPartById(id)	पार्ट ID द्वारा विस्तृत पार्ट जानकारी (JOINs के साथ) प्राप्त करता है।	SELECT * + 3 JOINs
getPartByPartNoRev(no, rev)	पार्ट नंबर और रिवीज़न द्वारा विस्तृत पार्ट (JOINs के साथ) प्राप्त करता है।	SELECT * + 3 JOINs
getAllParts(params)	पेजिंग (limit, offset), फ़िल्टरिंग (search), और सक्रिय/निष्क्रिय फ़िल्टरिंग के साथ सूची प्राप्त करता है।	SELECT COUNT + SELECT * (2 JOINs)
updatePart(id, data)	पार्ट ID द्वारा रिकॉर्ड अपडेट करता है।	UPDATE ... RETURNING *
deactivatePart(id)	पार्ट को निष्क्रिय (is_active = FALSE) करता है।	UPDATE ... RETURNING
activatePart(id)	पार्ट को पुनः सक्रिय (is_active = TRUE) करता है।	UPDATE ... RETURNING
```

### 2.2. ### B. UOM Master (5 Functions)
```
यूनिट ऑफ़ मेज़रमेंट मास्टर डेटा, जिसे masterData.route.js में एक इन्वेंट्री सब-राउटर के माध्यम से प्रबंधित किया जाता है।

Model Functions (masterData.model.js)
फ़ंक्शन का नाम	उद्देश्य	SQL ऑपरेशन
createUom(data)	एक नया UOM रिकॉर्ड बनाता है।	INSERT ... RETURNING *
checkUomExists(code)	UOM कोड द्वारा अस्तित्व की जाँच करता है।	SELECT uom_id (oneOrNone)
getAllUoms(params)	सक्रिय/निष्क्रिय फ़िल्टरिंग के साथ सभी UOMs की सूची प्राप्त करता है।	SELECT * (db.any)
updateUom(id, data)	UOM ID द्वारा रिकॉर्ड अपडेट करता है।	UPDATE ... RETURNING *
deactivateUom(id)	UOM को निष्क्रिय (is_active = FALSE) करता है।	UPDATE ... RETURNING

```
```
Route Endpoints (masterData.route.js)
मेथड	एंडपॉइंट पाथ	कंट्रोलर	विवरण
POST	/inventory/uoms	createMasterUom	नया UOM बनाएँ।
GET	/inventory/uoms	getAllMasterUoms	UOMs की सूची प्राप्त करें।
PUT	/inventory/uoms/:uomId	updateMasterUom	UOM को अपडेट करें।
PATCH	/inventory/uoms/deactivate/:uomId	deactivateMasterUom	D1.3 CRITICAL FIX: Soft Delete के लिए अनुशंसित नया रूट।
DELETE	/inventory/uoms/:uomId	deactivateMasterUom	Soft Delete के लिए Backwards Compatibility रूट।
```

### 2.3. ### C. Supplier & Client Masters (7 Functions Each)
```
सप्लायर्स और क्लाइंट्स दोनों का डेटा मॉडल और CRUD फ़ंक्शंस का सेट लगभग समान है, जिसमें पेजिंग और संपर्क विवरण शामिल हैं।

Model Functions (masterData.model.js)
फ़ंक्शन का नाम (Supplier/Client)	उद्देश्य	SQL ऑपरेशन
createSupplier/createClient	एक नई एंट्री बनाता है (कोड, नाम, संपर्क)।	INSERT ... RETURNING *
checkSupplierExists/checkClientExists	कोड द्वारा अस्तित्व की जाँच करता है।	SELECT id (oneOrNone)
getSupplierById/getClientById	ID द्वारा पूरा रिकॉर्ड प्राप्त करता है।	SELECT * (oneOrNone)
getAllSuppliers/getAllClients	पेजिंग, सर्च, और सक्रिय/निष्क्रिय फ़िल्टरिंग के साथ सूची प्राप्त करता है।	SELECT COUNT + SELECT *
updateSupplier/updateClient	ID द्वारा पूरा रिकॉर्ड अपडेट करता है।	UPDATE ... RETURNING *
deactivateSupplier/deactivateClient	एंट्री को निष्क्रिय (is_active = FALSE) करता है।	UPDATE ... RETURNING
activateSupplier/activateClient	एंट्री को पुनः सक्रिय (is_active = TRUE) करता है।	UPDATE ... RETURNING
```