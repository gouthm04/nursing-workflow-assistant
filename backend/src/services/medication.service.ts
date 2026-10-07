import pool from "../config/db";

type RecordMedicationData = {
    drugName: string;
    dosage: string;
    route: string;
    notes?: string;
};

export async function recordMedicationAdministration(
    nurseId: number,
    admissionId: number,
    data: RecordMedicationData
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

    // 2. Record the medication administration
    const result = await pool.query(
        `
        INSERT INTO medication_administrations (
            admission_id,
            recorded_by,
            drug_name,
            dosage,
            route,
            administered_at,
            notes
        )
        VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            NOW(),
            $6
        )
        RETURNING
            medication_admin_id,
            admission_id,
            recorded_by,
            drug_name,
            dosage,
            route,
            administered_at,
            notes
        `,
        [
            admissionId,
            nurseId,
            data.drugName,
            data.dosage,
            data.route,
            data.notes ?? null,
        ]
    );

    const row = result.rows[0];

    return {
        medication_admin_id: Number(
            row.medication_admin_id
        ),
        admission_id: Number(row.admission_id),
        recorded_by: Number(row.recorded_by),
        drug_name: row.drug_name,
        dosage: row.dosage,
        route: row.route,
        administered_at: row.administered_at,
        notes: row.notes,
    };
}

export async function getPatientMedicationAdministrations(
    nurseId: number,
    admissionId: number
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

    // 2. Get medication administration history
    const result = await pool.query(
        `
        SELECT
            medication_admin_id,
            admission_id,
            recorded_by,
            drug_name,
            dosage,
            route,
            administered_at,
            notes
        FROM medication_administrations
        WHERE admission_id = $1
        ORDER BY administered_at DESC
        `,
        [admissionId]
    );

    return result.rows.map((row) => ({
        medication_admin_id: Number(
            row.medication_admin_id
        ),
        admission_id: Number(row.admission_id),
        recorded_by: Number(row.recorded_by),
        drug_name: row.drug_name,
        dosage: row.dosage,
        route: row.route,
        administered_at: row.administered_at,
        notes: row.notes,
    }));
}