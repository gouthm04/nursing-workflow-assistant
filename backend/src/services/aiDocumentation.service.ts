import { gemini, GEMINI_MODEL } from "../config/gemini";
import OpenAI from "openai";

const groq = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1"
});

const GROQ_MODEL =
    process.env.GROQ_MODEL || "openai/gpt-oss-120b";

const NURA_DOCUMENTATION_SCHEMA = {
    type: "object",
    properties: {
        vitals: {
            type: "array",
            description: "Vital sign observations explicitly stated in the text.",
            items: {
                type: "object",
                properties: {
                    systolic_bp: {
                        type: ["integer", "null"],
                        description: "Systolic blood pressure in mmHg."
                    },
                    diastolic_bp: {
                        type: ["integer", "null"],
                        description: "Diastolic blood pressure in mmHg."
                    },
                    pulse_rate: {
                        type: ["integer", "null"],
                        description: "Pulse rate in beats per minute."
                    },
                    spo2: {
                        type: ["number", "null"],
                        description: "Oxygen saturation percentage."
                    },
                    temperature: {
                        type: ["number", "null"],
                        description: "Temperature in the unit explicitly stated by the nurse."
                    },
                    respiratory_rate: {
                        type: ["integer", "null"],
                        description: "Respiratory rate per minute."
                    },
                    source_text: {
                        type: "string",
                        description: "The relevant original phrase from the nurse's input."
                    }
                },
                required: [
                    "systolic_bp",
                    "diastolic_bp",
                    "pulse_rate",
                    "spo2",
                    "temperature",
                    "respiratory_rate",
                    "source_text"
                ],
                additionalProperties: false


            }
        },

        medications: {
            type: "array",
            description: "Medication administrations explicitly stated in the text.",
            items: {
                type: "object",
                properties: {
                    drug_name: {
                        type: "string",
                        description: "Medication name exactly as understood from the input."
                    },
                    dosage: {
                        type: ["string", "null"],
                        description: "Dose including units, if explicitly stated."
                    },
                    route: {
                        type: ["string", "null"],
                        description: "Administration route if explicitly stated."
                    },
                    notes: {
                        type: ["string", "null"],
                        description: "Other explicitly stated medication information."
                    },
                    source_text: {
                        type: "string",
                        description: "The relevant original phrase from the nurse's input."
                    }
                },
                required: [
                    "drug_name",
                    "dosage",
                    "route",
                    "notes",
                    "source_text"
                ],
                additionalProperties: false
            }
        },

        nursing_notes: {
            type: "array",
            description: "General nursing documentation that does not belong more appropriately to another structured record.",
            items: {
                type: "object",
                properties: {
                    note_type: {
                        type: "string",
                        enum: [
                            "GENERAL",
                            "OBSERVATION",
                            "CARE",
                            "FOLLOW_UP",
                            "OTHER"
                        ]
                    },
                    content: {
                        type: "string",
                        description: "The nursing note content."
                    },
                    source_text: {
                        type: "string",
                        description: "The relevant original phrase from the nurse's input."
                    }
                },
                required: [
                    "note_type",
                    "content",
                    "source_text"
                ],
                additionalProperties: false
            }
        },

        clinical_events: {
            type: "array",
            description: "Clinical events explicitly described by the nurse.",
            items: {
                type: "object",
                properties: {
                    event_type: {
                        type: "string",
                        enum: [
                            "PATIENT_COMPLAINT",
                            "CHANGE_IN_CONDITION",
                            "FALL",
                            "INJURY",
                            "PROCEDURE",
                            "DOCTOR_NOTIFICATION",
                            "OTHER"
                        ]
                    },
                    description: {
                        type: "string",
                        description: "Description of the clinical event using only information explicitly present in the input."
                    },
                    doctor_notified: {
                        type: "boolean",
                        description: "True only when the nurse explicitly states that a doctor was informed/notified."
                    },
                    doctor_name: {
                        type: ["string", "null"],
                        description: "Doctor name as stated by the nurse. Do not invent a name."
                    },
                    immediate_action: {
                        type: ["string", "null"],
                        description: "Immediate action explicitly stated by the nurse."
                    },
                    event_time_text: {
                        type: ["string", "null"],
                        description: "Original time expression if the nurse explicitly states when the event occurred."
                    },
                    source_text: {
                        type: "string",
                        description: "The relevant original phrase from the nurse's input."
                    }
                },
                required: [
                    "event_type",
                    "description",
                    "doctor_notified",
                    "doctor_name",
                    "immediate_action",
                    "event_time_text",
                    "source_text"
                ],
                additionalProperties: false
            }
        },

        consumables: {
            type: "array",
            description: "Consumable usage explicitly stated by the nurse.",
            items: {
                type: "object",
                properties: {
                    name: {
                        type: "string",
                        description: "Consumable name as understood from the input. Do not invent a specific type when the input is ambiguous."
                    },
                    quantity: {
                        type: "number",
                        description: "Quantity explicitly stated by the nurse."
                    },
                    used_for_type: {
                        type: ["string", "null"],
                        description: "The explicitly stated purpose or record type for the consumable."
                    },
                    source_text: {
                        type: "string",
                        description: "The relevant original phrase from the nurse's input."
                    }
                },
                required: [
                    "name",
                    "quantity",
                    "used_for_type",
                    "source_text"
                ],
                additionalProperties: false
            }
        }
    },
    required: [
        "vitals",
        "medications",
        "nursing_notes",
        "clinical_events",
        "consumables"
    ],
    additionalProperties: false
};



