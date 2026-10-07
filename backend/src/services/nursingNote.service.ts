import pool from "../config/db";

type RecordNursingNoteData = {
    noteType: string;
    content: string;
};

export async function recordNursingNote(
    nurseId: number,
    admissionId: number,
    data: RecordNursingNoteData
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

    // 2. Record the nursing note
    const result = await pool.query(
        `
        INSERT INTO nursing_notes (
            admission_id,
            recorded_by,
            note_type,
            content,
            recorded_at
        )
        VALUES (
            $1,
            $2,
            $3,
            $4,
            NOW()
        )
        RETURNING
            note_id,
            admission_id,
            recorded_by,
            note_type,
            content,
            recorded_at
        `,
        [
            admissionId,
            nurseId,
            data.noteType,
            data.content,
        ]
    );

    const row = result.rows[0];

    return {
        note_id: Number(row.note_id),
        admission_id: Number(row.admission_id),
        recorded_by: Number(row.recorded_by),
        note_type: row.note_type,
        content: row.content,
        recorded_at: row.recorded_at,
    };
}

export async function getPatientNursingNotes(
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

    // 2. Get nursing note history
    const result = await pool.query(
        `
        SELECT
            note_id,
            admission_id,
            recorded_by,
            note_type,
            content,
            recorded_at
        FROM nursing_notes
        WHERE admission_id = $1
        ORDER BY recorded_at DESC
        `,
        [admissionId]
    );

    return result.rows.map((row) => ({
        note_id: Number(row.note_id),
        admission_id: Number(row.admission_id),
        recorded_by: Number(row.recorded_by),
        note_type: row.note_type,
        content: row.content,
        recorded_at: row.recorded_at,
    }));
}