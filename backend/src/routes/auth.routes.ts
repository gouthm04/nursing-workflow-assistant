import { Router } from "express";

import {
    login,
    changePasswordController,
} from "../controllers/auth.controller";

import { requireRole } from "../middleware/role.middleware";

import {
    authenticateToken,
    AuthenticatedRequest,
} from "../middleware/auth.middleware";

const router = Router();

router.post("/login", login);

router.get("/me", authenticateToken, (req: AuthenticatedRequest, res) => {
    res.json({
        message: "Token is valid",
        user: req.user
    });
});

router.get(
    "/nurse-test",
    authenticateToken,
    requireRole("NURSE"),
    (req: AuthenticatedRequest, res) => {
        res.json({
            message: "You are authorized as a nurse",
            user: req.user
        });
    }
);

router.put(
    "/change-password",
    authenticateToken,
    changePasswordController
);

export default router;