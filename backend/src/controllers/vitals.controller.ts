import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import {
    recordVitals,
    getPatientVitals,
} from "../services/vitals.service";

export async function recordVitalsController(
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

        const {
            systolicBp,
            diastolicBp,
            pulseRate,
            spo2,
            temperature,
            respiratoryRate,
        } = req.body;

        const values = {
            systolicBp,
            diastolicBp,
            pulseRate,
            spo2,
            temperature,
            respiratoryRate,
        };

        // At least one vital must be provided.
        const hasValue = Object.values(values).some(
            (value) =>
                value !== undefined &&
                value !== null &&
                value !== ""
        );

        if (!hasValue) {
            return res.status(400).json({
                message:
                    "At least one vital sign is required",
            });
        }

        // Basic numeric validation.
        for (const [field, value] of Object.entries(values)) {
            if (
                value !== undefined &&
                value !== null &&
                value !== "" &&
                (typeof value !== "number" ||
                    !Number.isFinite(value))
            ) {
                return res.status(400).json({
                    message: `${field} must be a valid number`,
                });
            }
        }

        // Basic measurement constraints.
        if (
            spo2 !== undefined &&
            spo2 !== null &&
            (spo2 < 0 || spo2 > 100)
        ) {
            return res.status(400).json({
                message: "SpO2 must be between 0 and 100",
            });
        }

        const vital = await recordVitals(
            nurseId,
            admissionId,
            {
                systolicBp,
                diastolicBp,
                pulseRate,
                spo2,
                temperature,
                respiratoryRate,
            }
        );

        return res.status(201).json({
            message: "Vitals recorded successfully",
            vital,
        });
    } catch (error) {
        console.error(
            "Record vitals error:",
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
            message: "Could not record vitals",
        });
    }
}

export async function getPatientVitalsController(
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

        const vitals = await getPatientVitals(
            nurseId,
            admissionId
        );

        return res.status(200).json({
            vitals,
        });
    } catch (error) {
        console.error(
            "Get patient vitals error:",
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
            message: "Could not load patient vitals",
        });
    }
}