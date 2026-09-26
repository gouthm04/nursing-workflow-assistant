import { Router } from "express";
import {
    getTodayAssignmentController,
    getTodayPatientsController,
    getPatientWorkspaceController,
} from "../controllers/nurse.controller";

import {
    recordVitalsController,
    getPatientVitalsController,
} from "../controllers/vitals.controller";

import {
    recordMedicationController,
    getPatientMedicationsController,
} from "../controllers/medication.controller";

import {
    recordNursingNoteController,
    getPatientNursingNotesController,
} from "../controllers/nursingNote.controller";

import {
    recordClinicalEventController,
    getPatientClinicalEventsController,
} from "../controllers/clinicalEvent.controller";

import {
    getActiveConsumablesController,
    recordConsumableUsageController,
    getPatientConsumableUsageController,
} from "../controllers/consumable.controller";

import {
    getPatientTimelineController,
} from "../controllers/timeline.controller";

import { authenticateToken } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";

const router = Router();

router.get(
    "/today",
    authenticateToken,
    requireRole("NURSE"),
    getTodayAssignmentController
);

router.get(
    "/patients",
    authenticateToken,
    requireRole("NURSE"),
    getTodayPatientsController
);

router.get(
    "/patients/:admissionId",
    authenticateToken,
    requireRole("NURSE"),
    getPatientWorkspaceController
);

router.post(
    "/patients/:admissionId/vitals",
    authenticateToken,
    requireRole("NURSE"),
    recordVitalsController
);

router.get(
    "/patients/:admissionId/vitals",
    authenticateToken,
    requireRole("NURSE"),
    getPatientVitalsController
);

router.post(
    "/patients/:admissionId/medications",
    authenticateToken,
    requireRole("NURSE"),
    recordMedicationController
);

router.get(
    "/patients/:admissionId/medications",
    authenticateToken,
    requireRole("NURSE"),
    getPatientMedicationsController
);

router.post(
    "/patients/:admissionId/nursing-notes",
    authenticateToken,
    requireRole("NURSE"),
    recordNursingNoteController
);

router.get(
    "/patients/:admissionId/nursing-notes",
    authenticateToken,
    requireRole("NURSE"),
    getPatientNursingNotesController
);

router.post(
    "/patients/:admissionId/clinical-events",
    authenticateToken,
    requireRole("NURSE"),
    recordClinicalEventController
);

router.get(
    "/patients/:admissionId/clinical-events",
    authenticateToken,
    requireRole("NURSE"),
    getPatientClinicalEventsController
);

router.get(
    "/consumables",
    authenticateToken,
    requireRole("NURSE"),
    getActiveConsumablesController
);

router.post(
    "/patients/:admissionId/consumables",
    authenticateToken,
    requireRole("NURSE"),
    recordConsumableUsageController
);

router.get(
    "/patients/:admissionId/consumables",
    authenticateToken,
    requireRole("NURSE"),
    getPatientConsumableUsageController
);

router.get(
    "/patients/:admissionId/timeline",
    authenticateToken,
    requireRole("NURSE"),
    getPatientTimelineController
);

export default router;