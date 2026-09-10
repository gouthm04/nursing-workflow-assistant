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

-- PATIENTS
CREATE TABLE patients (
    patient_id BIGSERIAL PRIMARY KEY,
    uhid VARCHAR(30) UNIQUE NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50),
    date_of_birth DATE,
    gender VARCHAR(20),
    contact_number VARCHAR(20),
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- EMERGENCY CONTACTS
CREATE TABLE emergency_contacts (
    contact_id BIGSERIAL PRIMARY KEY,
    patient_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    relationship VARCHAR(50) NOT NULL,
    phone VARCHAR(20) NOT NULL,

    CONSTRAINT fk_emergency_contact_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(patient_id)
);

-- ADMISSIONS
CREATE TABLE admissions (
    admission_id BIGSERIAL PRIMARY KEY,
    patient_id BIGINT NOT NULL,
    doctor_id BIGINT NOT NULL,
    ward_id BIGINT NOT NULL,
    bed_id BIGINT NOT NULL,
    chief_complaint TEXT,
    payer_type VARCHAR(30),
    insurance_details TEXT,
    admission_datetime TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    discharge_datetime TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'ADMITTED',
    created_by BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_admission_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(patient_id),

    CONSTRAINT fk_admission_doctor
        FOREIGN KEY (doctor_id)
        REFERENCES doctors(doctor_id),

    CONSTRAINT fk_admission_ward
        FOREIGN KEY (ward_id)
        REFERENCES wards(ward_id),

    CONSTRAINT fk_admission_bed
        FOREIGN KEY (bed_id)
        REFERENCES beds(bed_id),

    CONSTRAINT fk_admission_creator
        FOREIGN KEY (created_by)
        REFERENCES users(user_id)
);

-- SHIFTS
CREATE TABLE shifts (
    shift_id BIGSERIAL PRIMARY KEY,
    shift_name VARCHAR(30) UNIQUE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_hours NUMERIC(4,2) NOT NULL
);

-- ROSTERS
CREATE TABLE rosters (
    roster_id BIGSERIAL PRIMARY KEY,
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    created_by BIGINT,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT fk_roster_creator
        FOREIGN KEY (created_by)
        REFERENCES users(user_id)
);

-- ROSTER ASSIGNMENTS
CREATE TABLE roster_assignments (
    assignment_id BIGSERIAL PRIMARY KEY,
    roster_id BIGINT NOT NULL,
    nurse_id BIGINT NOT NULL,
    ward_id BIGINT NOT NULL,
    shift_id BIGINT NOT NULL,
    shift_date DATE NOT NULL,

    CONSTRAINT fk_assignment_roster
        FOREIGN KEY (roster_id)
        REFERENCES rosters(roster_id),

    CONSTRAINT fk_assignment_nurse
        FOREIGN KEY (nurse_id)
        REFERENCES users(user_id),

    CONSTRAINT fk_assignment_ward
        FOREIGN KEY (ward_id)
        REFERENCES wards(ward_id),

    CONSTRAINT fk_assignment_shift
        FOREIGN KEY (shift_id)
        REFERENCES shifts(shift_id),

    CONSTRAINT uq_roster_assignment
        UNIQUE (roster_id, ward_id, shift_id, shift_date)
);

-- ROSTER OVERRIDES
CREATE TABLE roster_overrides (
    override_id BIGSERIAL PRIMARY KEY,
    assignment_id BIGINT NOT NULL,
    replacement_nurse_id BIGINT NOT NULL,
    reason TEXT NOT NULL,
    created_by BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_override_assignment
        FOREIGN KEY (assignment_id)
        REFERENCES roster_assignments(assignment_id),

    CONSTRAINT fk_override_replacement_nurse
        FOREIGN KEY (replacement_nurse_id)
        REFERENCES users(user_id),

    CONSTRAINT fk_override_creator
        FOREIGN KEY (created_by)
        REFERENCES users(user_id)
);

-- ROSTER RULES
CREATE TABLE roster_rules (
    rule_id BIGSERIAL PRIMARY KEY,
    minimum_rest_hours NUMERIC(4,2) NOT NULL,
    maximum_weekly_hours NUMERIC(5,2) NOT NULL
);

-- VITALS
CREATE TABLE vitals (
    vital_id BIGSERIAL PRIMARY KEY,
    admission_id BIGINT NOT NULL,
    recorded_by BIGINT NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL,
    systolic_bp SMALLINT,
    diastolic_bp SMALLINT,
    pulse_rate SMALLINT,
    spo2 NUMERIC(5,2),
    temperature NUMERIC(4,1),
    respiratory_rate SMALLINT,

    CONSTRAINT fk_vital_admission
        FOREIGN KEY (admission_id)
        REFERENCES admissions(admission_id),

    CONSTRAINT fk_vital_recorder
        FOREIGN KEY (recorded_by)
        REFERENCES users(user_id)
);

