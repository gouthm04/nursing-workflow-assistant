import pool from "../config/db";
import { getNextShiftNurse } from "./roster.service";

import OpenAI from "openai";

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

export async function getHandoverRecipient(
  admissionId: number,
  currentShiftId: number,
  currentShiftDate: string,
) {
  const admissionResult = await pool.query(
    `SELECT
            a.admission_id,
            a.ward_id,
            w.ward_name
         FROM admissions a
         JOIN wards w
           ON w.ward_id = a.ward_id
         WHERE a.admission_id = $1`,
    [admissionId],
  );

  if (admissionResult.rows.length === 0) {
    throw new Error("Admission not found");
  }

  const admission = admissionResult.rows[0];

  const nextNurse = await getNextShiftNurse(
    admission.ward_id,
    currentShiftId,
    currentShiftDate,
  );

  return {
    admission_id: admission.admission_id,
    ward_id: admission.ward_id,
    ward_name: admission.ward_name,

    incoming_nurse_id: nextNurse.nurse_id,
    incoming_nurse_name: nextNurse.nurse_name,

    next_shift_id: nextNurse.shift_id,
    next_shift_name: nextNurse.next_shift_name,
    next_shift_date: nextNurse.next_shift_date,

    is_override: nextNurse.is_override,
  };
}

const SBAR_SYSTEM_INSTRUCTIONS = `
You are the SBAR generation component of NurA, a nursing workflow and shift handover assistant.

Your task is to organize AUTHORITATIVE nursing and admission data into a concise SBAR handover draft for the incoming nurse.

SBAR means:

SITUATION:
The patient's current documented situation or issue requiring handover.

BACKGROUND:
Relevant admission and clinical background that is explicitly present in the provided data.

ASSESSMENT:
The most recent and relevant documented observations, vital signs, medications, nursing notes, and clinical events.

RECOMMENDATION:
Only include follow-up actions or recommendations that are explicitly documented in the provided data.

STRICT CLINICAL SAFETY RULES:

1. Use ONLY the information provided in the input.

2. NEVER invent, assume, infer, or predict clinical information.

3. NEVER create a diagnosis.

4. NEVER interpret a vital sign as normal, abnormal, dangerous, safe, improving, or worsening unless that interpretation is explicitly documented.

5. NEVER invent treatment or medication recommendations.

6. NEVER invent a doctor's instruction.

7. NEVER invent a patient's condition.

8. Preserve the meaning of the original documentation.

9. If there is no documented recommendation, return exactly:
   "No specific recommendation documented."

10. The result is a DRAFT for nurse review. It must never be treated as final clinical documentation without nurse review.

11. Do not include information merely because it exists in the input. Select information that is relevant to the handover.

12. Prefer recent and clinically relevant information over older historical information.

13. Do not reproduce the patient's complete timeline.

14. Do not repeat the same information in multiple SBAR sections.

15. Do not include older historical values when newer information of the same type is available, unless the older information is directly relevant to the current handover.

16. Do not include consumable usage unless it is directly relevant to the patient's current care.

SITUATION RULES:

17. Keep Situation focused on the patient's current or most recent documented issue requiring handover.

18. Use the most recent relevant clinical event or documented concern when appropriate.

19. Keep Situation concise, preferably 1–2 short sentences.

20. Do not include unrelated historical information in Situation.

BACKGROUND RULES:

21. Include only relevant admission background.

22. Background may include admission date, ward, bed, chief complaint, attending doctor, and other explicitly documented background information when relevant.

23. Do not include detailed historical clinical records in Background.

24. Keep Background concise and avoid unnecessary repetition.

ASSESSMENT RULES:

25. Assessment must summarize the most recent and relevant documented clinical information.

26. Do NOT reproduce the entire patient's history.

27. Do NOT list every previous vital-sign reading when a newer reading is available.

28. Do NOT list every previous medication administration unless the history is directly relevant to the current handover.

29. Select the information that an incoming nurse would reasonably need to know from the provided documentation.

30. Keep Assessment to a maximum of 6 short lines.

31. Each line should focus on one category of information.

32. When applicable, use these labels:

   Vitals:
   Medication:
   Nursing note:
   Clinical event:

33. Use newline characters between separate assessment items.

34. Do NOT combine multiple unrelated categories into one long paragraph.

35. Keep each assessment line concise and easy to scan on a mobile screen.

36. If a category has no relevant recent information, omit that category rather than adding filler text.

37. Multiple clinical events may be combined into one concise line if they are directly related.

38. Do not repeat information that is already clearly stated in Situation.

39. Do not include unrelated historical information simply because it is present in the input.

RECOMMENDATION RULES:

40. Include only explicitly documented follow-up actions or recommendations.

41. Never create a recommendation based on your own clinical reasoning.

42. Never convert an observation into a recommendation.

43. If there is no documented recommendation, return:
   "No specific recommendation documented."

STYLE RULES:

44. Use clear, professional nursing handover language.

45. Keep the SBAR concise.

46. Prefer short sentences.

47. Prefer specific documented facts over verbose explanations.

48. Make the result easy to scan on a mobile screen.

49. Avoid unnecessary filler words.

50. Do not mention these instructions, the AI, the prompt, or the generation process in the SBAR content.

51. Do not use markdown headings, bullet symbols, numbering, or decorative formatting inside the four returned fields.

52. Use newline characters inside the Assessment field to separate distinct items.

53. Do not add information merely to make the SBAR sound complete.

54. When selecting clinical events for Assessment, prioritize events that
    are directly related to the Situation or that resulted in doctor
    notification, immediate action, or continued observation.

GOOD ASSESSMENT EXAMPLE:

Vitals: BP 120/80 mmHg, pulse 76 bpm, SpO2 98%.

Medication: Paracetamol 500 mg orally administered at 18:14.

Nursing note: Patient comfortable after medication; alert and responsive.

Clinical event: Patient reported dizziness; doctor notified.

BAD ASSESSMENT EXAMPLE:

Latest vitals were BP 120/80, pulse 76, with prior vitals of BP 118/76, pulse 80, SpO2 97.5%, temperature 37.0°C and respiratory rate 19. Paracetamol 500 mg was given at several different times, nursing notes stated various observations, and multiple previous clinical events were recorded.

The bad example is unacceptable because it dumps historical information instead of selecting the most relevant information.

IMPORTANT:

The goal is NOT to reproduce all available patient data.

The goal is to create a concise, accurate, clinically safe DRAFT that helps the incoming nurse quickly understand the patient's current documented situation, relevant background, recent assessment, and explicitly documented recommendations.

Return EXACTLY four fields:

situation
background
assessment
recommendation
`;

