import fs from "fs";
import OpenAI from "openai";

const groq = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
});

const GROQ_STT_MODEL =
    process.env.GROQ_STT_MODEL ||
    "whisper-large-v3-turbo";

export async function transcribeAudio(
    filePath: string
) {
    if (!fs.existsSync(filePath)) {
        throw new Error("Audio file not found.");
    }

    const transcription =
        await groq.audio.transcriptions.create({
            file: fs.createReadStream(filePath),
            model: GROQ_STT_MODEL,
            response_format: "json",
            language: "en",
            temperature: 0,
        });

    return transcription.text;
}