-- MEDICATION ADMINISTRATIONS
CREATE TABLE medication_administrations (
    medication_admin_id BIGSERIAL PRIMARY KEY,
    admission_id BIGINT NOT NULL,
    recorded_by BIGINT NOT NULL,
    drug_name VARCHAR(150) NOT NULL,
    dosage VARCHAR(50) NOT NULL,
    route VARCHAR(30) NOT NULL,
    administered_at TIMESTAMPTZ NOT NULL,
    notes TEXT,

    CONSTRAINT fk_medication_admission
        FOREIGN KEY (admission_id)
        REFERENCES admissions(admission_id),

    CONSTRAINT fk_medication_recorder
        FOREIGN KEY (recorded_by)
        REFERENCES users(user_id)
);

-- NURSING NOTES
CREATE TABLE nursing_notes (
    note_id BIGSERIAL PRIMARY KEY,
    admission_id BIGINT NOT NULL,
    recorded_by BIGINT NOT NULL,
    note_type VARCHAR(30) NOT NULL,
    content TEXT NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL,

    CONSTRAINT fk_note_admission
        FOREIGN KEY (admission_id)
        REFERENCES admissions(admission_id),

    CONSTRAINT fk_note_recorder
        FOREIGN KEY (recorded_by)
        REFERENCES users(user_id)
);

-- CLINICAL EVENTS
CREATE TABLE clinical_events (
    event_id BIGSERIAL PRIMARY KEY,
    admission_id BIGINT NOT NULL,
    recorded_by BIGINT NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    event_time TIMESTAMPTZ NOT NULL,
    description TEXT NOT NULL,
    doctor_notified BOOLEAN NOT NULL DEFAULT FALSE,
    doctor_id BIGINT,
    doctor_notification_time TIMESTAMPTZ,
    immediate_action TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_event_admission
        FOREIGN KEY (admission_id)
        REFERENCES admissions(admission_id),

    CONSTRAINT fk_event_recorder
        FOREIGN KEY (recorded_by)
        REFERENCES users(user_id),

    CONSTRAINT fk_event_doctor
        FOREIGN KEY (doctor_id)
        REFERENCES doctors(doctor_id)
);

-- CONSUMABLES
CREATE TABLE consumables (
    consumable_id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    unit VARCHAR(30) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- CONSUMABLE USAGE
CREATE TABLE consumable_usage (
    usage_id BIGSERIAL PRIMARY KEY,
    admission_id BIGINT NOT NULL,
    consumable_id BIGINT NOT NULL,
    quantity NUMERIC(10,2) NOT NULL,
    used_for_type VARCHAR(30),
    used_for_id BIGINT,
    recorded_by BIGINT NOT NULL,
    used_at TIMESTAMPTZ NOT NULL,

    CONSTRAINT fk_usage_admission
        FOREIGN KEY (admission_id)
        REFERENCES admissions(admission_id),

    CONSTRAINT fk_usage_consumable
        FOREIGN KEY (consumable_id)
        REFERENCES consumables(consumable_id),

    CONSTRAINT fk_usage_recorder
        FOREIGN KEY (recorded_by)
        REFERENCES users(user_id)
);

-- HANDOVERS
CREATE TABLE handovers (
    handover_id BIGSERIAL PRIMARY KEY,
    admission_id BIGINT NOT NULL,
    from_nurse_id BIGINT NOT NULL,
    to_nurse_id BIGINT NOT NULL,
    shift_start TIMESTAMPTZ NOT NULL,
    shift_end TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    acknowledged_at TIMESTAMPTZ,

    CONSTRAINT fk_handover_admission
        FOREIGN KEY (admission_id)
        REFERENCES admissions(admission_id),

    CONSTRAINT fk_handover_from_nurse
        FOREIGN KEY (from_nurse_id)
        REFERENCES users(user_id),

    CONSTRAINT fk_handover_to_nurse
        FOREIGN KEY (to_nurse_id)
        REFERENCES users(user_id)
);

-- HANDOVER CONTENT
CREATE TABLE handover_content (
    handover_content_id BIGSERIAL PRIMARY KEY,
    handover_id BIGINT NOT NULL UNIQUE,
    situation TEXT,
    background TEXT,
    assessment TEXT,
    recommendation TEXT,

    CONSTRAINT fk_handover_content_handover
        FOREIGN KEY (handover_id)
        REFERENCES handovers(handover_id)
);

