import { Response } from "express";
import {
    createAdmission,
    getAdmissionOptions,
    getActiveAdmissions,
    dischargeAdmission,
} from "../services/admission.service";
import { AuthenticatedRequest } from "../middleware/auth.middleware";

export async function getAdmissionOptionsController(
    req: AuthenticatedRequest,
    res: Response
) {
    try {
        const options = await getAdmissionOptions();

        return res.json(options);
    } catch (error) {
        console.error("Get admission options error:", error);

        return res.status(500).json({
            message: "Could not load admission options",
        });
    }
}

export async function createAdmissionController(
    req: AuthenticatedRequest,
    res: Response
) {
    try {
        const {
            firstName,
            lastName,
            dateOfBirth,
            gender,
            contactNumber,
            address,
            emergencyContactName,
            emergencyContactRelationship,
            emergencyContactPhone,
            doctorId,
            wardId,
            bedId,
            chiefComplaint,
            payerType,
            insuranceDetails,
        } = req.body;

        if (
            !firstName ||
            !emergencyContactName ||
            !emergencyContactRelationship ||
            !emergencyContactPhone ||
            !doctorId ||
            !wardId ||
            !bedId
        ) {
            return res.status(400).json({
                message: "Required admission fields are missing",
            });
        }

        const result = await createAdmission(
            {
                firstName,
                lastName,
                dateOfBirth,
                gender,
                contactNumber,
                address,
                emergencyContactName,
                emergencyContactRelationship,
                emergencyContactPhone,
                doctorId,
                wardId,
                bedId,
                chiefComplaint,
                payerType,
                insuranceDetails,
            },
            req.user!.user_id
        );

        return res.status(201).json({
            message: "Patient admitted successfully",
            ...result,
        });
    } catch (error) {
        console.error("Create admission error:", error);

        if (error instanceof Error) {
            const clientErrors = [
                "Selected doctor is not available",
                "Selected ward is not available",
                "Selected bed does not exist",
                "Selected bed does not belong to the selected ward",
                "Selected bed is no longer available",
            ];

            if (clientErrors.includes(error.message)) {
                return res.status(400).json({
                    message: error.message,
                });
            }
        }

        return res.status(500).json({
            message: "Could not admit patient",
        });
    }
}

export async function getActiveAdmissionsController(
    req: AuthenticatedRequest,
    res: Response
) {
    try {
        const admissions = await getActiveAdmissions();

        return res.status(200).json({
            admissions,
        });
    } catch (error) {
        console.error("Get active admissions error:", error);

        return res.status(500).json({
            message: "Could not load active admissions",
        });
    }
}


export async function dischargeAdmissionController(
    req: AuthenticatedRequest,
    res: Response
) {
    try {
        const admissionId = Number(req.params.id);

        if (!Number.isInteger(admissionId)) {
            return res.status(400).json({
                message: "Invalid admission ID",
            });
        }

        const result = await dischargeAdmission(admissionId);

        return res.status(200).json({
            message: "Patient discharged successfully",
            ...result,
        });
    } catch (error) {
        console.error("Discharge admission error:", error);

        if (error instanceof Error) {
            const clientErrors = [
                "Admission not found",
                "Patient is already discharged",
                "Admission bed not found",
                "Admission bed is not currently marked as occupied",
            ];

            if (clientErrors.includes(error.message)) {
                return res.status(
                    error.message === "Admission not found"
                        ? 404
                        : 400
                ).json({
                    message: error.message,
                });
            }
        }

        return res.status(500).json({
            message: "Could not discharge patient",
        });
    }
}