import { Request, Response } from "express";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { randomUUID } from "crypto";
import { transcribeAudio } from "../services/speechToText.service";

export async function transcribeAudioController(
    req: Request,
    res: Response
) {
    if (!req.file) {
        return res.status(400).json({
            message: "Audio file is required.",
        });
    }

    const tempFilePath = path.join(
        os.tmpdir(),
        `${randomUUID()}.m4a`
    );

    try {
        await fs.writeFile(
            tempFilePath,
            req.file.buffer
        );

        const transcript =
            await transcribeAudio(tempFilePath);

        return res.status(200).json({
            transcript,
        });
    } catch (error) {
        console.error(
            "Audio transcription error:",
            error
        );

        return res.status(500).json({
            message:
                "Failed to transcribe the audio.",
        });
    } finally {
        try {
            await fs.unlink(tempFilePath);
        } catch {
            // Temporary file may already be removed.
        }
    }
}