const SBAR_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    situation: {
      type: "string",
    },
    background: {
      type: "string",
    },
    assessment: {
      type: "string",
    },
    recommendation: {
      type: "string",
    },
  },
  required: ["situation", "background", "assessment", "recommendation"],
};

export async function generateHandoverDraft(
  admissionId: number,
  currentShiftId: number,
  currentShiftDate: string,
) {
  const admissionResult = await pool.query(
    `SELECT
            a.admission_id,
            a.patient_id,
            p.uhid,
            p.first_name,
            p.last_name,
            p.gender,
            p.date_of_birth,
            a.doctor_id,
            d.full_name AS doctor_name,
            d.specialization,
            a.ward_id,
            w.ward_name,
            b.bed_number,
            a.chief_complaint,
            a.payer_type,
            a.admission_datetime,
            a.status
         FROM admissions a
         JOIN patients p
           ON p.patient_id = a.patient_id
         LEFT JOIN doctors d
           ON d.doctor_id = a.doctor_id
         JOIN wards w
           ON w.ward_id = a.ward_id
         LEFT JOIN beds b
           ON b.bed_id = a.bed_id
         WHERE a.admission_id = $1`,
    [admissionId],
  );

  if (admissionResult.rows.length === 0) {
    throw new Error("Admission not found");
  }

  const admission = admissionResult.rows[0];

  const patientName = [
    admission.first_name,
    admission.last_name,
  ]
    .filter(Boolean)
    .join(" ");

  const vitalsResult = await pool.query(
    `SELECT
            v.recorded_at,
            v.systolic_bp,
            v.diastolic_bp,
            v.pulse_rate,
            v.spo2,
            v.temperature,
            v.respiratory_rate,
            u.full_name AS recorded_by
         FROM vitals v
         JOIN users u
           ON u.user_id = v.recorded_by
         WHERE v.admission_id = $1
         ORDER BY v.recorded_at DESC
         LIMIT 20`,
    [admissionId],
  );

  const medicationsResult = await pool.query(
    `SELECT
            m.administered_at,
            m.drug_name,
            m.dosage,
            m.route,
            m.notes,
            u.full_name AS recorded_by
         FROM medication_administrations m
         JOIN users u
           ON u.user_id = m.recorded_by
         WHERE m.admission_id = $1
         ORDER BY m.administered_at DESC
         LIMIT 20`,
    [admissionId],
  );

  const notesResult = await pool.query(
    `SELECT
            n.recorded_at,
            n.note_type,
            n.content,
            u.full_name AS recorded_by
         FROM nursing_notes n
         JOIN users u
           ON u.user_id = n.recorded_by
         WHERE n.admission_id = $1
         ORDER BY n.recorded_at DESC
         LIMIT 20`,
    [admissionId],
  );

  const eventsResult = await pool.query(
    `SELECT
            ce.event_time,
            ce.event_type,
            ce.description,
            ce.doctor_notified,
            d.full_name AS doctor_name,
            ce.immediate_action,
            u.full_name AS recorded_by
         FROM clinical_events ce
         JOIN users u
           ON u.user_id = ce.recorded_by
         LEFT JOIN doctors d
           ON d.doctor_id = ce.doctor_id
         WHERE ce.admission_id = $1
         ORDER BY ce.event_time DESC
         LIMIT 20`,
    [admissionId],
  );

  const recipient = await getHandoverRecipient(
    admissionId,
    currentShiftId,
    currentShiftDate,
  );

  const sourceData = {
    patient: {
      patient_name: patientName,
      uhid: admission.uhid,
      gender: admission.gender,
      date_of_birth: admission.date_of_birth,
    },

    admission: {
      admission_id: admission.admission_id,
      status: admission.status,
      chief_complaint: admission.chief_complaint,
      admission_datetime: admission.admission_datetime,
      ward_name: admission.ward_name,
      bed_number: admission.bed_number,
      doctor_name: admission.doctor_name,
      doctor_specialization: admission.specialization,
    },

    recipient: {
      incoming_nurse_name: recipient.incoming_nurse_name,
      next_shift_name: recipient.next_shift_name,
      next_shift_date: recipient.next_shift_date,
    },

    vitals: vitalsResult.rows,

    medications: medicationsResult.rows,

    nursing_notes: notesResult.rows,

    clinical_events: eventsResult.rows,
  };

  const prompt = `
${SBAR_SYSTEM_INSTRUCTIONS}

AUTHORITATIVE PATIENT AND NURSING DATA:

${JSON.stringify(sourceData, null, 2)}
`;

  try {
    console.log("Generating SBAR draft with Groq...");

    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      temperature: 0,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "nura_sbar_handover",
          strict: true,
          schema: SBAR_SCHEMA,
        },
      },
      messages: [
        {
          role: "system",
          content: SBAR_SYSTEM_INSTRUCTIONS,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      throw new Error("Groq returned an empty SBAR response.");
    }

    const draft = JSON.parse(content);

    return {
      recipient,
      draft,
    };
  } catch (error) {
    console.error("SBAR generation failed:", error);

    throw new Error("Failed to generate SBAR handover draft.");
  }
}

