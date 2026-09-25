import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import {
    getTodayAssignment,
    getTodayPatients,
    getPatientWorkspace,
} from "../services/nurse.service";

export async function getTodayAssignmentController(
    req: AuthenticatedRequest,
    res: Response
) {
    try {
        if (!req.user) {
            return res.status(401).json({
                message: "Authentication required"
            });
        }

        const nurseId = Number(req.user.user_id);

        if (!Number.isInteger(nurseId)) {
            return res.status(401).json({
                message: "Invalid user identity"
            });
        }

        const assignment = await getTodayAssignment(nurseId);

        return res.status(200).json({
            assignment
        });

    } catch (error) {
        console.error(
            "Get nurse today assignment error:",
            error
        );

        return res.status(500).json({
            message: "Internal server error"
        });
    }
}

export async function getTodayPatientsController(
    req: AuthenticatedRequest,
    res: Response
) {
    try {
        if (!req.user) {
            return res.status(401).json({
                message: "Authentication required",
            });
        }

        const nurseId = Number(req.user.user_id);

        if (!Number.isInteger(nurseId)) {
            return res.status(401).json({
                message: "Invalid user identity",
            });
        }

        const patients = await getTodayPatients(nurseId);

        return res.status(200).json({
            patients,
        });

    } catch (error) {
        console.error(
            "Get nurse patients error:",
            error
        );

        return res.status(500).json({
            message: "Internal server error",
        });
    }
}
export async function getPatientWorkspaceController(
    req: AuthenticatedRequest,
    res: Response
) {
    try {
        if (!req.user) {
            return res.status(401).json({
                message: "Authentication required",
            });
        }

        const nurseId = Number(req.user.user_id);
        const admissionId = Number(req.params.admissionId);

        if (!Number.isInteger(nurseId)) {
            return res.status(401).json({
                message: "Invalid user identity",
            });
        }

        if (!Number.isInteger(admissionId)) {
            return res.status(400).json({
                message: "Invalid admission ID",
            });
        }

        const patient = await getPatientWorkspace(
            nurseId,
            admissionId
        );

        if (!patient) {
            return res.status(404).json({
                message:
                    "Patient not found or patient is not accessible to this nurse",
            });
        }

        return res.status(200).json({
            patient,
        });

    } catch (error) {
        console.error(
            "Get patient workspace error:",
            error
        );

        return res.status(500).json({
            message: "Internal server error",
        });
    }
}
