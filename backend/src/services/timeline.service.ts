import pool from "../config/db";

export async function getPatientTimeline(
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

    // 2. Get vitals
    const vitalsResult = await pool.query(
        `
        SELECT
            v.vital_id,
            v.recorded_at,
            v.systolic_bp,
            v.diastolic_bp,
            v.pulse_rate,
            v.spo2,
            v.temperature,
            v.respiratory_rate,
            u.user_id,
            u.full_name
        FROM vitals v
        JOIN users u
            ON u.user_id = v.recorded_by
        WHERE v.admission_id = $1
        `,
        [admissionId]
    );

    // 3. Get medication administrations
    const medicationsResult = await pool.query(
        `
        SELECT
            m.medication_admin_id,
            m.administered_at,
            m.drug_name,
            m.dosage,
            m.route,
            m.notes,
            u.user_id,
            u.full_name
        FROM medication_administrations m
        JOIN users u
            ON u.user_id = m.recorded_by
        WHERE m.admission_id = $1
        `,
        [admissionId]
    );

    // 4. Get nursing notes
    const nursingNotesResult = await pool.query(
        `
        SELECT
            n.note_id,
            n.recorded_at,
            n.note_type,
            n.content,
            u.user_id,
            u.full_name
        FROM nursing_notes n
        JOIN users u
            ON u.user_id = n.recorded_by
        WHERE n.admission_id = $1
        `,
        [admissionId]
    );

    // 5. Get clinical events
    const clinicalEventsResult = await pool.query(
        `
        SELECT
            c.event_id,
            c.event_time,
            c.event_type,
            c.description,
            c.doctor_notified,
            c.doctor_id,
            c.doctor_notification_time,
            c.immediate_action,
            d.full_name AS doctor_name,
            u.user_id,
            u.full_name
        FROM clinical_events c
        JOIN users u
            ON u.user_id = c.recorded_by
        LEFT JOIN doctors d
            ON d.doctor_id = c.doctor_id
        WHERE c.admission_id = $1
        `,
        [admissionId]
    );

    // 6. Get consumable usage
    const consumablesResult = await pool.query(
        `
        SELECT
            cu.usage_id,
            cu.used_at,
            cu.quantity,
            cu.used_for_type,
            cu.used_for_id,
            c.name,
            c.unit,
            u.user_id,
            u.full_name
        FROM consumable_usage cu
        JOIN consumables c
            ON c.consumable_id = cu.consumable_id
        JOIN users u
            ON u.user_id = cu.recorded_by
        WHERE cu.admission_id = $1
        `,
        [admissionId]
    );

    // 7. Convert everything into one common timeline format
    const timeline = [
        ...vitalsResult.rows.map((row) => ({
            type: "VITAL",
            record_id: Number(row.vital_id),
            timestamp: row.recorded_at,
            title: "Vitals Recorded",
            details: {
                systolic_bp:
                    row.systolic_bp !== null
                        ? Number(row.systolic_bp)
                        : null,

                diastolic_bp:
                    row.diastolic_bp !== null
                        ? Number(row.diastolic_bp)
                        : null,

                pulse_rate:
                    row.pulse_rate !== null
                        ? Number(row.pulse_rate)
                        : null,

                spo2:
                    row.spo2 !== null
                        ? Number(row.spo2)
                        : null,

                temperature:
                    row.temperature !== null
                        ? Number(row.temperature)
                        : null,

                respiratory_rate:
                    row.respiratory_rate !== null
                        ? Number(row.respiratory_rate)
                        : null,
            },
            recorded_by: {
                user_id: Number(row.user_id),
                name: row.full_name,
            },
        })),

        ...medicationsResult.rows.map((row) => ({
            type: "MEDICATION",
            record_id: Number(row.medication_admin_id),
            timestamp: row.administered_at,
            title: "Medication Administered",
            details: {
                drug_name: row.drug_name,
                dosage: row.dosage,
                route: row.route,
                notes: row.notes,
            },
            recorded_by: {
                user_id: Number(row.user_id),
                name: row.full_name,
            },
        })),

        ...nursingNotesResult.rows.map((row) => ({
            type: "NURSING_NOTE",
            record_id: Number(row.note_id),
            timestamp: row.recorded_at,
            title: "Nursing Note",
            details: {
                note_type: row.note_type,
                content: row.content,
            },
            recorded_by: {
                user_id: Number(row.user_id),
                name: row.full_name,
            },
        })),

        ...clinicalEventsResult.rows.map((row) => ({
            type: "CLINICAL_EVENT",
            record_id: Number(row.event_id),
            timestamp: row.event_time,
            title: row.event_type,
            details: {
                description: row.description,
                doctor_notified: row.doctor_notified,
                doctor_id: row.doctor_id
                    ? Number(row.doctor_id)
                    : null,
                doctor_name: row.doctor_name ?? null,
                doctor_notification_time:
                    row.doctor_notification_time ?? null,
                immediate_action: row.immediate_action,
            },
            recorded_by: {
                user_id: Number(row.user_id),
                name: row.full_name,
            },
        })),

        ...consumablesResult.rows.map((row) => ({
            type: "CONSUMABLE",
            record_id: Number(row.usage_id),
            timestamp: row.used_at,
            title: "Consumable Used",
            details: {
                name: row.name,
                quantity: Number(row.quantity),
                unit: row.unit,
                used_for_type: row.used_for_type,
                used_for_id: row.used_for_id
                    ? Number(row.used_for_id)
                    : null,
            },
            recorded_by: {
                user_id: Number(row.user_id),
                name: row.full_name,
            },
        })),
    ];

    // 8. Sort newest → oldest
    timeline.sort(
        (a, b) =>
            new Date(b.timestamp).getTime() -
            new Date(a.timestamp).getTime()
    );

    return timeline;
}

