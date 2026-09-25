import pool from "../config/db";

export async function getTodayAssignment(nurseId: number) {
    const result = await pool.query(
        `
        SELECT
            ra.assignment_id,
            ra.nurse_id,
            ra.ward_id,
            w.ward_name,
            ra.shift_id,
            s.shift_name,
            s.start_time,
            s.end_time,
            ra.shift_date::text AS shift_date,
            ra.is_primary,

            CASE
                WHEN ro.override_id IS NOT NULL
                    THEN TRUE
                ELSE FALSE
            END AS is_override,

            ro.replacement_nurse_id,
            ro.reason AS override_reason

        FROM roster_assignments ra

        JOIN rosters r
            ON r.roster_id = ra.roster_id

        JOIN wards w
            ON w.ward_id = ra.ward_id

        JOIN shifts s
            ON s.shift_id = ra.shift_id

        LEFT JOIN LATERAL (
            SELECT
                override_id,
                replacement_nurse_id,
                reason
            FROM roster_overrides
            WHERE assignment_id = ra.assignment_id
            ORDER BY created_at DESC
            LIMIT 1
        ) ro
            ON TRUE

        WHERE
            (
                ra.nurse_id = $1
                OR ro.replacement_nurse_id = $1
            )
            AND ra.shift_date = CURRENT_DATE

        ORDER BY
            s.start_time
        LIMIT 1
        `,
        [nurseId]
    );

    if (result.rows.length === 0) {
        return null;
    }

    const row = result.rows[0];

    return {
        assignment_id: Number(row.assignment_id),
        nurse_id: nurseId,
        ward_id: Number(row.ward_id),
        ward_name: row.ward_name,
        shift_id: Number(row.shift_id),
        shift_name: row.shift_name,
        start_time: row.start_time,
        end_time: row.end_time,
        shift_date: row.shift_date,
        is_primary: row.is_primary,
        is_override: row.is_override,
        replacement_nurse_id: row.replacement_nurse_id
            ? Number(row.replacement_nurse_id)
            : null,
        override_reason: row.override_reason ?? null,
    };
}

export async function getTodayPatients(nurseId: number) {
    const result = await pool.query(
        `
        SELECT
            a.admission_id,
            p.patient_id,
            p.uhid,
            p.first_name,
            p.last_name,
            p.date_of_birth::text AS date_of_birth,
            p.gender,
            b.bed_id,
            b.bed_number,
            w.ward_id,
            w.ward_name,
            d.doctor_id,
            d.full_name AS doctor_name,
            a.chief_complaint,
            a.status,
            a.admission_datetime

        FROM admissions a

        JOIN patients p
            ON p.patient_id = a.patient_id

        JOIN beds b
            ON b.bed_id = a.bed_id

        JOIN wards w
            ON w.ward_id = a.ward_id

        JOIN doctors d
            ON d.doctor_id = a.doctor_id

        WHERE
            a.ward_id = (
                SELECT ra.ward_id
                FROM roster_assignments ra

                JOIN rosters r
                    ON r.roster_id = ra.roster_id

                LEFT JOIN LATERAL (
                    SELECT
                        replacement_nurse_id
                    FROM roster_overrides
                    WHERE assignment_id = ra.assignment_id
                    ORDER BY created_at DESC
                    LIMIT 1
                ) ro
                    ON TRUE

                WHERE
                    (
                        ra.nurse_id = $1
                        OR ro.replacement_nurse_id = $1
                    )
                    AND ra.shift_date = CURRENT_DATE

                LIMIT 1
            )

            AND a.status IN ('ADMITTED', 'UNDER_CARE')

        ORDER BY
            b.bed_number;
        `,
        [nurseId]
    );

    return result.rows.map((row) => ({
        admission_id: Number(row.admission_id),
        patient_id: Number(row.patient_id),
        uhid: row.uhid,
        first_name: row.first_name,
        last_name: row.last_name,
        date_of_birth: row.date_of_birth,
        gender: row.gender,
        bed_id: Number(row.bed_id),
        bed_number: row.bed_number,
        ward_id: Number(row.ward_id),
        ward_name: row.ward_name,
        doctor_id: Number(row.doctor_id),
        doctor_name: row.doctor_name,
        chief_complaint: row.chief_complaint,
        status: row.status,
        admission_datetime: row.admission_datetime,
    }));
}

export async function getPatientWorkspace(
    nurseId: number,
    admissionId: number
) {
    const result = await pool.query(
        `
        SELECT
            a.admission_id,
            p.patient_id,
            p.uhid,
            p.first_name,
            p.last_name,
            p.date_of_birth::text AS date_of_birth,
            p.gender,
            p.contact_number,

            a.chief_complaint,
            a.status AS admission_status,
            a.admission_datetime,

            w.ward_id,
            w.ward_name,

            b.bed_id,
            b.bed_number,

            d.doctor_id,
            d.full_name AS doctor_name

        FROM admissions a

        JOIN patients p
            ON p.patient_id = a.patient_id

        JOIN wards w
            ON w.ward_id = a.ward_id

        JOIN beds b
            ON b.bed_id = a.bed_id

        JOIN doctors d
            ON d.doctor_id = a.doctor_id

        WHERE
            a.admission_id = $1

            AND a.status IN ('ADMITTED', 'UNDER_CARE')

            AND EXISTS (
                SELECT 1
                FROM roster_assignments ra

                JOIN rosters r
                    ON r.roster_id = ra.roster_id

                LEFT JOIN LATERAL (
                    SELECT
                        replacement_nurse_id
                    FROM roster_overrides
                    WHERE assignment_id = ra.assignment_id
                    ORDER BY created_at DESC
                    LIMIT 1
                ) ro
                    ON TRUE

                WHERE
                    (
                        ra.nurse_id = $2
                        OR ro.replacement_nurse_id = $2
                    )

                    AND ra.ward_id = a.ward_id
                    AND ra.shift_date = CURRENT_DATE
            )
        `,
        [admissionId, nurseId]
    );

    if (result.rows.length === 0) {
        return null;
    }

    const row = result.rows[0];

    return {
        admission_id: Number(row.admission_id),
        patient_id: Number(row.patient_id),

        uhid: row.uhid,
        first_name: row.first_name,
        last_name: row.last_name,
        date_of_birth: row.date_of_birth,
        gender: row.gender,
        contact_number: row.contact_number,

        chief_complaint: row.chief_complaint,
        admission_status: row.admission_status,
        admission_datetime: row.admission_datetime,

        ward_id: Number(row.ward_id),
        ward_name: row.ward_name,

        bed_id: Number(row.bed_id),
        bed_number: row.bed_number,

        doctor_id: Number(row.doctor_id),
        doctor_name: row.doctor_name,
    };
}