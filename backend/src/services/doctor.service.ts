import pool from "../config/db";

export async function getActiveDoctors() {
    const result = await pool.query<{
        doctor_id: number;
        full_name: string;
        specialization: string | null;
    }>(
        `SELECT
            doctor_id,
            full_name,
            specialization
         FROM doctors
         WHERE is_active = TRUE
         ORDER BY full_name ASC`
    );

    return result.rows.map((row) => ({
        doctor_id: Number(row.doctor_id),
        full_name: row.full_name,
        specialization: row.specialization,
    }));
}