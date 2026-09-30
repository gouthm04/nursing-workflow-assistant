import pool from "../config/db";

type SaveVital = {
    systolic_bp: number | null;
    diastolic_bp: number | null;
    pulse_rate: number | null;
    spo2: number | null;
    temperature: number | null;
    respiratory_rate: number | null;
};

type SaveMedication = {
    drug_name: string;
    dosage: string;
    route: string;
    notes: string | null;
};

type SaveNursingNote = {
    note_type: string;
    content: string;
};

type SaveClinicalEvent = {
    event_type: string;
    description: string;
    immediate_action: string | null;
    doctor_notified: boolean;
};

type SaveConsumable = {
    name: string;
    quantity: number;
    used_for_type: string | null;
};

type SaveDocumentationData = {
    vitals: SaveVital[];
    medications: SaveMedication[];
    nursing_notes: SaveNursingNote[];
    clinical_events: SaveClinicalEvent[];
    consumables: SaveConsumable[];
};

export async function saveNursingDocumentation(
    nurseId: number,
    admissionId: number,
    data: SaveDocumentationData
) {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // 1. Verify that this nurse can currently access this patient.
        const accessResult = await client.query(
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

        const doctorId = accessResult.rows[0].doctor_id;

        // 2. Save vitals.
        for (const vital of data.vitals) {
            const hasValue = [
                vital.systolic_bp,
                vital.diastolic_bp,
                vital.pulse_rate,
                vital.spo2,
                vital.temperature,
                vital.respiratory_rate,
            ].some(
                (value) =>
                    value !== null &&
                    value !== undefined
            );

            if (!hasValue) {
                throw new Error(
                    "At least one vital sign is required"
                );
            }

            if (
                vital.spo2 !== null &&
                (vital.spo2 < 0 || vital.spo2 > 100)
            ) {
                throw new Error(
                    "SpO2 must be between 0 and 100"
                );
            }

            await client.query(
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
                `,
                [
                    admissionId,
                    nurseId,
                    vital.systolic_bp,
                    vital.diastolic_bp,
                    vital.pulse_rate,
                    vital.spo2,
                    vital.temperature,
                    vital.respiratory_rate,
                ]
            );
        }

        // 3. Save medication administrations.
        for (const medication of data.medications) {
            if (
                !medication.drug_name?.trim() ||
                !medication.dosage?.trim() ||
                !medication.route?.trim()
            ) {
                throw new Error(
                    "Medication drug name, dosage and route are required"
                );
            }

            await client.query(
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
                `,
                [
                    admissionId,
                    nurseId,
                    medication.drug_name.trim(),
                    medication.dosage.trim(),
                    medication.route.trim(),
                    medication.notes?.trim() || null,
                ]
            );
        }

        // 4. Save nursing notes.
        for (const note of data.nursing_notes) {
            if (
                !note.note_type?.trim() ||
                !note.content?.trim()
            ) {
                throw new Error(
                    "Nursing note type and content are required"
                );
            }

            await client.query(
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
                `,
                [
                    admissionId,
                    nurseId,
                    note.note_type.trim(),
                    note.content.trim(),
                ]
            );
        }

        // 5. Save clinical events.
        for (const event of data.clinical_events) {
            if (
                !event.event_type?.trim() ||
                !event.description?.trim()
            ) {
                throw new Error(
                    "Clinical event type and description are required"
                );
            }

            await client.query(
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
                `,
                [
                    admissionId,
                    nurseId,
                    event.event_type.trim(),
                    event.description.trim(),
                    event.doctor_notified,
                    event.doctor_notified ? doctorId : null,
                    event.immediate_action?.trim() || null,
                ]
            );
        }

        // 6. Save consumable usage.
        for (const consumable of data.consumables) {
            if (
                !consumable.name?.trim()
            ) {
                throw new Error(
                    "Consumable name is required"
                );
            }

            if (
                typeof consumable.quantity !== "number" ||
                !Number.isFinite(consumable.quantity) ||
                consumable.quantity <= 0
            ) {
                throw new Error(
                    "Consumable quantity must be greater than zero"
                );
            }

            // Resolve the AI-provided name to an actual
            // active consumable in the database.
            const consumableResult = await client.query(
                `
                SELECT
                    consumable_id
                FROM consumables
                WHERE
                    is_active = TRUE
                    AND LOWER(name) = LOWER($1)
                `,
                [consumable.name.trim()]
            );

            if (consumableResult.rows.length === 0) {
                throw new Error(
                    `Consumable not found or inactive: ${consumable.name}`
                );
            }

            const consumableId =
                consumableResult.rows[0].consumable_id;

            await client.query(
                `
                INSERT INTO consumable_usage (
                    admission_id,
                    consumable_id,
                    quantity,
                    used_for_type,
                    used_for_id,
                    recorded_by,
                    used_at
                )
                VALUES (
                    $1,
                    $2,
                    $3,
                    $4,
                    NULL,
                    $5,
                    NOW()
                )
                `,
                [
                    admissionId,
                    consumableId,
                    consumable.quantity,
                    consumable.used_for_type?.trim() || null,
                    nurseId,
                ]
            );
        }

        await client.query("COMMIT");

        return {
            success: true,
            saved: {
                vitals: data.vitals.length,
                medications: data.medications.length,
                nursing_notes: data.nursing_notes.length,
                clinical_events: data.clinical_events.length,
                consumables: data.consumables.length,
            },
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}
