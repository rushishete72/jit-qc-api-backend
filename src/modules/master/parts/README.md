# 🧩 Parts Master Data Module

यह मॉड्यूल आपकी **इन्वेंटरी/उत्पादन प्रणाली का Core Reference Data** है।  
यह `Part Number`, `Revision`, `Description`, `UOM` जैसी महत्वपूर्ण जानकारी को प्रबंधित करता है,  
जो पूरे एप्लिकेशन में संदर्भ (Reference) के रूप में कार्य करता है।

---

## 🏗️ 1. मॉड्यूल का प्रभाव और निर्भरताएँ (System Impact)

**Parts मॉड्यूल** सिस्टम के अन्य सभी कार्यात्मक क्षेत्रों को सीधे प्रभावित करता है,  
क्योंकि यह परिभाषित करता है कि कौन सी वस्तुएँ (Items) मौजूद हैं।

| प्रभावित मॉड्यूल | प्रभाव का विवरण (How it is affected) |
|------------------|---------------------------------------|
| **Inventory / Stock** | प्रत्येक स्टॉक एंट्री और स्टॉक लेनदेन (Stock In/Out) सीधे एक `Part ID` से जुड़ा होता है। |
| **Purchasing / Procurement** | खरीद आदेश (Purchase Orders) केवल यहाँ परिभाषित Parts के लिए बनाए जा सकते हैं। |
| **Sales / Order Management** | ग्राहक ऑर्डर बनाते समय यह मॉड्यूल Parts की उपलब्धता और मूल्य निर्धारण (Pricing) के लिए आधार प्रदान करता है। |
| **Quality Control (QC)** | QC योजनाएँ और निरीक्षण रिकॉर्ड (Inspection Records) `Part ID` पर आधारित होते हैं। |
| **UOM Master** | Parts की माप की इकाई (`UOM ID`) को Foreign Key के रूप में संदर्भित करता है। अमान्य `UOM ID` होने पर Part नहीं बनाया जा सकता। |

---

## ⚙️ 2. कोर फ़ाइलें और लॉजिक ब्रेकडाउन

यह मॉड्यूल तीन मुख्य फ़ाइलों में संरचित है:

1. **`part.model.js`** – Database Interaction  
2. **`part.controller.js`** – Controller Logic  
3. **`part.route.js`** – API & Security

---

### 📄 2.1. part.model.js (Database Interaction)

यह फ़ाइल PostgreSQL के साथ इंटरेक्शन को संभालती है,  
जिसमें **pg-promise** का उपयोग किया गया है।

#### 🧠 a. CRUD और Query फ़ंक्शंस

| फ़ंक्शन का नाम | मुख्य कार्यक्षमता | प्रदर्शन / जुड़े हुए डेटा |
|----------------|-------------------|---------------------------|
| **createPart** | डेटाबेस में नया Part रिकॉर्ड सम्मिलित करता है। | डेटा अखंडता: `part_number` और `rev_no` के यूनिक संयोजन की जाँच करता है। |
| **getPartById** | Part ID द्वारा एकल रिकॉर्ड प्राप्त करता है। | डेटा संवर्धन: `UOM` विवरण (`uom_name`, `uom_symbol`) प्राप्त करने के लिए `JOIN` का उपयोग करता है। |
| **getAllParts** | Part की सूची प्राप्त करता है। | पेजिनेशन (`limit/offset`) और गतिशील फ़िल्टरिंग (`search`, `isActive`) लागू करता है। साथ में UOM के साथ `JOIN` भी शामिल है। |
| **updatePart** | Part रिकॉर्ड को संशोधित करता है। | सुरक्षित अपडेट: केवल दिए गए फ़ील्ड्स को अपडेट करने के लिए `db.helpers.set` का उपयोग करता है। |
| **deactivatePart** | Part को निष्क्रिय (`is_active = FALSE`) करता है। | सॉफ़्ट डिलीट: रिकॉर्ड को हटाता नहीं है, बल्कि तार्किक रूप से छुपाता है। |

