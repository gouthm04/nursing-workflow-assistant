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
            throw new Error(
                "Selected bed does not belong to the selected ward"
            );
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

        // 5. Replace temporary UHID with permanent generated UHID
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


/* =========================================================
   ACTIVE ADMISSIONS
   ========================================================= */

export async function getActiveAdmissions() {
    const result = await pool.query(
        `
        SELECT
            a.admission_id,
            p.patient_id,
            p.uhid,
            p.first_name,
            p.last_name,
            p.gender,
            p.date_of_birth::text AS date_of_birth,

            a.status,
            a.admission_datetime,
            a.chief_complaint,

            d.doctor_id,
            d.full_name AS doctor_name,

            w.ward_id,
            w.ward_name,

            b.bed_id,
            b.bed_number

        FROM admissions a

        JOIN patients p
            ON p.patient_id = a.patient_id

        JOIN doctors d
            ON d.doctor_id = a.doctor_id

        JOIN wards w
            ON w.ward_id = a.ward_id

        JOIN beds b
            ON b.bed_id = a.bed_id

        WHERE a.status IN ('ADMITTED', 'UNDER_CARE')

        ORDER BY
            a.admission_datetime DESC
        `
    );

    return result.rows.map((row) => ({
        admission_id: Number(row.admission_id),
        patient_id: Number(row.patient_id),

        uhid: row.uhid,
        first_name: row.first_name,
        last_name: row.last_name,
        gender: row.gender,
        date_of_birth: row.date_of_birth,

        status: row.status,
        admission_datetime: row.admission_datetime,
        chief_complaint: row.chief_complaint,

        doctor_id: Number(row.doctor_id),
        doctor_name: row.doctor_name,

        ward_id: Number(row.ward_id),
        ward_name: row.ward_name,

        bed_id: Number(row.bed_id),
        bed_number: row.bed_number,
    }));
}


/* =========================================================
   DISCHARGE
   ========================================================= */

export async function dischargeAdmission(admissionId: number) {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // Lock the admission so two discharge requests
        // cannot modify it simultaneously.
        const admissionResult = await client.query(
            `
            SELECT
                admission_id,
                patient_id,
                bed_id,
                status
            FROM admissions
            WHERE admission_id = $1
            FOR UPDATE
            `,
            [admissionId]
        );

        if (admissionResult.rows.length === 0) {
            throw new Error("Admission not found");
        }

        const admission = admissionResult.rows[0];

        if (
            admission.status !== "ADMITTED" &&
            admission.status !== "UNDER_CARE"
        ) {
            throw new Error("Patient is already discharged");
        }

        // Lock the bed as well.
        const bedResult = await client.query(
            `
            SELECT
                bed_id,
                status
            FROM beds
            WHERE bed_id = $1
            FOR UPDATE
            `,
            [admission.bed_id]
        );

        if (bedResult.rows.length === 0) {
            throw new Error("Admission bed not found");
        }

        const bed = bedResult.rows[0];

        if (bed.status !== "OCCUPIED") {
            throw new Error(
                "Admission bed is not currently marked as occupied"
            );
        }

        // Mark admission as discharged.
        const updatedAdmission = await client.query(
            `
            UPDATE admissions
            SET
                status = 'DISCHARGED',
                discharge_datetime = NOW()
            WHERE admission_id = $1
            RETURNING
                admission_id,
                patient_id,
                bed_id,
                status,
                discharge_datetime
            `,
            [admissionId]
        );

        // Release the bed.
        await client.query(
            `
            UPDATE beds
            SET status = 'AVAILABLE'
            WHERE bed_id = $1
            `,
            [admission.bed_id]
        );

        await client.query("COMMIT");

        const result = updatedAdmission.rows[0];

        return {
            admission_id: Number(result.admission_id),
            patient_id: Number(result.patient_id),
            bed_id: Number(result.bed_id),
            status: result.status,
            discharge_datetime: result.discharge_datetime,
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}