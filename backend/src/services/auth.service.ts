import bcrypt from "bcrypt";
import pool from "../config/db";
import jwt from "jsonwebtoken";
import JWT_SECRET from "../config/auth";

export async function loginUser(username: string, password: string) {
    const result = await pool.query(
        `SELECT user_id, username, password_hash, full_name, role, is_active, must_change_password
         FROM users
         WHERE username = $1`,
        [username]
    );

    if (result.rows.length === 0) {
        return null;
    }

    const user = result.rows[0];

    if (!user.is_active) {
        return null;
    }

    const passwordMatches = await bcrypt.compare(
        password,
        user.password_hash
    );

    if (!passwordMatches) {
        return null;
    }

    const token = jwt.sign(
        {
            user_id: user.user_id,
            role: user.role
        },
        JWT_SECRET,
        {
            expiresIn: "8h"
        }
    );

    return {
        token,
        user: {
            user_id: user.user_id,
            username: user.username,
            full_name: user.full_name,
            role: user.role,
            must_change_password: user.must_change_password
        }
    };
}