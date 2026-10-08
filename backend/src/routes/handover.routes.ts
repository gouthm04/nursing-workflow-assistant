import { Router } from "express";
import { authenticateToken } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import {
    getHandoverRecipientController,
    generateHandoverDraftController,
    saveHandoverController,
    sendHandoverController,
    acknowledgeHandoverController,
    getIncomingHandoversController,
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

router.get(
    "/incoming",
    authenticateToken,
    requireRole("NURSE"),
    getIncomingHandoversController
);

router.post(
    "/:handoverId/send",
    authenticateToken,
    requireRole("NURSE"),
    sendHandoverController
);

router.post(
    "/:handoverId/acknowledge",
    authenticateToken,
    requireRole("NURSE"),
    acknowledgeHandoverController
);

export default router;