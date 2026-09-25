import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";

import {
    recordMedicationAdministration,
    getPatientMedicationAdministrations,
} from "../services/medication.service";

export async function recordMedicationController(
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
            drugName,
            dosage,
            route,
            notes,
        } = req.body;

        // Required fields
        if (
            typeof drugName !== "string" ||
            drugName.trim() === ""
        ) {
            return res.status(400).json({
                message: "Drug name is required",
            });
        }

        if (
            typeof dosage !== "string" ||
            dosage.trim() === ""
        ) {
            return res.status(400).json({
                message: "Dosage is required",
            });
        }

        if (
            typeof route !== "string" ||
            route.trim() === ""
        ) {
            return res.status(400).json({
                message: "Route is required",
            });
        }

        // Notes are optional.
        if (
            notes !== undefined &&
            notes !== null &&
            typeof notes !== "string"
        ) {
            return res.status(400).json({
                message: "Notes must be a string",
            });
        }

        const medication =
            await recordMedicationAdministration(
                nurseId,
                admissionId,
                {
                    drugName: drugName.trim(),
                    dosage: dosage.trim(),
                    route: route.trim(),
                    notes:
                        typeof notes === "string"
                            ? notes.trim()
                            : undefined,
                }
            );

        return res.status(201).json({
            message:
                "Medication administration recorded successfully",
            medication,
        });
    } catch (error) {
        console.error(
            "Record medication administration error:",
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
            message:
                "Could not record medication administration",
        });
    }
}

export async function getPatientMedicationsController(
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

        const medications =
            await getPatientMedicationAdministrations(
                nurseId,
                admissionId
            );

        return res.status(200).json({
            medications,
        });
    } catch (error) {
        console.error(
            "Get patient medication history error:",
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
            message:
                "Could not load medication history",
        });
    }
}