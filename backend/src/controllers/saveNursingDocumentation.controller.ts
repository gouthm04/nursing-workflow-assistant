import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { saveNursingDocumentation } from "../services/saveNursingDocumentation.service";

export async function saveNursingDocumentationController(
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

        if (!Number.isInteger(admissionId) || admissionId <= 0) {
            return res.status(400).json({
                message: "Invalid admission ID",
            });
        }

        const {
            vitals,
            medications,
            nursing_notes,
            clinical_events,
            consumables,
        } = req.body;

        // Every section must be an array.
        if (
            !Array.isArray(vitals) ||
            !Array.isArray(medications) ||
            !Array.isArray(nursing_notes) ||
            !Array.isArray(clinical_events) ||
            !Array.isArray(consumables)
        ) {
            return res.status(400).json({
                message:
                    "vitals, medications, nursing_notes, clinical_events and consumables must be arrays",
            });
        }

        const result = await saveNursingDocumentation(
            nurseId,
            admissionId,
            {
                vitals,
                medications,
                nursing_notes,
                clinical_events,
                consumables,
            }
        );

        return res.status(201).json({
            message:
                "Nursing documentation saved successfully",
            ...result,
        });
    } catch (error) {
        console.error(
            "Save nursing documentation error:",
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

            if (
                error.message.includes(
                    "Consumable not found or inactive"
                )
            ) {
                return res.status(400).json({
                    message: error.message,
                });
            }

            if (
                error.message.includes(
                    "At least one vital sign is required"
                ) ||
                error.message.includes(
                    "SpO2 must be between 0 and 100"
                ) ||
                error.message.includes(
                    "Medication drug name, dosage and route are required"
                ) ||
                error.message.includes(
                    "Nursing note type and content are required"
                ) ||
                error.message.includes(
                    "Clinical event type and description are required"
                ) ||
                error.message.includes(
                    "Consumable name is required"
                ) ||
                error.message.includes(
                    "Consumable quantity must be greater than zero"
                )
            ) {
                return res.status(400).json({
                    message: error.message,
                });
            }
        }

        return res.status(500).json({
            message:
                "Could not save nursing documentation",
        });
    }
}