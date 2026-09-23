import { Router } from "express";
import {
    getTodayAssignmentController,
    getTodayPatientsController,
} from "../controllers/nurse.controller";
import { authenticateToken } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";

const router = Router();

router.get(
    "/today",
    authenticateToken,
    requireRole("NURSE"),
    getTodayAssignmentController
);

router.get(
    "/patients",
    authenticateToken,
    requireRole("NURSE"),
    getTodayPatientsController
);

export default router;