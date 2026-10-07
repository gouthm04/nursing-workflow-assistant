import pool from "../config/db";

type RecordConsumableData = {
    consumableId: number;
    quantity: number;
    usedForType?: string;
    usedForId?: number;
};

export async function getActiveConsumables() {
    const result = await pool.query(
        `
        SELECT
            consumable_id,
            name,
            unit
        FROM consumables
        WHERE is_active = TRUE
        ORDER BY name ASC
        `
    );

    return result.rows.map((row) => ({
        consumable_id: Number(row.consumable_id),
        name: row.name,
        unit: row.unit,
    }));
}

export async function recordConsumableUsage(
    nurseId: number,
    admissionId: number,
    data: RecordConsumableData
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

    // 2. Verify that the consumable exists and is active.
    const consumableResult = await pool.query(
        `
        SELECT
            consumable_id,
            name,
            unit
        FROM consumables
        WHERE
            consumable_id = $1
            AND is_active = TRUE
        `,
        [data.consumableId]
    );

    if (consumableResult.rows.length === 0) {
        throw new Error(
            "Consumable not found or consumable is inactive"
        );
    }

    // 3. Record the consumable usage.
    const result = await pool.query(
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
            $5,
            $6,
            NOW()
        )
        RETURNING
            usage_id,
            admission_id,
            consumable_id,
            quantity,
            used_for_type,
            used_for_id,
            recorded_by,
            used_at
        `,
        [
            admissionId,
            data.consumableId,
            data.quantity,
            data.usedForType ?? null,
            data.usedForId ?? null,
            nurseId,
        ]
    );

    const row = result.rows[0];
    const consumable = consumableResult.rows[0];

    return {
        usage_id: Number(row.usage_id),
        admission_id: Number(row.admission_id),
        consumable_id: Number(row.consumable_id),
        consumable_name: consumable.name,
        unit: consumable.unit,
        quantity: Number(row.quantity),
        used_for_type: row.used_for_type,
        used_for_id: row.used_for_id,
        recorded_by: Number(row.recorded_by),
        used_at: row.used_at,
    };
}

export async function getPatientConsumableUsage(
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

    // 2. Get consumable usage history.
    const result = await pool.query(
        `
        SELECT
            cu.usage_id,
            cu.admission_id,
            cu.consumable_id,
            c.name AS consumable_name,
            c.unit,
            cu.quantity,
            cu.used_for_type,
            cu.used_for_id,
            cu.recorded_by,
            cu.used_at
        FROM consumable_usage cu

        JOIN consumables c
            ON c.consumable_id = cu.consumable_id

        WHERE cu.admission_id = $1

        ORDER BY cu.used_at DESC
        `,
        [admissionId]
    );

    return result.rows.map((row) => ({
        usage_id: Number(row.usage_id),
        admission_id: Number(row.admission_id),
        consumable_id: Number(row.consumable_id),
        consumable_name: row.consumable_name,
        unit: row.unit,
        quantity: Number(row.quantity),
        used_for_type: row.used_for_type,
        used_for_id: row.used_for_id,
        recorded_by: Number(row.recorded_by),
        used_at: row.used_at,
    }));
}