const SYSTEM_INSTRUCTIONS = `
You are the documentation extraction component of NurA,
a nursing workflow and shift handover assistant.

Your task is to extract structured nursing documentation from
natural-language text written or dictated by a nurse.

IMPORTANT RULES:

1. The information may appear in ANY ORDER.
   Do not expect vitals, medications, notes, events, or consumables
   to appear in a particular order.

2. Extract only information explicitly present in the input.

3. NEVER invent:
   - vital signs
   - medications
   - dosages
   - routes
   - doctor names
   - diagnoses
   - treatments
   - allergies
   - clinical recommendations
   - consumables
   - event times

4. Missing information must remain null.

5. If a category has no information, return an empty array.

6. Preserve the meaning of the nurse's original statement.

7. Do not diagnose the patient.
   For example, if the nurse says "patient complained of chest pain",
   record the complaint as a clinical event. Do not infer a diagnosis.

8. If the nurse says that a doctor was informed but does not give
   the doctor's name, set doctor_notified to true and doctor_name to null.

9. Doctor names must be returned exactly as understood from the input.
   Do not try to determine database IDs.

10. Consumable names must be returned as names only.
    Do not try to determine database IDs.

11. If information is ambiguous, do not guess.

12. A single input may contain multiple records of different types.

13. A single input may contain multiple records of the same type.

14. source_text must contain the relevant original wording from the
    nurse's input that supports the extracted item.

15. This output is a DRAFT for nurse review.
    It is never a final clinical record.

16. Do not add information merely because it would be medically
    reasonable or likely.

Return only the requested structured JSON.
`;

async function parseWithGemini(prompt: string) {
    const MAX_RETRIES = 3;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const response = await gemini.models.generateContent({
                model: GEMINI_MODEL,
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: NURA_DOCUMENTATION_SCHEMA
                }
            });

            if (!response || !response.text) {
                throw new Error("Gemini returned an empty response");
            }

            try {
                return JSON.parse(response.text);
            } catch {
                throw new Error("Gemini returned invalid JSON");
            }

        } catch (error: any) {
            const status = error?.status;

            const isRetryable =
                status === 429 ||
                status === 500 ||
                status === 502 ||
                status === 503 ||
                status === 504;

            if (!isRetryable || attempt === MAX_RETRIES) {
                throw error;
            }

            const delay = Math.pow(2, attempt - 1) * 1000;

            console.log(
                `Gemini temporary error (${status}). ` +
                `Retrying in ${delay}ms...`
            );

            await new Promise(resolve =>
                setTimeout(resolve, delay)
            );
        }
    }

    throw new Error("Gemini parsing failed");
}


async function parseWithGroq(prompt: string) {
    const response = await groq.chat.completions.create({
        model: GROQ_MODEL,
        messages: [
            {
                role: "user",
                content: prompt
            }
        ],
        response_format: {
            type: "json_schema",
            json_schema: {
                name: "nura_nursing_documentation",
                strict: true,
                schema: NURA_DOCUMENTATION_SCHEMA
            }
        }
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
        throw new Error("Groq returned an empty response");
    }

    try {
        return JSON.parse(content);
    } catch {
        throw new Error("Groq returned invalid JSON");
    }
}


export async function parseNursingDocumentation(text: string) {
    const cleanedText = text.trim();

    if (!cleanedText) {
        throw new Error("Documentation text cannot be empty");
    }

    const prompt = `
${SYSTEM_INSTRUCTIONS}

Nurse documentation:

"""
${cleanedText}
"""
`;

    try {
        console.log("Trying Groq for documentation parsing...");

        return await parseWithGroq(prompt);

    } catch (groqError) {
        console.error(
            "Groq documentation parsing failed.",
            groqError
        );

        throw new Error(
            "Documentation parsing failed with Groq."
        );
    }
}