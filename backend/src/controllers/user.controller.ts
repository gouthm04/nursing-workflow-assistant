import { Request, Response } from "express";
import { createUser } from "../services/user.service";
import { AuthenticatedRequest } from "../middleware/auth.middleware";

export async function createUserController(
    req: AuthenticatedRequest,
    res: Response
) {
    try {
        const { fullName, username, role, temporaryPassword } = req.body;

        if (!fullName || !username || !role || !temporaryPassword) {
            return res.status(400).json({
                message:
                    "Full name, username, role and temporary password are required"
            });
        }

        const createdUser = await createUser(
            fullName,
            username,
            role,
            temporaryPassword,
            req.user!.role
        );

        return res.status(201).json({
            message: "User created successfully",
            user: createdUser
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