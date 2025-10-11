# 📂 Master Module: Users, Roles, and RBAC Management

---

## 📝 1. Overview और उद्देश्य (Purpose)

यह मॉड्यूल **JIT QC API** के लिए केंद्रीय **मास्टर डेटा (Master Data)** और **पहुँच नियंत्रण (Access Control)** परत का प्रबंधन करता है। इसका मुख्य उद्देश्य सिस्टम के भीतर उपयोगकर्ता (Users), उनकी भूमिकाएँ (Roles), और उन भूमिकाओं से जुड़ी अनुमतियाँ (Permissions) को सुरक्षित रूप से बनाना, पढ़ना, अपडेट करना और हटाना (CRUD) है।

यह फ़ोल्डर निम्नलिखित कार्यों के लिए आवश्यक है:
1.  **उपयोगकर्ता प्रबंधन (User Management):** कर्मचारियों/इंस्पेक्टर्स के खाते बनाना, अपडेट करना और निष्क्रिय करना।
2.  **भूमिका प्रबंधन (Role Management):** सिस्टम में नई भूमिकाएँ (e.g., ADMIN, INSPECTOR) बनाना।
3.  **RBAC कार्यान्वयन (RBAC Implementation):** किसी भी भूमिका को विशिष्ट अनुमतियाँ (`permission_key`) असाइन करके पहुँच नियंत्रण को लागू करना।

### ⚙️ फ़ोल्डर संरचना (Folder Structure)

```
src/modules/master/users/
├── user.controller.js     // Business Logic, Request Handling, Validation
├── user.model.js         // Database Interactions (pg-promise)
├── user.route.js         // Express Routes/Endpoints Definition
└── README.md             // Module Documentation (यह फ़ाइल)
```

---

## 🛠️ 2. फ़ाइल-वार लॉजिक (File-by-File Logic)

### 2.1. `user.route.js` (Route Definitions)

यह फ़ाइल सभी एंडपॉइंट्स को परिभाषित करती है और सुनिश्चित करती है कि वे उचित **मिडिलवेयर** (Middleware) द्वारा सुरक्षित हैं।

* **प्रमुख कार्य:** HTTP Method (GET, POST, PUT, DELETE) को Controller फ़ंक्शन से मैप करना।
* **सुरक्षा:** प्रत्येक रूट `authenticate` (JWT सत्यापन) और `authorize` (RBAC जाँच) मिडिलवेयर का उपयोग करता है।

| Endpoint Group | Example Route | Required Permission | Description |
| :--- | :--- | :--- | :--- |
| **User CRUD** | `GET /api/master/users` | `USER_MANAGE_ALL` | सभी यूजर्स को पेजिनेशन के साथ प्राप्त करें। |
| **Role CRUD** | `POST /api/master/users/roles`| `USER_MANAGE_ALL` | नया रोल बनाएँ। |
| **RBAC Setup** | `PUT /api/master/users/roles/:roleId/permissions`| `USER_MANAGE_ALL` | रोल अनुमतियाँ असाइन करें/बदलें। |
| **Lookups** | `GET /api/master/users/inspectors`| `MASTER_READ_ONLY` | सक्रिय इंस्पेक्टर्स की सूची प्राप्त करें। |

### 2.2. `user.controller.js` (Business Logic Layer)

यह फ़ाइल एप्लिकेशन लॉजिक, HTTP अनुरोध और प्रतिक्रिया (Request/Response) को संभालने के लिए ज़िम्मेदार है। यह **मॉडल** को कॉल करने से पहले सभी आवश्यक जाँच और डेटा तैयारी करता है।

* **प्रमुख कार्य:**
    * `req.params` (ID), `req.query` (फ़िल्टर), और `req.body` (डेटा) का **सत्यापन** (Validation)।
    * यूजर क्रिएशन के लिए **पासवर्ड हैशिंग** (Hashing)।
    * डेटाबेस से **अद्वितीयता जाँच** (Uniqueness Check) (जैसे डुप्लिकेट रोल नाम)।
    * `try...catch` ब्लॉक के माध्यम से त्रुटियों (Errors) को संभालना और उचित HTTP प्रतिक्रिया कोड (200, 201, 400, 404, 409, 500) भेजना।

