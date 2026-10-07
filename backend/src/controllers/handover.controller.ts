import { Request, Response } from "express";
import {
    getHandoverRecipient,
    generateHandoverDraft,
    saveHandover,
} from "../services/handover.service";
import { AuthenticatedRequest } from "../middleware/auth.middleware";

export async function getHandoverRecipientController(
    req: AuthenticatedRequest,
    res: Response
) {
    try {
        const admissionId = Number(req.params.admissionId);
        const currentShiftId = Number(req.query.shiftId);
        const currentShiftDate = String(req.query.shiftDate);
        const currentNurseId = Number(req.user?.user_id);
        if (
            !Number.isInteger(admissionId) ||
            !Number.isInteger(currentShiftId) ||
            !currentShiftDate ||
            !Number.isInteger(currentNurseId)
        ) {
            return res.status(400).json({
                message: "Invalid admission, shift, date, or nurse"
            });
        }
                if (
            !Number.isInteger(admissionId) ||
            !Number.isInteger(currentShiftId) ||
            !currentShiftDate
        ) {
            return res.status(400).json({
                message: "Invalid admission, shift, or date"
            });
        }

        const recipient = await getHandoverRecipient(
            admissionId,
            currentNurseId,
            currentShiftId,
            currentShiftDate
        );

        return res.status(200).json(recipient);
    } catch (error) {
        console.error("Get handover recipient error:", error);

        const message =
            error instanceof Error
                ? error.message
                : "Failed to determine handover recipient";

        return res.status(400).json({
            message
        });
    }
}

export async function generateHandoverDraftController(
    req: AuthenticatedRequest,
    res: Response
) {
    try {
        const admissionId = Number(req.params.admissionId);
        const currentShiftId = Number(req.body.shiftId);
        const currentShiftDate = String(req.body.shiftDate);
        const currentNurseId = Number(req.user?.user_id);

        if (
            !Number.isInteger(admissionId) ||
            !Number.isInteger(currentShiftId) ||
            !currentShiftDate ||
            !Number.isInteger(currentNurseId)
        ) {
            return res.status(400).json({
                message: "Invalid admission, shift, date, or nurse.",
            });
        }

        if (
            !Number.isInteger(admissionId) ||
            !Number.isInteger(currentShiftId) ||
            !currentShiftDate
        ) {
            return res.status(400).json({
                message: "Invalid admission, shift, or date.",
            });
        }

        const result = await generateHandoverDraft(
            admissionId,
            currentNurseId,
            currentShiftId,
            currentShiftDate
        );

        return res.status(200).json(result);
    } catch (error) {
        console.error(
            "Generate handover draft error:",
            error
        );

        const message =
            error instanceof Error
                ? error.message
                : "Failed to generate handover draft.";

        return res.status(500).json({
            message,
        });
    }
}

export async function saveHandoverController(
    req: AuthenticatedRequest,
    res: Response,
) {
    try {
        const admissionId = Number(req.params.admissionId);
        const currentShiftId = Number(req.body.shiftId);
        const currentShiftDate = String(req.body.shiftDate);

        const situation = String(req.body.situation ?? "").trim();
        const background = String(req.body.background ?? "").trim();
        const assessment = String(req.body.assessment ?? "").trim();
        const recommendation = String(
            req.body.recommendation ?? "",
        ).trim();

        const currentNurseId = Number(req.user?.user_id);

        if (
            !Number.isInteger(admissionId) ||
            !Number.isInteger(currentShiftId) ||
            !currentShiftDate ||
            !Number.isInteger(currentNurseId)
        ) {
            return res.status(400).json({
                message: "Invalid handover details.",
            });
        }

        if (
            !situation ||
            !background ||
            !assessment ||
            !recommendation
        ) {
            return res.status(400).json({
                message:
                    "All SBAR fields are required before saving.",
            });
        }

        const result = await saveHandover(
            admissionId,
            currentNurseId,
            currentShiftId,
            currentShiftDate,
            {
                situation,
                background,
                assessment,
                recommendation,
            },
        );

        return res.status(201).json({
            message: "Handover saved successfully.",
            handover: result,
        });
    } catch (error) {
        console.error(
            "Save handover error:",
            error,
        );

        const message =
            error instanceof Error
                ? error.message
                : "Failed to save handover.";

        return res.status(400).json({
            message,
        });
    }
}