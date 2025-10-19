/**
 * Auth Module Schemas: Includes core RBAC tables, detailed User tracking, 
 * and the Admin-Approval Request table.
 * Note: All 'created_at' and 'updated_at' columns store TIMESTAMP WITH TIME ZONE.
 */

-- DROP TABLES (Order matters due to Foreign Keys)
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS user_otp CASCADE;
DROP TABLE IF EXISTS registration_requests CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS roles CASCADE;


-- 1. ROLES Table
CREATE TABLE roles (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL,
    description VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Audit Columns
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER, 
    updated_at TIMESTAMP WITH TIME ZONE,
    updated_by INTEGER 
);

-- 2. PERMISSIONS Table
CREATE TABLE permissions (
    permission_id SERIAL PRIMARY KEY,
    permission_code VARCHAR(100) UNIQUE NOT NULL, 
    description VARCHAR(255),
    
    -- Audit Columns
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER, 
    updated_at TIMESTAMP WITH TIME ZONE,
    updated_by INTEGER 
);


-- 3. USERS Table 
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    employee_id VARCHAR(20) UNIQUE, 
    email VARCHAR(100) NOT NULL UNIQUE,
    phone_number VARCHAR(20) UNIQUE, 
    full_name VARCHAR(150) NOT NULL,
    password_hash VARCHAR(255),
    role_id INTEGER REFERENCES roles(role_id) ON DELETE RESTRICT NOT NULL,
    
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE, 
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL, 
    last_login_at TIMESTAMP WITH TIME ZONE
);

-- 4. REGISTRATION_REQUESTS Table
CREATE TABLE registration_requests (
    request_id SERIAL PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    justification_message TEXT, 
    password_hash VARCHAR(255) NOT NULL,
    
    status VARCHAR(30) DEFAULT 'PENDING_VERIFICATION' CHECK (status IN ('PENDING_VERIFICATION', 'PENDING', 'APPROVED', 'REJECTED')),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    approved_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL, 
    
    processed_at TIMESTAMP WITH TIME ZONE 
);


-- 5. USER_OTP Table 
CREATE TABLE user_otp (
    otp_id SERIAL PRIMARY KEY,
    reference_id INTEGER NOT NULL, 
    
    otp_code VARCHAR(72) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_reference_id UNIQUE (reference_id)
);


-- 6. ROLE_PERMISSIONS Table (Links Roles to Permissions)
CREATE TABLE role_permissions (
    role_id INTEGER REFERENCES roles(role_id) ON DELETE CASCADE,
    permission_id INTEGER REFERENCES permissions(permission_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, -- FIX: Added missing column
    PRIMARY KEY (role_id, permission_id)
);

-- 7. FOREIGN KEY ADDITIONS for Audit Columns
-- We must do this after the users table is created to avoid self-referencing FK issues

-- Roles Audit Keys
ALTER TABLE roles 
ADD CONSTRAINT fk_roles_created_by FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL,
ADD CONSTRAINT fk_roles_updated_by FOREIGN KEY (updated_by) REFERENCES users(user_id) ON DELETE SET NULL;

-- Permissions Audit Keys
ALTER TABLE permissions 
ADD CONSTRAINT fk_perms_created_by FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL,
ADD CONSTRAINT fk_perms_updated_by FOREIGN KEY (updated_by) REFERENCES users(user_id) ON DELETE SET NULL;