**Controller Function Logic Flow (Example: `createRole`):**
1.  `req.body` से डेटा प्राप्त करें।
2.  `validateRoleCreation` (utils/validation.js से) का उपयोग करके इनपुट को मान्य करें। **(Error 400)**।
3.  `user.model.js` में `getRoleByName` को कॉल करके डुप्लिकेट नाम के लिए जाँच करें। **(Error 409)**।
4.  `user.model.js` में `createRole` को कॉल करके डेटाबेस में नया रोल डालें।
5.  सफलता प्रतिक्रिया (Response) **(201 Created)** भेजें।

### 2.3. `user.model.js` (Data Access Layer)

यह फ़ाइल डेटाबेस (`db` ऑब्जेक्ट) के साथ सीधा इंटरैक्ट करती है। यह केवल PostgreSQL के लिए **SQL क्वेरीज़** (या pg-promise helpers) का उपयोग करती है।

* **प्रमुख कार्य:**
    * **CRUD फ़ंक्शंस:** `createRole`, `updateUser`, `deleteRole`, `getAllUsers` (pagination/filtering के साथ)।
    * **सुरक्षा फ़ंक्शंस:** `getUserByUsernameWithHash` (लॉगिन के लिए पासवर्ड हैश पुनर्प्राप्त करना)।
    * **RBAC फ़ंक्शंस:**
        * `setRolePermissions`: `role_permissions` तालिका में मैपिंग को अद्यतन/ओवरराइट करता है।
        * `getPermissionsByUserId`: लॉगिन के बाद प्रमाणीकरण (`Authorization`) के लिए सक्रिय उपयोगकर्ता की सभी अनुमतियाँ प्राप्त करता है।
    * **डेटा अखंडता (Data Integrity):** `isRoleInUse` फ़ंक्शन रोल को हटाने से पहले यह जाँचता है कि कोई सक्रिय उपयोगकर्ता इसका उपयोग कर रहा है या नहीं।

---

## 🛡️ 3. RBAC की विशिष्टता (RBAC Specialization)

यह मॉड्यूल RBAC को दो मुख्य तरीकों से लागू करता है:

| Function/Endpoint | Purpose | Details |
| :--- | :--- | :--- |
| **`setRolePermissions`** | **Role Assignment** | एक `role_id` लेता है और अनुमतियों की एक सरणी (`permission_keys`) लेता है। यह पिछली मैपिंग को **हटाता** है और नई मैपिंग **डालता** है। |
| **`getPermissionsByUserId`** | **Runtime Authorization** | लॉगिन के दौरान उपयोगकर्ता की `user_id` लेता है और स्ट्रिंग्स की एक सरणी (`['user:read', 'lot:create']`) लौटाता है, जिसका उपयोग `authorize` मिडिलवेयर द्वारा किया जाता है। |

**🔑 Key Security Logic (Implemented in Controller):**
`DELETE /roles/:roleId` को हिट करने से पहले, `user.model.js` में `isRoleInUse(roleId)` फ़ंक्शन को कॉल किया जाता है। यदि यह `TRUE` देता है, तो Controller **409 Conflict** प्रतिक्रिया देता है और रोल को हटाने से मना कर देता है ताकि **डेटा अखंडता** बनी रहे।

---

## 🚀 4. यूटिलिटीज और Dependencies

इस मॉड्यूल की कार्यक्षमता मुख्य रूप से दो बाहरी घटकों पर निर्भर करती है:

### 4.1. `utils/validation.js`

यह फ़ाइल मॉड्यूल के लिए केंद्रीकृत सत्यापन फ़ंक्शंस प्रदान करती है, जिससे Controller कोड साफ़ रहता है।

* **`handleIdValidation(id, paramName)`:** URL पैरामीटर ID को पार्स करके सुरक्षित रूप से `parseInt` करता है और जाँचता है कि यह एक **सकारात्मक पूर्णांक** है या नहीं।
* **`validateUserCreation(data)`:** नए यूजर डेटा (जैसे `password` > 8 chars, `role_id` is numeric) के लिए आवश्यक फ़ील्ड जाँचता है।

### 4.2. `middleware/auth.js`

* **`authenticate`:** आने वाले अनुरोध के HTTP हेडर से **JWT टोकन** को डीकोड और सत्यापित करता है।
* **`authorize(requiredPermission)`:** उपयोगकर्ता के टोकन से प्राप्त अनुमतियों की सूची की तुलना **आवश्यक अनुमति** (e.g., `'USER_MANAGE_ALL'`) से करता है। यदि आवश्यक अनुमति सूची में नहीं है, तो **403 Forbidden** त्रुटि फेंकता है।