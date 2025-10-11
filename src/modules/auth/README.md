# 🏭 JIT/QC API (Just-in-Time / Quality Check API)

यह रिपॉजिटरी JIT/QC एप्लिकेशन के लिए बैकएंड सर्विस कोड को होस्ट करती है। यह API **PostgreSQL** डेटाबेस के शीर्ष पर **Node.js** और **Express** का उपयोग करके बनाया गया है।

## 🔐 1. Authentication Module (`src/modules/auth/userAuth`)

यह मॉड्यूल API में उपयोगकर्ता पहुँच (user access) को नियंत्रित करने वाला मुख्य घटक है। यह एक आधुनिक, सुरक्षित और पासवर्ड रहित (passwordless) प्रमाणीकरण (Authentication) प्रवाह (flow) लागू करता है।

### 🔑 कोर विशेषताएं (Core Features)

यह मॉड्यूल **OTP (One-Time Password)** पर आधारित एक मजबूत प्रमाणीकरण प्रणाली प्रदान करता है:

| फ़ीचर (Feature) | विवरण (Description) | तकनीकी आधार (Technical Foundation) |
| :--- | :--- | :--- |
| **Passwordless Login** | उपयोगकर्ता ईमेल के माध्यम से OTP का अनुरोध करके लॉग इन करते हैं, जिससे पारंपरिक पासवर्ड की आवश्यकता समाप्त हो जाती है। | `loginUser` और `verifyOtp` कंट्रोलर फ़ंक्शंस। |
| **PBAC Integration** | सफल प्रमाणीकरण पर, JWT टोकन में उपयोगकर्ता की **भूमिका (Role)** और **अनुमतियाँ (Permissions)** एम्बेड की जाती हैं। | `userAuth.model.js` में `getUserProfileData` और `userAuth.controller.js` में `createAuthToken`। |
| **Secure OTP Handling** | OTP को डेटाबेस में **bcrypt** का उपयोग करके एन्क्रिप्ट (hash) किया जाता है और एक सीमित समय के लिए (5 मिनट) ही मान्य रखा जाता है। | `userAuth.model.js` में `createOtp` और `validateOtp` ट्रांज़ैक्शन। |
| **Error Handling** | सभी व्यावसायिक त्रुटियों (जैसे- अमान्य OTP, उपयोगकर्ता नहीं मिला) के लिए मानकीकृत **APIError (4xx)** प्रतिक्रियाएँ। | `src/utils/errorHandler.js` और कंट्रोलर/सर्विस में इसका उपयोग। |

### 🚀 एंडपॉइंट्स (Endpoints)

| रूट (Route) | विधि (Method) | उद्देश्य (Purpose) |
| :--- | :--- | :--- |
| `/api/auth/register` | `POST` | नए उपयोगकर्ता का पंजीकरण। OTP भेजता है। |
| `/api/auth/login` | `POST` | मौजूदा उपयोगकर्ता के लिए OTP अनुरोध (Passwordless Login)। |
| `/api/auth/verify-otp`| `POST` | OTP सत्यापित करता है और सफल होने पर JWT टोकन जारी करता है। |
| `/api/auth/reset-password`| `POST` | OTP सत्यापन के बाद उपयोगकर्ता पासवर्ड रीसेट करता है। |
| `/api/auth/logout` | `GET` | क्लाइंट को JWT टोकन हटाने का संकेत (signal) देता है। |

## 🛠️ 2. स्थानीय विकास सेटअप (Local Development Setup)

1.  **Dependencies इंस्टॉल करें:**
    ```bash
    npm install
    ```
2.  **Environment Variables कॉन्फ़िगर करें:**
    `.env` फ़ाइल को `template.env` से कॉपी करें और `PORT`, `DATABASE_URL`, `JWT_SECRET`, और ईमेल कॉन्फ़िगरेशन (`EMAIL_USER`, `EMAIL_PASS`) भरें।
3.  **एप्लिकेशन चलाएँ:**
    ```bash
    npm run dev
    ```
    API अब `http://localhost:<PORT>/api` पर उपलब्ध होगा।