# 📂 Role Module: Core Role and Permission Management

---

## 📝 1. Overview और उद्देश्य (Purpose)

```
यह मॉड्यूल **रोल-आधारित एक्सेस कंट्रोल (RBAC)** प्रणाली के लिए केंद्रीय प्रबंधन परत है। इसका प्राथमिक उद्देश्य सिस्टम के भीतर **उपयोगकर्ता भूमिकाओं (User Roles)** का निर्माण, पठन, अद्यतन और विलोपन (**CRUD**) करना है।

भूमिकाएँ (जैसे 'Admin', 'Inspector', 'Manager') उपयोगकर्ताओं को अनुमतियाँ (`Permissions`) असाइन करने का आधार बनती हैं, जिससे यह सुनिश्चित होता है कि प्रत्येक उपयोगकर्ता के पास केवल वही कार्यक्षमता तक पहुंच हो जिसकी उसे आवश्यकता है।
```
### 🔑 मुख्य विशेषताएँ (Key Features)
```
1.  **पूर्ण CRUD:** भूमिकाएँ बनाने, देखने, अपडेट करने और हटाने के लिए RESTful एंडपॉइंट्स।
2.  **डुप्लिकेट और FK जाँच:** डेटा अखंडता सुनिश्चित करने के लिए रोल नाम की विशिष्टता और फॉरेन की (Foreign Key - यूजर असाइनमेंट) उल्लंघन को संभालना।
3.  **सुरक्षा:** प्रत्येक एंडपॉइंट **JWT प्रमाणीकरण** (`authenticate`) और **RBAC प्राधिकरण** (`authorize`) द्वारा सुरक्षित है।
```
---

## ⚙️ 2. फ़ोल्डर संरचना (Folder Structure)

```
src/modules/masterData/roles/
├── role.controller.js     // Business Logic, Input Validation
├── role.model.js          // Database Interactions, Conflict Handling
├── role.route.js          // Express Routes, RBAC Middleware Application
└── README.md              // Module Documentation (यह फ़ाइल)
```

---

## 🛠️ 3. फ़ाइल-वार लॉजिक (File-by-File Logic)

### 3.1. `role.controller.js` (Business Logic Layer)
```
कंट्रोलर का मुख्य कार्य अनुरोधों को संभालना, प्रारंभिक सत्यापन करना और मॉडल को कॉल करना है।

* **ID/इनपुट सत्यापन:** `handleIdValidation` का उपयोग करके URL ID की जाँच करता है और `validateRoleCreation` का उपयोग करके आवश्यक फ़ील्ड्स (जैसे `role_name`) की जाँच करता है।
* **त्रुटि प्रबंधन:** सत्यापन विफल होने या मॉडल से त्रुटि प्राप्त होने पर `APIError` का उपयोग करके उपयुक्त HTTP स्टेटस कोड (जैसे **400 Bad Request**) के साथ प्रतिक्रिया देता है।
* **CRUD मैपिंग:** सभी 5 मुख्य CRUD ऑपरेशनों (`findAll`, `create`, `update`, `remove`, `findById`) को संभालता है।
```
### 3.2. `role.model.js` (Data Access Layer)
```
मॉडल डेटाबेस (`roles` टेबल) के साथ सीधा इंटरैक्ट करता है और डेटाबेस-विशिष्ट त्रुटियों को संभालता है।

| Function | Purpose | Critical Logic | Error Handling |
| :--- | :--- | :--- | :--- |
| `create/update` | Role बनाना/संशोधित करना | `pgp.helpers` का उपयोग करके सुरक्षित SQL निर्माण। | **409 Conflict** यदि `role_name` पहले से मौजूद है (`23505` UNIQUE violation)। |
| `remove` | Role हटाना | `DELETE` क्वेरी। | **409 Conflict** यदि Role किसी सक्रिय यूजर को असाइन किया गया है (`23503` Foreign Key violation)। |
| `findById` | Role प्राप्त करना | `SELECT` क्वेरी। | **404 Not Found** यदि Role ID मौजूद नहीं है। |
```
### 3.3. `role.route.js` (Route Definitions)
```
यह फ़ाइल RESTful तरीके से रूट्स को परिभाषित करती है और प्राधिकरण (Authorization) लागू करती है।

| HTTP Method | Endpoint | Description | Required Permission |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/roles` | सभी Roles सूचीबद्ध करें। | `ROLE_VIEW_ALL` |
| `POST` | `/api/roles` | नया Role बनाएँ। | `ROLE_CREATE` |
| `GET` | `/api/roles/:id` | ID द्वारा एक Role देखें। | `ROLE_VIEW_ONE` |
| `PUT` | `/api/roles/:id` | ID द्वारा Role अपडेट करें। | `ROLE_UPDATE` |
| `DELETE` | `/api/roles/:id` | ID द्वारा Role हटाएँ। | `ROLE_DELETE` |
```
---

## 🛡️ 4. सुरक्षा और डेटा अखंडता
```
यह मॉड्यूल RBAC और त्रुटि प्रबंधन के माध्यम से दो मुख्य सुरक्षा और अखंडता नियमों को सख्ती से लागू करता है:
```
### 4.1. RBAC
```
प्रत्येक महत्वपूर्ण ऑपरेशन के लिए एक विशिष्ट अनुमति की आवश्यकता होती है। उदाहरण के लिए:

```javascript
router.post('/', authenticate, authorize('ROLE_CREATE'), createRole);
router.delete('/:id', authenticate, authorize('ROLE_DELETE'), deleteRole);
```
### 4.2. Foreign Key Violation Handling (Deletion Safety)
```
role.model.js यह सुनिश्चित करता है कि यदि कोई रोल वर्तमान में किसी उपयोगकर्ता को असाइन किया गया है, तो उसे हटाया नहीं जा सकता।

JavaScript

// role.model.js से
if (error.code === '23503') { 
    // यह APIError 409 Conflict लौटाएगा
    throw new APIError('Cannot delete Role: It is currently assigned to one or more users.', 409);
}
```
---