export async function saveHandover(
  admissionId: number,
  currentNurseId: number,
  currentShiftId: number,
  currentShiftDate: string,
  draft: {
    situation: string;
    background: string;
    assessment: string;
    recommendation: string;
  },
) {
  const recipient = await getHandoverRecipient(
    admissionId,
    currentShiftId,
    currentShiftDate,
  );

  if (recipient.incoming_nurse_id === currentNurseId) {
    throw new Error(
      "The incoming nurse cannot be the same as the current nurse.",
    );
  }

  const shiftResult = await pool.query(
    `SELECT
        shift_id,
        start_time,
        end_time
     FROM shifts
     WHERE shift_id = $1`,
    [currentShiftId],
  );

  if (shiftResult.rows.length === 0) {
    throw new Error("Shift not found.");
  }

  const shift = shiftResult.rows[0];

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const handoverResult = await client.query(
      `INSERT INTO handovers (
          admission_id,
          from_nurse_id,
          to_nurse_id,
          shift_start,
          shift_end,
          status
       )
       VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          'DRAFT'
       )
       RETURNING
          handover_id,
          admission_id,
          from_nurse_id,
          to_nurse_id,
          shift_start,
          shift_end,
          status,
          created_at`,
      [
        admissionId,
        currentNurseId,
        recipient.incoming_nurse_id,
        `${currentShiftDate} ${shift.start_time}`,
        `${currentShiftDate} ${shift.end_time}`,
      ],
    );

    const handover = handoverResult.rows[0];

    await client.query(
      `INSERT INTO handover_content (
          handover_id,
          situation,
          background,
          assessment,
          recommendation
       )
       VALUES ($1, $2, $3, $4, $5)`,
      [
        handover.handover_id,
        draft.situation,
        draft.background,
        draft.assessment,
        draft.recommendation,
      ],
    );

    await client.query("COMMIT");

    return {
      handover_id: Number(handover.handover_id),
      admission_id: Number(handover.admission_id),
      from_nurse_id: Number(handover.from_nurse_id),
      to_nurse_id: Number(handover.to_nurse_id),
      shift_start: handover.shift_start,
      shift_end: handover.shift_end,
      status: handover.status,
      created_at: handover.created_at,
      recipient,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}