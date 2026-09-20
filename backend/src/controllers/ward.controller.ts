import { Response } from "express";
import {
    createWard,
    getWards,
    updateWardStatus,
} from "../services/ward.service";
import { AuthenticatedRequest } from "../middleware/auth.middleware";

export async function getWardsController(
    req: AuthenticatedRequest,
    res: Response
) {
    try {
        const wards = await getWards();

        return res.status(200).json({
            wards,
        });
    } catch (error) {
        console.error("Get wards error:", error);

        return res.status(500).json({
            message: "Internal server error",
        });
    }
}

export async function createWardController(
    req: AuthenticatedRequest,
    res: Response
) {
    try {
        const { wardName, wardType } = req.body;

        if (!wardName || !wardName.trim()) {
            return res.status(400).json({
                message: "Ward name is required",
            });
        }

        const ward = await createWard(
            wardName.trim(),
            wardType?.trim()
        );

        return res.status(201).json({
            message: "Ward created successfully",
            ward,
        });
    } catch (error) {
        console.error("Create ward error:", error);

        if (
            error instanceof Error &&
            error.message === "Ward name already exists"
        ) {
            return res.status(409).json({
                message: error.message,
            });
        }

        return res.status(500).json({
            message: "Internal server error",
        });
    }
}

export async function updateWardStatusController(
    req: AuthenticatedRequest,
    res: Response
) {
    try {
        const { isActive } = req.body;
        const id = String(req.params.id);

        if (typeof isActive !== "boolean") {
            return res.status(400).json({
                message: "isActive must be true or false",
            });
        }

        const ward = await updateWardStatus(
            id,
            isActive
        );

        return res.status(200).json({
            message: isActive
                ? "Ward activated successfully"
                : "Ward deactivated successfully",
            ward,
        });
    } catch (error) {
        console.error(
            "Update ward status error:",
            error
        );

        if (error instanceof Error) {
            if (
                error.message === "Ward not found" ||
                error.message ===
                    "Cannot deactivate a ward with occupied beds"
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