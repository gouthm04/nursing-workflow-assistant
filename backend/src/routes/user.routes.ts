import { Router } from "express";
import { createUserController } from "../controllers/user.controller";
import { authenticateToken } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";

const router = Router();

router.post(
    "/",
    authenticateToken,
    requireRole("SUPER_ADMIN", "NURSE_SUPERVISOR"),
    createUserController
);

export default router;