import bcrypt from "bcrypt";
import crypto from "crypto";
import pool from "../config/db";

function generateTemporaryPassword(): string {
    const randomPart = crypto
        .randomBytes(8)
        .toString("base64url");

    return `Nur@${randomPart}`;
}

export async function createUser(
    fullName: string,
    username: string,
    role: string,
    creatorRole: string
) {
    // Check whether the creator is allowed to create this role
    const allowedCreation: Record<string, string[]> = {
        SUPER_ADMIN: [
            "NURSE_SUPERVISOR",
            "RECEPTIONIST"
        ],
        NURSE_SUPERVISOR: [
            "NURSE"
        ]
    };

    const allowedRoles = allowedCreation[creatorRole] || [];

    if (!allowedRoles.includes(role)) {
        throw new Error(
            "You are not allowed to create this type of user"
        );
    }

    // Check whether username already exists
    const existingUser = await pool.query(
        `SELECT user_id
         FROM users
         WHERE username = $1`,
        [username]
    );

    if (existingUser.rows.length > 0) {
        throw new Error("Username already exists");
    }

    // Generate a temporary password on the server
    const temporaryPassword = generateTemporaryPassword();

    // Hash the temporary password
    const passwordHash = await bcrypt.hash(
        temporaryPassword,
        10
    );

    // Create the user
    const result = await pool.query(
        `INSERT INTO users
            (
                username,
                password_hash,
                full_name,
                role,
                is_active,
                must_change_password
            )
         VALUES
            ($1, $2, $3, $4, TRUE, TRUE)
         RETURNING
            user_id,
            username,
            full_name,
            role,
            is_active,
            must_change_password,
            created_at`,
        [
            username,
            passwordHash,
            fullName,
            role
        ]
    );

    return {
        user: result.rows[0],
        temporaryPassword
    };
}

export async function getNurses() {
    const result = await pool.query(
        `SELECT
            user_id,
            username,
            full_name,
            role,
            phone,
            is_active,
            must_change_password,
            created_at
         FROM users
         WHERE role = 'NURSE'
         ORDER BY full_name ASC`
    );

    return result.rows;
}
export async function updateNurseStatus(
    nurseId: number,
    isActive: boolean
) {
    const result = await pool.query(
        `UPDATE users
         SET is_active = $1
         WHERE user_id = $2
           AND role = 'NURSE'
         RETURNING
            user_id,
            username,
            full_name,
            role,
            phone,
            is_active,
            must_change_password,
            created_at`,
        [isActive, nurseId]
    );

    if (result.rows.length === 0) {
        throw new Error("Nurse not found");
    }

    return result.rows[0];
}