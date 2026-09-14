import { Router } from "express";
import {
    createAdmissionController,
    getAdmissionOptionsController,
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

router.post(
    "/",
    authenticateToken,
    requireRole("RECEPTIONIST"),
    createAdmissionController
);

export default router;