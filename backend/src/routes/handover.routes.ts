import { Router } from "express";
import { authenticateToken } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import {
    getHandoverRecipientController,
    generateHandoverDraftController,
    saveHandoverController,
} from "../controllers/handover.controller";

const router = Router();

router.get(
    "/recipient/:admissionId",
    authenticateToken,
    requireRole("NURSE"),
    getHandoverRecipientController
);

router.post(
    "/:admissionId/draft",
    authenticateToken,
    requireRole("NURSE"),
    generateHandoverDraftController
);

router.post(
    "/:admissionId/save",
    authenticateToken,
    requireRole("NURSE"),
    saveHandoverController,
);

export default router;