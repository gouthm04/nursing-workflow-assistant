import { Router } from "express";
import {
    getShiftsController,
    createRosterController,
    createRosterAssignmentController,
    getRosterByIdController,
    getRostersController,

} from "../controllers/roster.controller";
import { authenticateToken } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";

const router = Router();

router.get(
    "/",
    authenticateToken,
    requireRole("NURSE_SUPERVISOR"),
    getRostersController
);

router.get(
    "/shifts",
    authenticateToken,
    requireRole("NURSE_SUPERVISOR"),
    getShiftsController
);

router.get(
    "/:id",
    authenticateToken,
    requireRole("NURSE_SUPERVISOR"),
    getRosterByIdController
);

router.post(
    "/assignments",
    authenticateToken,
    requireRole("NURSE_SUPERVISOR"),
    createRosterAssignmentController
);



router.post(
    "/",
    authenticateToken,
    requireRole("NURSE_SUPERVISOR"),
    createRosterController
);
export default router;