import { Router } from "express";
import {
    createBedController,
    getBedsController,
    updateBedStatusController,
} from "../controllers/bed.controller";
import { authenticateToken } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";

const router = Router();

router.get(
    "/",
    authenticateToken,
    requireRole("NURSE_SUPERVISOR"),
    getBedsController
);

router.post(
    "/",
    authenticateToken,
    requireRole("NURSE_SUPERVISOR"),
    createBedController
);

router.patch(
    "/:id/status",
    authenticateToken,
    requireRole("NURSE_SUPERVISOR"),
    updateBedStatusController
);

export default router;