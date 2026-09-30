import { Request, Response } from "express";
import { parseNursingDocumentation } from "../services/aiDocumentation.service";

export async function parseNursingDocumentationController(
    req: Request,
    res: Response
) {
    try {
        const { text } = req.body;

        if (typeof text !== "string" || !text.trim()) {
            return res.status(400).json({
                message: "text is required"
            });
        }

        const draft = await parseNursingDocumentation(text);

        return res.status(200).json({
            draft
        });
    } catch (error) {
        console.error("AI documentation parsing error:", error);

        return res.status(500).json({
            message: "Failed to parse nursing documentation"
        });
    }
}