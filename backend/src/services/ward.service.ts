import pool from "../config/db";

export async function getWards() {
    const result = await pool.query(
        `SELECT
            w.ward_id,
            w.ward_name,
            w.ward_type,
            w.is_active,
            COUNT(b.bed_id)::int AS bed_count,
            COUNT(b.bed_id) FILTER (
                WHERE b.status = 'AVAILABLE'
            )::int AS available_beds,
            COUNT(b.bed_id) FILTER (
                WHERE b.status = 'OCCUPIED'
            )::int AS occupied_beds,
            COUNT(b.bed_id) FILTER (
                WHERE b.status = 'MAINTENANCE'
            )::int AS maintenance_beds
         FROM wards w
         LEFT JOIN beds b
            ON b.ward_id = w.ward_id
         GROUP BY
            w.ward_id,
            w.ward_name,
            w.ward_type,
            w.is_active
         ORDER BY w.ward_name`
    );

    return result.rows;
}

export async function createWard(
    wardName: string,
    wardType?: string
) {
    const existingWard = await pool.query(
        `SELECT ward_id
         FROM wards
         WHERE LOWER(ward_name) = LOWER($1)`,
        [wardName]
    );

    if (existingWard.rows.length > 0) {
        throw new Error("Ward name already exists");
    }

    const result = await pool.query(
        `INSERT INTO wards (
            ward_name,
            ward_type,
            is_active
        )
        VALUES ($1, $2, TRUE)
        RETURNING
            ward_id,
            ward_name,
            ward_type,
            is_active`,
        [
            wardName,
            wardType || null,
        ]
    );

    return result.rows[0];
}

export async function updateWardStatus(
    wardId: string,
    isActive: boolean
) {
    const wardResult = await pool.query(
        `SELECT
            ward_id,
            ward_name,
            is_active
         FROM wards
         WHERE ward_id = $1`,
        [wardId]
    );

    if (wardResult.rows.length === 0) {
        throw new Error("Ward not found");
    }

    if (!isActive) {
        const occupiedResult = await pool.query(
            `SELECT COUNT(*)::int AS occupied_count
             FROM beds
             WHERE ward_id = $1
               AND status = 'OCCUPIED'`,
            [wardId]
        );

        if (occupiedResult.rows[0].occupied_count > 0) {
            throw new Error(
                "Cannot deactivate a ward with occupied beds"
            );
        }
    }

    const result = await pool.query(
        `UPDATE wards
         SET is_active = $1
         WHERE ward_id = $2
         RETURNING
            ward_id,
            ward_name,
            ward_type,
            is_active`,
        [isActive, wardId]
    );

    return result.rows[0];
}