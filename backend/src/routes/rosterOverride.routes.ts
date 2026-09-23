import { Router } from "express";
import { authenticateToken } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import {
    createRosterOverrideController
} from "../controllers/rosterOverride.controller";

const router = Router();

router.post(
    "/",
    authenticateToken,
    requireRole("NURSE_SUPERVISOR"),
    createRosterOverrideController
);

export default router;