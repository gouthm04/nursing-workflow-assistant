import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";

import {
    recordNursingNote,
    getPatientNursingNotes,
} from "../services/nursingNote.service";

export async function recordNursingNoteController(
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

        const {
            noteType,
            content,
        } = req.body;

        if (
            typeof noteType !== "string" ||
            noteType.trim() === ""
        ) {
            return res.status(400).json({
                message: "Note type is required",
            });
        }

        if (
            typeof content !== "string" ||
            content.trim() === ""
        ) {
            return res.status(400).json({
                message: "Note content is required",
            });
        }

        const note = await recordNursingNote(
            nurseId,
            admissionId,
            {
                noteType: noteType.trim(),
                content: content.trim(),
            }
        );

        return res.status(201).json({
            message: "Nursing note recorded successfully",
            note,
        });
    } catch (error) {
        console.error(
            "Record nursing note error:",
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
            message: "Could not record nursing note",
        });
    }
}

export async function getPatientNursingNotesController(
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

        const notes = await getPatientNursingNotes(
            nurseId,
            admissionId
        );

        return res.status(200).json({
            notes,
        });
    } catch (error) {
        console.error(
            "Get patient nursing notes error:",
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
            message: "Could not load nursing notes",
        });
    }
}