#### 🛡️ b. रोबस्ट एरर हैंडलिंग (Error Handling Details)

मॉडल लेयर डेटाबेस-जनित त्रुटियों को पकड़ती है और उन्हें सार्थक **APIError** में बदल देती है:

| HTTP Status | DB Code | स्थिति |
|--------------|----------|---------|
| **409 Conflict** | `23505` | जब `Part Number + Revision` संयोजन पहले से मौजूद हो। |
| **400 Bad Request** | `23503` | जब कोई अमान्य `uom_id` प्रदान किया जाता है (Foreign Key Violation)। |
| **404 Not Found** | — | जब `updatePart` जैसे फ़ंक्शंस में रिकॉर्ड मौजूद नहीं हो। |

---

### 🔐 2.2. part.route.js (API Endpoints & Security)

यह फ़ाइल **Express Router()** का उपयोग करके  
**Part Master** के लिए RESTful API संरचना और सुरक्षा परिभाषित करती है।

#### a. API एंडपॉइंट्स और RBAC (Role-Based Access Control)

| HTTP Method | Endpoint | आवश्यक अनुमति | फ़ंक्शन |
|--------------|-----------|----------------|-----------|
| **GET** | `/` | `PART_VIEW_ALL` | `getAllParts` |
| **POST** | `/` | `PART_CREATE` | `createPart` |
| **GET** | `/:id` | `PART_VIEW_ONE` | `getPartById` |
| **PUT** | `/:id` | `PART_UPDATE` | `updatePart` |
| **DELETE** | `/:id` | `PART_DELETE` | `deletePart` |

#### 🔒 सुरक्षा विवरण:

- सभी राउट्स पर **`authenticate` middleware** लागू होता है — वैध **JWT Token** की आवश्यकता होती है।  
- प्रत्येक ऑपरेशन के लिए विशिष्ट **authorize permission** आवश्यक है,  
  ताकि केवल सही भूमिका (Role) वाला उपयोगकर्ता ही ऑपरेशन कर सके।

---

### 🧭 2.3. part.controller.js (Controller Logic)

कंट्रोलर मॉडल फ़ंक्शंस के लिए एक इंटरफ़ेस के रूप में कार्य करता है।

| फ़ंक्शन का विवरण | स्थिति (Current State) | आवश्यक अगले कदम (Next Step) |
|------------------|--------------------------|-----------------------------|
| **getAllParts, getPartById, updatePart, deletePart** | डमी लॉजिक | सभी फ़ंक्शंस को `part.model.js` से वास्तविक मॉडल फ़ंक्शंस को कॉल करने के लिए अपडेट करना आवश्यक है। |
| **createPart** | आंशिक रूप से लागू | `name` और `code` के लिए 400 Bad Request वैलिडेशन मौजूद है। ✅ TODO: डेटाबेस में इसे डालने के लिए `createPart` मॉडल फ़ंक्शन को कॉल करें। |

🧩 **सारांश:**  
कंट्रोलर फ़ाइल वर्तमान में मॉडल-टू-राउट इंटीग्रेशन के लिए तैयार है।  
अधिकांश बिज़नेस लॉजिक को मॉडल लेयर में धकेला गया है ताकि कंट्रोलर **हल्का (Thin Controller Pattern)** रहे।

---

## 📦 Export Options
- सभी रिपोर्ट्स और Part Lists को Sheets / Excel में एक्सपोर्ट करने का सपोर्ट।  
- डेटा फिल्टरिंग और सर्चिंग विकल्प API स्तर पर उपलब्ध।

---

## ✅ निष्कर्ष (Conclusion)

**Parts Master Data Module** पूरे सिस्टम का आधार है।  
इसकी सही संरचना और रेफ़रेंशियल इंटिग्रिटी सुनिश्चित करती है कि  
Inventory, Sales, Purchase, और Quality जैसे सभी मॉड्यूल सही ढंग से कार्य करें।

---

> **Author:** Backend Development Team  
> **Database:** PostgreSQL  
> **ORM / Query Library:** pg-promise  
> **Security:** JWT + Role Based Access Control (RBAC)