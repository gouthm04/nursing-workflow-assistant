import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import JWT_SECRET from "../config/auth";

export interface AuthenticatedRequest extends Request {
    user?: {
        user_id: string;
        role: string;
    };
}

export function authenticateToken(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            message: "Authentication token is required"
        });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            message: "Invalid authorization header"
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        if (typeof decoded === "string") {
            return res.status(401).json({
                message: "Invalid token"
            });
        }

        req.user = {
            user_id: String(decoded.user_id),
            role: String(decoded.role)
        };

        next();
    } catch (error) {
        return res.status(401).json({
            message: "Invalid or expired token"
        });
    }
}