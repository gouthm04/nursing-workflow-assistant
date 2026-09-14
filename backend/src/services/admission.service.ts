import pool from "../config/db";

export async function getAdmissionOptions() {
    const doctorsResult = await pool.query(
        `SELECT
            doctor_id,
            full_name,
            specialization
         FROM doctors
         WHERE is_active = TRUE
         ORDER BY full_name`
    );

    const wardsResult = await pool.query(
        `SELECT
            ward_id,
            ward_name,
            ward_type
         FROM wards
         WHERE is_active = TRUE
         ORDER BY ward_name`
    );

    const bedsResult = await pool.query(
        `SELECT
            b.bed_id,
            b.bed_number,
            b.ward_id,
            w.ward_name
         FROM beds b
         JOIN wards w ON w.ward_id = b.ward_id
         WHERE b.status = 'AVAILABLE'
           AND w.is_active = TRUE
         ORDER BY w.ward_name, b.bed_number`
    );

    return {
        doctors: doctorsResult.rows,
        wards: wardsResult.rows,
        availableBeds: bedsResult.rows,
    };
}

type CreateAdmissionData = {
    firstName: string;
    lastName?: string;
    dateOfBirth?: string;
    gender?: string;
    contactNumber?: string;
    address?: string;

    emergencyContactName: string;
    emergencyContactRelationship: string;
    emergencyContactPhone: string;

    doctorId: string;
    wardId: string;
    bedId: string;
    chiefComplaint?: string;
    payerType?: string;
    insuranceDetails?: string;
};

export async function createAdmission(
    data: CreateAdmissionData,
    createdBy: string
) {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // 1. Check doctor
        const doctorResult = await client.query(
            `SELECT doctor_id
             FROM doctors
             WHERE doctor_id = $1
               AND is_active = TRUE`,
            [data.doctorId]
        );

        if (doctorResult.rows.length === 0) {
            throw new Error("Selected doctor is not available");
        }

        // 2. Check ward
        const wardResult = await client.query(
            `SELECT ward_id
             FROM wards
             WHERE ward_id = $1
               AND is_active = TRUE`,
            [data.wardId]
        );

        if (wardResult.rows.length === 0) {
            throw new Error("Selected ward is not available");
        }

        // 3. Lock and check bed
        const bedResult = await client.query(
            `SELECT bed_id, ward_id, status
             FROM beds
             WHERE bed_id = $1
             FOR UPDATE`,
            [data.bedId]
        );

        if (bedResult.rows.length === 0) {
            throw new Error("Selected bed does not exist");
        }

        const bed = bedResult.rows[0];

        if (String(bed.ward_id) !== String(data.wardId)) {
            throw new Error("Selected bed does not belong to the selected ward");
        }

        if (bed.status !== "AVAILABLE") {
            throw new Error("Selected bed is no longer available");
        }

        // 4. Create patient
        const patientResult = await client.query(
            `INSERT INTO patients (
                uhid,
                first_name,
                last_name,
                date_of_birth,
                gender,
                contact_number,
                address
            )
            VALUES (
                'TEMP-' || nextval('patients_patient_id_seq')::text,
                $1, $2, $3, $4, $5, $6
            )
            RETURNING patient_id`,
            [
                data.firstName,
                data.lastName || null,
                data.dateOfBirth || null,
                data.gender || null,
                data.contactNumber || null,
                data.address || null,
            ]
        );

        const patientId = patientResult.rows[0].patient_id;

        // 5. Replace temporary UHID with a permanent generated UHID
        const uhid = `UHID${String(patientId).padStart(6, "0")}`;

        await client.query(
            `UPDATE patients
             SET uhid = $1
             WHERE patient_id = $2`,
            [uhid, patientId]
        );

        // 6. Create emergency contact
        await client.query(
            `INSERT INTO emergency_contacts (
                patient_id,
                name,
                relationship,
                phone
            )
            VALUES ($1, $2, $3, $4)`,
            [
                patientId,
                data.emergencyContactName,
                data.emergencyContactRelationship,
                data.emergencyContactPhone,
            ]
        );

        // 7. Create admission
        const admissionResult = await client.query(
            `INSERT INTO admissions (
                patient_id,
                doctor_id,
                ward_id,
                bed_id,
                chief_complaint,
                payer_type,
                insurance_details,
                status,
                created_by
            )
            VALUES (
                $1, $2, $3, $4, $5, $6, $7,
                'ADMITTED',
                $8
            )
            RETURNING admission_id`,
            [
                patientId,
                data.doctorId,
                data.wardId,
                data.bedId,
                data.chiefComplaint || null,
                data.payerType || null,
                data.insuranceDetails || null,
                createdBy,
            ]
        );

        const admissionId = admissionResult.rows[0].admission_id;

        // 8. Occupy the bed
        await client.query(
            `UPDATE beds
             SET status = 'OCCUPIED'
             WHERE bed_id = $1`,
            [data.bedId]
        );

        await client.query("COMMIT");

        return {
            patientId,
            uhid,
            admissionId,
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}