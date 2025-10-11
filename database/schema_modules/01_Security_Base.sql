/**
 * @fileoverview JIT/QC Management System - SCHEMA MODULE 01: SECURITY AND USER MANAGEMENT
 * @description यह मॉड्यूल भूमिका-आधारित एक्सेस कंट्रोल (RBAC) के लिए कोर संरचनाओं 
 * (Roles, Permissions, Users, OTP) को परिभाषित करता है।
 * यह सुनिश्चित करता है कि सिस्टम में डेटा एक्सेस और ऑडिटिंग के लिए एक मजबूत आधार हो।
 * @module 01_Security_Base.sql
 */

-- ----------------------------------------------------------------------
-- 1. Roles (भूमिकाएँ)
-- ----------------------------------------------------------------------

/**
 * @table roles
 * @description सिस्टम में विभिन्न उपयोगकर्ता भूमिकाओं को स्टोर करता है (उदा. Admin, QC Inspector, User)।
 * @property {SERIAL} role_id - प्राथमिक कुंजी (PK)।
 * @property {VARCHAR(50)} role_name - भूमिका का नाम (अनिवार्य और अद्वितीय)।
 * @property {TIMESTAMP WITH TIME ZONE} created_at - रिकॉर्ड निर्माण का समय।
 * @property {TIMESTAMP WITH TIME ZONE} updated_at - रिकॉर्ड अद्यतन (update) का अंतिम समय।
 */
CREATE TABLE IF NOT EXISTS roles (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------
-- 2. Permissions (अनुमतियाँ)
-- ----------------------------------------------------------------------

/**
 * @table permissions
 * @description व्यक्तिगत अनुमतियाँ (granular permissions) स्टोर करता है 
 * (उदा. 'parts:create', 'users:view')।
 * @property {SERIAL} permission_id - प्राथमिक कुंजी (PK)।
 * @property {VARCHAR(50)} permission_key - अनुमति कुंजी (अनिवार्य और अद्वितीय)।
 * @property {VARCHAR(255)} description - अनुमति का संक्षिप्त विवरण।
 * @property {TIMESTAMP WITH TIME ZONE} created_at - रिकॉर्ड निर्माण का समय।
 */
CREATE TABLE IF NOT EXISTS permissions (
    permission_id SERIAL PRIMARY KEY,
    permission_key VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------
-- 3. Role Permissions (भूमिका और अनुमति लिंक)
-- ----------------------------------------------------------------------

/**
 * @table role_permissions
 * @description एक जंक्शन तालिका (junction table) जो Roles और Permissions के बीच मेनी-टू-मेनी 
 * (many-to-many) संबंध को परिभाषित करती है।
 * @property {INTEGER} role_id - Roles तालिका से विदेशी कुंजी (FK)। CASCADE पर डिलीट।
 * @property {INTEGER} permission_id - Permissions तालिका से विदेशी कुंजी (FK)। CASCADE पर डिलीट।
 * @constraint PRIMARY KEY (role_id, permission_id) - संयुक्त प्राथमिक कुंजी।
 */
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INTEGER REFERENCES roles(role_id) ON DELETE CASCADE,
    permission_id INTEGER REFERENCES permissions(permission_id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- ----------------------------------------------------------------------
-- 4. Users (उपयोगकर्ता)
-- ----------------------------------------------------------------------

/**
 * @table users
 * @description सभी सिस्टम उपयोगकर्ताओं की जानकारी संग्रहीत करता है। 
 * यह अन्य तालिकाओं में audit columns (जैसे created_by) के लिए महत्वपूर्ण है।
 * @property {SERIAL} user_id - प्राथमिक कुंजी (PK)।
 * @property {VARCHAR(20)} employee_id - कर्मचारी ID (अद्वितीय)।
 * @property {VARCHAR(100)} email - उपयोगकर्ता ईमेल (अनिवार्य और अद्वितीय)।
 * @property {VARCHAR(20)} phone_number - फ़ोन नंबर (अद्वितीय)।
 * @property {VARCHAR(150)} full_name - उपयोगकर्ता का पूरा नाम (अनिवार्य)।
 * @property {INTEGER} role_id - उपयोगकर्ता की भूमिका (FK)। RESTRICT पर डिलीट।
 * @property {VARCHAR(255)} password_hash - संग्रहीत पासवर्ड हैश।
 * @property {BOOLEAN} is_active - क्या उपयोगकर्ता सक्रिय है (डिफ़ॉल्ट TRUE)।
 * @property {BOOLEAN} is_verified - क्या ईमेल सत्यापित है (डिफ़ॉल्ट FALSE)।
 * @property {TIMESTAMP WITH TIME ZONE} created_at - रिकॉर्ड निर्माण का समय।
 * @property {TIMESTAMP WITH TIME ZONE} updated_at - रिकॉर्ड अद्यतन (update) का अंतिम समय।
 */
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

-- ----------------------------------------------------------------------
-- 5. User OTP (वन-टाइम पासवर्ड)
-- ----------------------------------------------------------------------

/**
 * @table user_otp
 * @description उपयोगकर्ता सत्यापन (verification) या पासवर्ड रीसेट के लिए उत्पन्न OTP को संग्रहीत करता है।
 * @property {SERIAL} otp_id - प्राथमिक कुंजी (PK)।
 * @property {INTEGER} user_id - Users तालिका से विदेशी कुंजी (FK)। CASCADE पर डिलीट।
 * @property {VARCHAR(72)} otp_code - OTP हैश या कोड।
 * @property {TIMESTAMP WITH TIME ZONE} expires_at - OTP की समाप्ति का समय (Expiration time)।
 * @property {INTEGER} attempts - विफल प्रयासों की संख्या।
 * @property {TIMESTAMP WITH TIME ZONE} created_at - रिकॉर्ड निर्माण का समय।
 * @constraint fk_otp_user UNIQUE (user_id) - सुनिश्चित करता है कि एक उपयोगकर्ता का एक बार में केवल एक सक्रिय OTP हो।
 */
CREATE TABLE IF NOT EXISTS user_otp (
    otp_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE NOT NULL,
    otp_code VARCHAR(72) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_otp_user UNIQUE (user_id)
);