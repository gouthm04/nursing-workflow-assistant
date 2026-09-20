import { Response } from "express";
import { createUser, getNurses, updateNurseStatus } from "../services/user.service";
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
export async function getNursesController(
    req: AuthenticatedRequest,
    res: Response
) {
    try {
        const nurses = await getNurses();

        return res.status(200).json({
            nurses
        });
    } catch (error) {
        console.error("Get nurses error:", error);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
}
export async function updateNurseStatusController(
    req: AuthenticatedRequest,
    res: Response
) {
    try {
        const nurseId = Number(req.params.id);
        const { isActive } = req.body;

        if (!Number.isInteger(nurseId)) {
            return res.status(400).json({
                message: "Invalid nurse ID"
            });
        }

        if (typeof isActive !== "boolean") {
            return res.status(400).json({
                message: "isActive must be a boolean"
            });
        }

        const nurse = await updateNurseStatus(
            nurseId,
            isActive
        );

        return res.status(200).json({
            message: isActive
                ? "Nurse activated successfully"
                : "Nurse deactivated successfully",
            nurse
        });
    } catch (error) {
        console.error("Update nurse status error:", error);

        if (
            error instanceof Error &&
            error.message === "Nurse not found"
        ) {
            return res.status(404).json({
                message: error.message
            });
        }

        return res.status(500).json({
            message: "Internal server error"
        });
    }
}