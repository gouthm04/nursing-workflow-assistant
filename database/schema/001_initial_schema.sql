-- ============================================
-- Nursing Workflow and Shift Handover Assistant
-- Initial Database Schema
-- PostgreSQL 16+
-- ============================================

-- USERS
CREATE TABLE users (
    user_id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(30) NOT NULL,
    phone VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- DOCTORS
CREATE TABLE doctors (
    doctor_id BIGSERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    specialization VARCHAR(100),
    phone VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- WARDS
CREATE TABLE wards (
    ward_id BIGSERIAL PRIMARY KEY,
    ward_name VARCHAR(100) UNIQUE NOT NULL,
    ward_type VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- BEDS
CREATE TABLE beds (
    bed_id BIGSERIAL PRIMARY KEY,
    ward_id BIGINT NOT NULL,

    bed_number VARCHAR(20) NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',

    CONSTRAINT fk_beds_ward
        FOREIGN KEY (ward_id)
        REFERENCES wards(ward_id),

    CONSTRAINT unique_bed_per_ward
        UNIQUE (ward_id, bed_number)
);
