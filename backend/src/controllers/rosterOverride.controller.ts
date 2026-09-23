import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { createRosterOverride } from "../services/roster.service";

export async function createRosterOverrideController(
    req: AuthenticatedRequest,
    res: Response
) {
    try {
        const assignmentId = Number(req.body.assignmentId);
        const replacementNurseId = Number(req.body.replacementNurseId);
        const reason = String(req.body.reason ?? "").trim();

        if (!req.user) {
            return res.status(401).json({
                message: "Authentication required"
            });
        }

        const createdBy = Number(req.user.user_id);

        if (
            !Number.isInteger(assignmentId) ||
            !Number.isInteger(replacementNurseId) ||
            !Number.isInteger(createdBy) ||
            !reason
        ) {
            return res.status(400).json({
                message: "Assignment, replacement nurse and reason are required"
            });
        }

        const override = await createRosterOverride(
            assignmentId,
            replacementNurseId,
            reason,
            createdBy
        );

        return res.status(201).json({
            message: "Roster override created successfully",
            override
        });
    } catch (error) {
        console.error("Create roster override error:", error);

        const message =
            error instanceof Error
                ? error.message
                : "Failed to create roster override";

        const validationErrors = [
            "Roster assignment not found",
            "Overrides can only be created for a DRAFT roster",
            "Replacement nurse not found",
            "Selected user is not a nurse",
            "Replacement nurse is inactive",
            "Override reason is required",
            "Replacement nurse is already assigned to this shift and date",
            "Shift not found",
            "Nurse already has an overlapping shift",
            "Nurse must have at least 16 hours of rest between shifts",
            "Roster rules are not configured"
        ];

        if (
            validationErrors.some(
                (errorMessage) => message === errorMessage
            ) ||
            message.startsWith("Nurse cannot be assigned more than")
        ) {
            return res.status(400).json({
                message
            });
        }

        return res.status(500).json({
            message: "Internal server error"
        });
    }
}