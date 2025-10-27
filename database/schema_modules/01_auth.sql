/**
 * Auth Module Schemas: Includes core RBAC tables, detailed User tracking, 
 * and the Admin-Approval Request table.
 * Note: All 'created_at' and 'updated_at' columns store TIMESTAMP WITH TIME ZONE.
 */

-- ❌ DROP TABLE statements are omitted (Principle H).

-- 1. ROLES Table (FKs Removed)
CREATE TABLE IF NOT EXISTS roles (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL,
    description VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER, 
    updated_at TIMESTAMP WITH TIME ZONE,
    updated_by INTEGER 
);

-- 2. PERMISSIONS Table (FKs Removed)
CREATE TABLE IF NOT EXISTS permissions (
    permission_id SERIAL PRIMARY KEY,
    permission_code VARCHAR(100) UNIQUE NOT NULL, 
    description VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER, 
    updated_at TIMESTAMP WITH TIME ZONE,
    updated_by INTEGER 
);


-- 3. USERS Table (FKs Removed)
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    employee_id VARCHAR(20) UNIQUE, 
    email VARCHAR(100) NOT NULL UNIQUE,
    phone_number VARCHAR(20) UNIQUE, 
    full_name VARCHAR(150) NOT NULL,
    password_hash VARCHAR(255),
    role_id INTEGER NOT NULL, -- FK Removed
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER, -- FK Removed
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER, -- FK Removed
    last_login_at TIMESTAMP WITH TIME ZONE
);

-- 4. REGISTRATION_REQUESTS Table (FKs Removed)
CREATE TABLE IF NOT EXISTS registration_requests (
    request_id SERIAL PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    justification_message TEXT, 
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(30) DEFAULT 'PENDING_VERIFICATION' CHECK (status IN ('PENDING_VERIFICATION', 'PENDING', 'APPROVED', 'REJECTED')),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    approved_by INTEGER, -- FK Removed
    processed_at TIMESTAMP WITH TIME ZONE 
);


-- 5. USER_OTP Table 
CREATE TABLE IF NOT EXISTS user_otp (
    otp_id SERIAL PRIMARY KEY,
    reference_id INTEGER NOT NULL, 
    otp_code VARCHAR(72) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_reference_id UNIQUE (reference_id)
);


-- 6. ROLE_PERMISSIONS Table (FKs Removed)
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INTEGER, -- FK Removed
    permission_id INTEGER, -- FK Removed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, 
    PRIMARY KEY (role_id, permission_id)
);

-- ❌ FOREIGN KEY ADDITIONS block REMOVED. Now consolidated in 07_foreign_keys.sql.