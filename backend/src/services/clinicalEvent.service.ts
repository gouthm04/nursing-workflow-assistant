import pool from "../config/db";

type RecordClinicalEventData = {
    eventType: string;
    description: string;
    immediateAction?: string;
    doctorNotified: boolean;
};

export async function recordClinicalEvent(
    nurseId: number,
    admissionId: number,
    data: RecordClinicalEventData
) {
    // 1. Verify that the admission is accessible
    //    to this nurse today and get the patient's doctor.
    const accessResult = await pool.query(
        `
        SELECT
            a.admission_id,
            a.doctor_id
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

    const doctorId = data.doctorNotified
        ? accessResult.rows[0].doctor_id
        : null;

    // 2. Record the clinical event.
    const result = await pool.query(
        `
        INSERT INTO clinical_events (
            admission_id,
            recorded_by,
            event_type,
            event_time,
            description,
            doctor_notified,
            doctor_id,
            doctor_notification_time,
            immediate_action
        )
        VALUES (
            $1,
            $2,
            $3,
            NOW(),
            $4,
            $5,
            $6,
            CASE
                WHEN $5 = TRUE THEN NOW()
                ELSE NULL
            END,
            $7
        )
        RETURNING
            event_id,
            admission_id,
            recorded_by,
            event_type,
            event_time,
            description,
            doctor_notified,
            doctor_id,
            doctor_notification_time,
            immediate_action
        `,
        [
            admissionId,
            nurseId,
            data.eventType,
            data.description,
            data.doctorNotified,
            doctorId,
            data.immediateAction ?? null,
        ]
    );

    const row = result.rows[0];

    return {
        event_id: Number(row.event_id),
        admission_id: Number(row.admission_id),
        recorded_by: Number(row.recorded_by),
        event_type: row.event_type,
        event_time: row.event_time,
        description: row.description,
        doctor_notified: row.doctor_notified,
        doctor_id:
            row.doctor_id !== null
                ? Number(row.doctor_id)
                : null,
        doctor_notification_time:
            row.doctor_notification_time,
        immediate_action: row.immediate_action,
    };
}

export async function getPatientClinicalEvents(
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

    // 2. Get clinical event history.
    const result = await pool.query(
        `
        SELECT
            ce.event_id,
            ce.admission_id,
            ce.recorded_by,
            ce.event_type,
            ce.event_time,
            ce.description,
            ce.doctor_notified,
            ce.doctor_id,
            d.full_name AS doctor_name,
            ce.doctor_notification_time,
            ce.immediate_action
        FROM clinical_events ce
        LEFT JOIN doctors d
            ON d.doctor_id = ce.doctor_id
        WHERE ce.admission_id = $1
        ORDER BY ce.event_time DESC
        `,
        [admissionId]
    );

    return result.rows.map((row) => ({
        event_id: Number(row.event_id),
        admission_id: Number(row.admission_id),
        recorded_by: Number(row.recorded_by),
        event_type: row.event_type,
        event_time: row.event_time,
        description: row.description,
        doctor_notified: row.doctor_notified,
        doctor_id:
            row.doctor_id !== null
                ? Number(row.doctor_id)
                : null,
        doctor_name: row.doctor_name,
        doctor_notification_time:
            row.doctor_notification_time,
        immediate_action: row.immediate_action,
    }));
}