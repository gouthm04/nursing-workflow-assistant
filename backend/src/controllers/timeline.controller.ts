import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { getPatientTimeline } from "../services/timeline.service";

export async function getPatientTimelineController(
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
        const admissionId = Number(
            req.params.admissionId
        );

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

        const timeline = await getPatientTimeline(
            nurseId,
            admissionId
        );

        return res.status(200).json({
            admission_id: admissionId,
            timeline,
        });
    } catch (error) {
        console.error(
            "Get patient timeline error:",
            error
        );

        if (error instanceof Error) {
            if (
                error.message ===
                "Patient not found or patient is not accessible to this nurse"
            ) {
                return res.status(404).json({
                    message: error.message,
                });
            }
        }

        return res.status(500).json({
            message: "Could not load patient timeline",
        });
    }
}