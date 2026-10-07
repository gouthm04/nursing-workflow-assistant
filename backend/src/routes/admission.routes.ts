import { Router } from "express";
import {
    createAdmissionController,
    getAdmissionOptionsController,
    getActiveAdmissionsController,
    dischargeAdmissionController,
} from "../controllers/admission.controller";
import { authenticateToken } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";

const router = Router();

router.get(
    "/options",
    authenticateToken,
    requireRole("RECEPTIONIST"),
    getAdmissionOptionsController
);

router.get(
    "/active",
    authenticateToken,
    requireRole("RECEPTIONIST"),
    getActiveAdmissionsController
);

router.post(
    "/",
    authenticateToken,
    requireRole("RECEPTIONIST"),
    createAdmissionController
);

router.post(
    "/:id/discharge",
    authenticateToken,
    requireRole("RECEPTIONIST"),
    dischargeAdmissionController
);

export default router;