import { Response } from "express";
import { createUser } from "../services/user.service";
import { AuthenticatedRequest } from "../middleware/auth.middleware";

export async function createUserController(
    req: AuthenticatedRequest,
    res: Response
) {
    try {
        const { fullName, username, role } = req.body;

        if (!fullName || !username || !role) {
            return res.status(400).json({
                message:
                    "Full name, username and role are required"
            });
        }

        const result = await createUser(
            fullName,
            username,
            role,
            req.user!.role
        );

        return res.status(201).json({
            message: "User created successfully",
            user: result.user,
            temporaryPassword: result.temporaryPassword
        });
    } catch (error) {
        console.error("Create user error:", error);

        if (error instanceof Error) {
            if (
                error.message ===
                "You are not allowed to create this type of user"
            ) {
                return res.status(403).json({
                    message: error.message
                });
            }

            if (error.message === "Username already exists") {
                return res.status(409).json({
                    message: error.message
                });
            }
        }

        return res.status(500).json({
            message: "Internal server error"
        });
    }
}