import { Router } from "express";
import {
    createUserController,
    getNursesController,
    updateNurseStatusController
} from "../controllers/user.controller";
import { authenticateToken } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";

const router = Router();

router.get(
    "/nurses",
    authenticateToken,
    requireRole("NURSE_SUPERVISOR"),
    getNursesController
);
router.patch(
    "/:id/status",
    authenticateToken,
    requireRole("NURSE_SUPERVISOR"),
    updateNurseStatusController
);

router.post(
    "/",
    authenticateToken,
    requireRole("SUPER_ADMIN", "NURSE_SUPERVISOR"),
    createUserController
);

export default router;