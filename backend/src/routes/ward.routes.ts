import { Router } from "express";
import {
    createWardController,
    getWardsController,
    updateWardStatusController,
} from "../controllers/ward.controller";
import { authenticateToken } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";

const router = Router();

router.get(
    "/",
    authenticateToken,
    requireRole("NURSE_SUPERVISOR"),
    getWardsController
);

router.post(
    "/",
    authenticateToken,
    requireRole("NURSE_SUPERVISOR"),
    createWardController
);

router.patch(
    "/:id/status",
    authenticateToken,
    requireRole("NURSE_SUPERVISOR"),
    updateWardStatusController
);

export default router;