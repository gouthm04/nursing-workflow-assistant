import { Request, Response } from "express";
import {
    getShifts,
    createRoster,
    createRosterAssignment,
    getRosterById,
    getRosters,


} from "../services/roster.service";
import { AuthenticatedRequest } from "../middleware/auth.middleware";

export async function getShiftsController(
    req: AuthenticatedRequest,
    res: Response
) {
    try {
        const shifts = await getShifts();

        return res.status(200).json({
            shifts,
        });
    } catch (error) {
        console.error("Get shifts error:", error);

        return res.status(500).json({
            message: "Internal server error",
        });
    }
}

export async function createRosterController(
    req: AuthenticatedRequest,
    res: Response
) {
    try {
        const { weekStartDate } = req.body;

        if (!weekStartDate) {
            return res.status(400).json({
                message:
                    "Week start date is required",
            });
        }

        const roster = await createRoster(
            weekStartDate,
            req.user!.user_id
        );

        return res.status(201).json({
            message: "Roster created successfully",
            roster,
        });
    } catch (error) {
        console.error(
            "Create roster error:",
            error
        );

        if (error instanceof Error) {
            if (
                error.message ===
                    "Invalid week start date" ||
                error.message ===
                    "Roster week must start on a Monday" ||
                error.message ===
                    "A roster already exists for this week"
            ) {
                return res.status(400).json({
                    message: error.message,
                });
            }
        }

        return res.status(500).json({
            message: "Internal server error",
        });
    }
}

export async function createRosterAssignmentController(
    req: Request,
    res: Response
) {
    try {
        const rosterId = Number(req.body.rosterId);
        const nurseId = Number(req.body.nurseId);
        const wardId = Number(req.body.wardId);
        const shiftId = Number(req.body.shiftId);
        const shiftDate = String(req.body.shiftDate);

        if (
            !Number.isInteger(rosterId) ||
            !Number.isInteger(nurseId) ||
            !Number.isInteger(wardId) ||
            !Number.isInteger(shiftId) ||
            !shiftDate
        ) {
            return res.status(400).json({
                message:
                    "rosterId, nurseId, wardId, shiftId and shiftDate are required"
            });
        }

        const assignment = await createRosterAssignment(
            rosterId,
            nurseId,
            wardId,
            shiftId,
            shiftDate,
            false
        );

        return res.status(201).json({
            message: "Roster assignment created successfully",
            assignment
        });

    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : "Failed to create roster assignment";

        const validationErrors = [
            "Roster not found",
            "Assignments can only be added to a DRAFT roster",
            "Shift date must belong to the roster week",
            "Nurse not found",
            "Selected user is not a nurse",
            "Nurse is inactive",
            "Ward not found",
            "Ward is inactive",
            "Shift not found",
            "A primary nurse is already assigned to this ward, shift and date",
            "Nurse already has an overlapping shift",
            "Nurse must have at least 16 hours of rest between shifts",
            "Roster rules are not configured",
            "Nurse cannot be assigned more than"
        ];

        const isValidationError = validationErrors.some(
            (errorMessage) => message.startsWith(errorMessage)
        );

        return res.status(isValidationError ? 400 : 500).json({
            message
        });
    }
}

export async function getRosterByIdController(
    req: Request,
    res: Response
) {
    try {
        const rosterId = Number(req.params.id);

        if (!Number.isInteger(rosterId)) {
            return res.status(400).json({
                message: "Invalid roster ID"
            });
        }

        const roster = await getRosterById(rosterId);

        return res.status(200).json({
            roster
        });

    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : "Failed to retrieve roster";

        if (message === "Roster not found") {
            return res.status(404).json({
                message
            });
        }

        return res.status(500).json({
            message
        });
    }
}

export async function getRostersController(
    req: Request,
    res: Response
) {
    try {
        const rosters = await getRosters();

        return res.status(200).json({
            rosters
        });
    } catch (error) {
        console.error("Error retrieving rosters:", error);

        return res.status(500).json({
            message: "Failed to retrieve rosters"
        });
    }
}