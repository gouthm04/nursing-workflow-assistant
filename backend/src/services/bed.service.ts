import pool from "../config/db";

export async function getBeds(wardId?: string) {
    const values: string[] = [];
    let query = `
        SELECT
            b.bed_id,
            b.bed_number,
            b.status,
            b.ward_id,
            w.ward_name,
            w.is_active AS ward_is_active
        FROM beds b
        JOIN wards w
            ON w.ward_id = b.ward_id
    `;

    if (wardId) {
        values.push(wardId);
        query += ` WHERE b.ward_id = $1`;
    }

    query += `
        ORDER BY
            w.ward_name,
            b.bed_number
    `;

    const result = await pool.query(query, values);

    return result.rows;
}

export async function createBed(
    wardId: string,
    bedNumber: string
) {
    const wardResult = await pool.query(
        `SELECT ward_id, is_active
         FROM wards
         WHERE ward_id = $1`,
        [wardId]
    );

    if (wardResult.rows.length === 0) {
        throw new Error("Ward not found");
    }

    if (!wardResult.rows[0].is_active) {
        throw new Error(
            "Cannot create a bed in an inactive ward"
        );
    }

    const existingBed = await pool.query(
        `SELECT bed_id
         FROM beds
         WHERE ward_id = $1
           AND LOWER(bed_number) = LOWER($2)`,
        [wardId, bedNumber]
    );

    if (existingBed.rows.length > 0) {
        throw new Error(
            "Bed number already exists in this ward"
        );
    }

    const result = await pool.query(
        `INSERT INTO beds (
            ward_id,
            bed_number,
            status
        )
        VALUES ($1, $2, 'AVAILABLE')
        RETURNING
            bed_id,
            ward_id,
            bed_number,
            status`,
        [
            wardId,
            bedNumber,
        ]
    );

    return result.rows[0];
}

export async function updateBedStatus(
    bedId: string,
    status: string
) {
    const allowedStatuses = [
        "AVAILABLE",
        "MAINTENANCE",
    ];

    if (!allowedStatuses.includes(status)) {
        throw new Error(
            "Invalid bed status"
        );
    }

    const bedResult = await pool.query(
        `SELECT
            bed_id,
            bed_number,
            ward_id,
            status
         FROM beds
         WHERE bed_id = $1`,
        [bedId]
    );

    if (bedResult.rows.length === 0) {
        throw new Error("Bed not found");
    }

    const bed = bedResult.rows[0];

    if (bed.status === "OCCUPIED") {
        throw new Error(
            "Occupied beds can only be released through patient discharge"
        );
    }

    const result = await pool.query(
        `UPDATE beds
         SET status = $1
         WHERE bed_id = $2
         RETURNING
            bed_id,
            ward_id,
            bed_number,
            status`,
        [
            status,
            bedId,
        ]
    );

    return result.rows[0];
}