import { Response } from "express";
import {
    createBed,
    getBeds,
    updateBedStatus,
} from "../services/bed.service";
import { AuthenticatedRequest } from "../middleware/auth.middleware";

export async function getBedsController(
    req: AuthenticatedRequest,
    res: Response
) {
    try {
        const wardId =
            typeof req.query.wardId === "string"
                ? req.query.wardId
                : undefined;

        const beds = await getBeds(wardId);

        return res.status(200).json({
            beds,
        });
    } catch (error) {
        console.error("Get beds error:", error);

        return res.status(500).json({
            message: "Internal server error",
        });
    }
}

export async function createBedController(
    req: AuthenticatedRequest,
    res: Response
) {
    try {
        const { wardId, bedNumber } = req.body;

        if (!wardId || !bedNumber || !bedNumber.trim()) {
            return res.status(400).json({
                message:
                    "Ward ID and bed number are required",
            });
        }

        const bed = await createBed(
            String(wardId),
            bedNumber.trim()
        );

        return res.status(201).json({
            message: "Bed created successfully",
            bed,
        });
    } catch (error) {
        console.error("Create bed error:", error);

        if (error instanceof Error) {
            if (
                error.message === "Ward not found" ||
                error.message ===
                    "Cannot create a bed in an inactive ward" ||
                error.message ===
                    "Bed number already exists in this ward"
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

export async function updateBedStatusController(
    req: AuthenticatedRequest,
    res: Response
) {
    try {
        const { status } = req.body;
        const id = String(req.params.id);

        if (!status) {
            return res.status(400).json({
                message: "Bed status is required",
            });
        }

        const bed = await updateBedStatus(
            id,
            status
        );

        return res.status(200).json({
            message: "Bed status updated successfully",
            bed,
        });
    } catch (error) {
        console.error(
            "Update bed status error:",
            error
        );

        if (error instanceof Error) {
            const expectedErrors = [
                "Invalid bed status",
                "Bed not found",
                "Occupied beds can only be released through patient discharge",
            ];

            if (
                expectedErrors.includes(error.message)
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