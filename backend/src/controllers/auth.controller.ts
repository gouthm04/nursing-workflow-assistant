import { Request, Response } from "express";
import { loginUser } from "../services/auth.service";

export async function login(req: Request, res: Response) {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                message: "Username and password are required"
            });
        }

        const user = await loginUser(username, password);

        if (!user) {
            return res.status(401).json({
                message: "Invalid username or password"
            });
        }

        return res.json({
            message: "Login successful",
            token: user.token,
            user: user.user
        });
    } catch (error) {
        console.error("Login error:", error);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
}