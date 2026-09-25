import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";

import {
    recordClinicalEvent,
    getPatientClinicalEvents,
} from "../services/clinicalEvent.service";

export async function recordClinicalEventController(
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
            eventType,
            description,
            immediateAction,
            doctorNotified,
        } = req.body;

        if (
            typeof eventType !== "string" ||
            eventType.trim() === ""
        ) {
            return res.status(400).json({
                message: "Event type is required",
            });
        }

        if (
            typeof description !== "string" ||
            description.trim() === ""
        ) {
            return res.status(400).json({
                message: "Event description is required",
            });
        }

        if (
            doctorNotified !== undefined &&
            typeof doctorNotified !== "boolean"
        ) {
            return res.status(400).json({
                message:
                    "doctorNotified must be true or false",
            });
        }

        if (
            immediateAction !== undefined &&
            immediateAction !== null &&
            typeof immediateAction !== "string"
        ) {
            return res.status(400).json({
                message:
                    "Immediate action must be a string",
            });
        }

        const event =
            await recordClinicalEvent(
                nurseId,
                admissionId,
                {
                    eventType: eventType.trim(),
                    description:
                        description.trim(),
                    doctorNotified:
                        doctorNotified === true,
                    immediateAction:
                        typeof immediateAction ===
                        "string"
                            ? immediateAction.trim()
                            : undefined,
                }
            );

        return res.status(201).json({
            message:
                "Clinical event recorded successfully",
            event,
        });
    } catch (error) {
        console.error(
            "Record clinical event error:",
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
                "Could not record clinical event",
        });
    }
}

export async function getPatientClinicalEventsController(
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

        const events =
            await getPatientClinicalEvents(
                nurseId,
                admissionId
            );

        return res.status(200).json({
            events,
        });
    } catch (error) {
        console.error(
            "Get patient clinical events error:",
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
                "Could not load clinical events",
        });
    }
}