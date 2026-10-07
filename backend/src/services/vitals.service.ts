import pool from "../config/db";

type RecordVitalsData = {
    systolicBp?: number;
    diastolicBp?: number;
    pulseRate?: number;
    spo2?: number;
    temperature?: number;
    respiratoryRate?: number;
};

export async function recordVitals(
    nurseId: number,
    admissionId: number,
    data: RecordVitalsData
) {
    // 1. Verify that the admission is accessible
    //    to this nurse today.
    const accessResult = await pool.query(
        `
        SELECT
            a.admission_id
        FROM admissions a

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
                    AND r.status = 'PUBLISHED'
                    AND ra.shift_date = CURRENT_DATE
            )
        `,
        [admissionId, nurseId]
    );

    if (accessResult.rows.length === 0) {
        throw new Error(
            "Patient not found or patient is not accessible to this nurse"
        );
    }

    // 2. Record the vital
    const result = await pool.query(
        `
        INSERT INTO vitals (
            admission_id,
            recorded_by,
            recorded_at,
            systolic_bp,
            diastolic_bp,
            pulse_rate,
            spo2,
            temperature,
            respiratory_rate
        )
        VALUES (
            $1,
            $2,
            NOW(),
            $3,
            $4,
            $5,
            $6,
            $7,
            $8
        )
        RETURNING
            vital_id,
            admission_id,
            recorded_by,
            recorded_at,
            systolic_bp,
            diastolic_bp,
            pulse_rate,
            spo2,
            temperature,
            respiratory_rate
        `,
        [
            admissionId,
            nurseId,
            data.systolicBp ?? null,
            data.diastolicBp ?? null,
            data.pulseRate ?? null,
            data.spo2 ?? null,
            data.temperature ?? null,
            data.respiratoryRate ?? null,
        ]
    );

    const row = result.rows[0];

    return {
        vital_id: Number(row.vital_id),
        admission_id: Number(row.admission_id),
        recorded_by: Number(row.recorded_by),
        recorded_at: row.recorded_at,
        systolic_bp: row.systolic_bp,
        diastolic_bp: row.diastolic_bp,
        pulse_rate: row.pulse_rate,
        spo2: row.spo2,
        temperature: row.temperature,
        respiratory_rate: row.respiratory_rate,
    };
}export async function getPatientVitals(
    nurseId: number,
    admissionId: number
) {
    const accessResult = await pool.query(
        `
        SELECT
            a.admission_id
        FROM admissions a

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
                    AND r.status = 'PUBLISHED'
                    AND ra.shift_date = CURRENT_DATE
            )
        `,
        [admissionId, nurseId]
    );

    if (accessResult.rows.length === 0) {
        throw new Error(
            "Patient not found or patient is not accessible to this nurse"
        );
    }

    const result = await pool.query(
        `
        SELECT
            vital_id,
            admission_id,
            recorded_by,
            recorded_at,
            systolic_bp,
            diastolic_bp,
            pulse_rate,
            spo2,
            temperature,
            respiratory_rate
        FROM vitals
        WHERE admission_id = $1
        ORDER BY recorded_at DESC
        `,
        [admissionId]
    );

    return result.rows.map((row) => ({
        vital_id: Number(row.vital_id),
        admission_id: Number(row.admission_id),
        recorded_by: Number(row.recorded_by),
        recorded_at: row.recorded_at,
        systolic_bp: row.systolic_bp,
        diastolic_bp: row.diastolic_bp,
        pulse_rate: row.pulse_rate,
        spo2: row.spo2,
        temperature: row.temperature,
        respiratory_rate: row.respiratory_rate,
    }));
}