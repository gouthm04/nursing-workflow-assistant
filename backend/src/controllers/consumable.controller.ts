import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";

import {
    getActiveConsumables,
    recordConsumableUsage,
    getPatientConsumableUsage,
} from "../services/consumable.service";

export async function getActiveConsumablesController(
    req: AuthenticatedRequest,
    res: Response
) {
    try {
        if (!req.user) {
            return res.status(401).json({
                message: "Authentication required",
            });
        }

        const consumables = await getActiveConsumables();

        return res.status(200).json({
            consumables,
        });
    } catch (error) {
        console.error(
            "Get active consumables error:",
            error
        );

        return res.status(500).json({
            message: "Could not load consumables",
        });
    }
}

export async function recordConsumableUsageController(
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

        if (
            !Number.isInteger(admissionId) ||
            admissionId <= 0
        ) {
            return res.status(400).json({
                message: "Invalid admission ID",
            });
        }

        const {
            consumableId,
            quantity,
            usedForType,
            usedForId,
        } = req.body;

        // Consumable ID is required.
        if (
            !Number.isInteger(consumableId) ||
            consumableId <= 0
        ) {
            return res.status(400).json({
                message: "Invalid consumable ID",
            });
        }

        // Quantity is required and must be greater than zero.
        if (
            typeof quantity !== "number" ||
            !Number.isFinite(quantity) ||
            quantity <= 0
        ) {
            return res.status(400).json({
                message:
                    "Quantity must be a number greater than zero",
            });
        }

        // usedForType is optional.
        if (
            usedForType !== undefined &&
            usedForType !== null &&
            typeof usedForType !== "string"
        ) {
            return res.status(400).json({
                message: "usedForType must be a string",
            });
        }

        // usedForId is optional.
        if (
            usedForId !== undefined &&
            usedForId !== null &&
            (
                !Number.isInteger(usedForId) ||
                usedForId <= 0
            )
        ) {
            return res.status(400).json({
                message: "Invalid usedForId",
            });
        }

        const usage =
            await recordConsumableUsage(
                nurseId,
                admissionId,
                {
                    consumableId,
                    quantity,
                    usedForType:
                        typeof usedForType === "string"
                            ? usedForType.trim()
                            : undefined,
                    usedForId,
                }
            );

        return res.status(201).json({
            message:
                "Consumable usage recorded successfully",
            usage,
        });
    } catch (error) {
        console.error(
            "Record consumable usage error:",
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
                error.message ===
                "Consumable not found or consumable is inactive"
            ) {
                return res.status(400).json({
                    message: error.message,
                });
            }
        }

        return res.status(500).json({
            message:
                "Could not record consumable usage",
        });
    }
}

export async function getPatientConsumableUsageController(
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

        if (
            !Number.isInteger(admissionId) ||
            admissionId <= 0
        ) {
            return res.status(400).json({
                message: "Invalid admission ID",
            });
        }

        const usage =
            await getPatientConsumableUsage(
                nurseId,
                admissionId
            );

        return res.status(200).json({
            usage,
        });
    } catch (error) {
        console.error(
            "Get patient consumable usage error:",
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
                "Could not load consumable usage history",
        });
    }
}