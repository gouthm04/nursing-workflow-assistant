import { Request, Response } from "express";
import { loginUser, changePassword, } from "../services/auth.service";
import { AuthenticatedRequest } from "../middleware/auth.middleware";

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

export async function changePasswordController(
    req: AuthenticatedRequest,
    res: Response
) {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                message: "Current password and new password are required",
            });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({
                message: "New password must be at least 8 characters long",
            });
        }

        await changePassword(
            req.user!.user_id,
            currentPassword,
            newPassword
        );

        return res.json({
            message: "Password changed successfully",
        });
    } catch (error) {
        console.error("Change password error:", error);

        if (error instanceof Error) {
            if (error.message === "User not found") {
                return res.status(404).json({
                    message: error.message,
                });
            }

            if (error.message === "Current password is incorrect") {
                return res.status(401).json({
                    message: error.message,
                });
            }
        }

        return res.status(500).json({
            message: "Internal server error",
        });
    }
}