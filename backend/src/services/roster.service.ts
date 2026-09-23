import pool from "../config/db";
async function validateNurseSchedule(
    nurseId: number,
    rosterId: number,
    shiftDate: string,
    shiftStart: Date,
    shiftEnd: Date,
    shiftDurationHours: number
) {
    // 1. Get the nurse's existing assignments
    const existingAssignments = await pool.query(
        `SELECT
            ra.assignment_id,
            ra.shift_date::text AS shift_date,
            s.start_time,
            s.end_time
         FROM roster_assignments ra
         JOIN shifts s
           ON s.shift_id = ra.shift_id
         WHERE ra.nurse_id = $1
           AND ra.shift_date BETWEEN ($2::date - INTERVAL '2 days')
                                 AND ($2::date + INTERVAL '2 days')`,
        [nurseId, shiftDate]
    );

    // 2. Check overlap and minimum rest
    for (const existing of existingAssignments.rows) {
        const existingStart = new Date(
            `${existing.shift_date}T${existing.start_time}Z`
        );

        const existingEnd = new Date(
            `${existing.shift_date}T${existing.end_time}Z`
        );

        if (existingEnd <= existingStart) {
            existingEnd.setUTCDate(
                existingEnd.getUTCDate() + 1
            );
        }

        // Overlap
        if (
            shiftStart < existingEnd &&
            shiftEnd > existingStart
        ) {
            throw new Error(
                "Nurse already has an overlapping shift"
            );
        }

        // Rest before existing shift
        const gapBefore =
            (shiftStart.getTime() - existingEnd.getTime()) /
            (1000 * 60 * 60);

        // Rest after existing shift
        const gapAfter =
            (existingStart.getTime() - shiftEnd.getTime()) /
            (1000 * 60 * 60);

        if (
            (gapBefore >= 0 && gapBefore < 16) ||
            (gapAfter >= 0 && gapAfter < 16)
        ) {
            throw new Error(
                "Nurse must have at least 16 hours of rest between shifts"
            );
        }
    }

    // 3. Check maximum weekly hours
    const weeklyHoursResult = await pool.query(
        `SELECT COALESCE(SUM(s.duration_hours), 0) AS total_hours
         FROM roster_assignments ra
         JOIN shifts s
           ON s.shift_id = ra.shift_id
         WHERE ra.nurse_id = $1
           AND ra.roster_id = $2`,
        [nurseId, rosterId]
    );

    const currentWeeklyHours = Number(
        weeklyHoursResult.rows[0].total_hours
    );

    const newWeeklyHours =
        currentWeeklyHours + shiftDurationHours;

    const ruleResult = await pool.query(
        `SELECT maximum_weekly_hours
         FROM roster_rules
         ORDER BY rule_id
         LIMIT 1`
    );

    if (ruleResult.rows.length === 0) {
        throw new Error("Roster rules are not configured");
    }

    const maximumWeeklyHours = Number(
        ruleResult.rows[0].maximum_weekly_hours
    );

    if (newWeeklyHours > maximumWeeklyHours) {
        throw new Error(
            `Nurse cannot be assigned more than ${maximumWeeklyHours} hours per week`
        );
    }
}


export async function getShifts() {
    const result = await pool.query(
        `SELECT
            shift_id,
            shift_name,
            start_time,
            end_time,
            duration_hours
         FROM shifts
         ORDER BY shift_id`
    );

    return result.rows;
}

export async function getNextShiftNurse(
    wardId: number,
    currentShiftId: number,
    currentShiftDate: string
) {
    // 1. Get all shifts in their normal sequence
    const shiftsResult = await pool.query(
        `SELECT
            shift_id,
            shift_name,
            start_time,
            end_time
         FROM shifts
         ORDER BY shift_id`
    );

    if (shiftsResult.rows.length === 0) {
        throw new Error("Shifts are not configured");
    }

    const shifts = shiftsResult.rows;

    // 2. Find the current shift
    const currentIndex = shifts.findIndex(
        (shift) => Number(shift.shift_id) === currentShiftId
    );

    if (currentIndex === -1) {
        throw new Error("Current shift not found");
    }

    // 3. Determine the next shift
    const nextIndex =
        (currentIndex + 1) % shifts.length;

    const nextShift = shifts[nextIndex];

    // 4. Determine the date of the next shift
    let nextShiftDate = currentShiftDate;

    // If we move from the last shift back to the first shift,
    // the next shift is on the following day.
    if (nextIndex === 0) {
        const date = new Date(
            `${currentShiftDate}T00:00:00Z`
        );

        date.setUTCDate(
            date.getUTCDate() + 1
        );

        nextShiftDate =
            date.toISOString().split("T")[0];
    }

    // 5. Find the roster covering the next shift date
    const rosterResult = await pool.query(
        `SELECT
            roster_id,
            week_start_date::text AS week_start_date,
            week_end_date::text AS week_end_date,
            status
         FROM rosters
         WHERE week_start_date <= $1
           AND week_end_date >= $1
         ORDER BY week_start_date DESC
         LIMIT 1`,
        [nextShiftDate]
    );

    if (rosterResult.rows.length === 0) {
        throw new Error(
            "No roster is available for the next shift"
        );
    }

    const nextRoster = rosterResult.rows[0];

    // 6. Find the primary nurse assigned to the next shift
    const assignmentResult = await pool.query(
        `SELECT
            ra.assignment_id,
            ra.nurse_id,
            u.full_name AS nurse_name,
            ra.roster_id,
            ra.ward_id,
            ra.shift_id,
            ra.shift_date::text AS shift_date
         FROM roster_assignments ra
         JOIN users u
           ON u.user_id = ra.nurse_id
         WHERE ra.roster_id = $1
           AND ra.ward_id = $2
           AND ra.shift_id = $3
           AND ra.shift_date = $4
           AND ra.is_primary = TRUE
         LIMIT 1`,
        [
            nextRoster.roster_id,
            wardId,
            nextShift.shift_id,
            nextShiftDate
        ]
    );

    if (assignmentResult.rows.length === 0) {
        throw new Error(
            "No primary nurse is assigned to the next shift"
        );
    }

    const assignment = assignmentResult.rows[0];

    // 7. Check whether this assignment has a replacement
    // recorded in roster_overrides.
    const overrideResult = await pool.query(
        `SELECT
            ro.replacement_nurse_id,
            u.full_name AS replacement_nurse_name
         FROM roster_overrides ro
         JOIN users u
           ON u.user_id = ro.replacement_nurse_id
         WHERE ro.assignment_id = $1
         ORDER BY ro.created_at DESC
         LIMIT 1`,
        [assignment.assignment_id]
    );

    // 8. If an override exists, that nurse becomes
    // the effective recipient.
    if (overrideResult.rows.length > 0) {
        return {
            assignment_id: assignment.assignment_id,
            nurse_id: overrideResult.rows[0].replacement_nurse_id,
            nurse_name: overrideResult.rows[0].replacement_nurse_name,
            roster_id: assignment.roster_id,
            ward_id: assignment.ward_id,
            shift_id: assignment.shift_id,
            shift_date: assignment.shift_date,
            next_shift_name: nextShift.shift_name,
            next_shift_date: nextShiftDate,
            is_override: true
        };
    }

    // 9. No override — original primary nurse is the recipient.
    return {
        assignment_id: assignment.assignment_id,
        nurse_id: assignment.nurse_id,
        nurse_name: assignment.nurse_name,
        roster_id: assignment.roster_id,
        ward_id: assignment.ward_id,
        shift_id: assignment.shift_id,
        shift_date: assignment.shift_date,
        next_shift_name: nextShift.shift_name,
        next_shift_date: nextShiftDate,
        is_override: false
    };
}

export async function createRoster(
    weekStartDate: string,
    createdBy: string
) {
    const startDate = new Date(
        `${weekStartDate}T00:00:00Z`
    );

    if (Number.isNaN(startDate.getTime())) {
        throw new Error("Invalid week start date");
    }

    const dayOfWeek = startDate.getUTCDay();

    if (dayOfWeek !== 1) {
        throw new Error(
            "Roster week must start on a Monday"
        );
    }

    const endDate = new Date(startDate);
    endDate.setUTCDate(
        endDate.getUTCDate() + 6
    );

    const weekEndDate =
        endDate.toISOString().split("T")[0];

    const existingRoster = await pool.query(
        `SELECT roster_id
         FROM rosters
         WHERE week_start_date = $1`,
        [weekStartDate]
    );

    if (existingRoster.rows.length > 0) {
        throw new Error(
            "A roster already exists for this week"
        );
    }

    const result = await pool.query(
        `INSERT INTO rosters (
            week_start_date,
            week_end_date,
            created_by,
            status
        )
        VALUES ($1, $2, $3, 'DRAFT')
        RETURNING
            roster_id,
            week_start_date::text AS week_start_date,
            week_end_date::text AS week_end_date,
            created_by,
            status,
            created_at`,
        [
            weekStartDate,
            weekEndDate,
            createdBy,
        ]
    );

    return result.rows[0];
}

export async function createRosterAssignment(
    rosterId: number,
    nurseId: number,
    wardId: number,
    shiftId: number,
    shiftDate: string,
    isPrimary: boolean
) {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // 1. Get roster
        const rosterResult = await client.query(
            `SELECT
                roster_id,
                week_start_date::text AS week_start_date,
                week_end_date::text AS week_end_date,
                status
             FROM rosters
             WHERE roster_id = $1`,
            [rosterId]
        );

        if (rosterResult.rows.length === 0) {
            throw new Error("Roster not found");
        }

        const roster = rosterResult.rows[0];

        if (roster.status !== "DRAFT") {
            throw new Error("Assignments can only be added to a DRAFT roster");
        }

        // 2. Validate shift date belongs to roster week
        if (
            shiftDate < roster.week_start_date ||
            shiftDate > roster.week_end_date
        ) {
            throw new Error("Shift date must belong to the roster week");
        }

        // 3. Get nurse
        const nurseResult = await client.query(
            `SELECT user_id, role, is_active
             FROM users
             WHERE user_id = $1`,
            [nurseId]
        );

        if (nurseResult.rows.length === 0) {
            throw new Error("Nurse not found");
        }

        const nurse = nurseResult.rows[0];

        if (nurse.role !== "NURSE") {
            throw new Error("Selected user is not a nurse");
        }

        if (!nurse.is_active) {
            throw new Error("Nurse is inactive");
        }

        // 4. Get ward
        const wardResult = await client.query(
            `SELECT ward_id, is_active
             FROM wards
             WHERE ward_id = $1`,
            [wardId]
        );

        if (wardResult.rows.length === 0) {
            throw new Error("Ward not found");
        }

        if (!wardResult.rows[0].is_active) {
            throw new Error("Ward is inactive");
        }

        // 5. Get shift
        const shiftResult = await client.query(
            `SELECT
                shift_id,
                shift_name,
                start_time,
                end_time,
                duration_hours
             FROM shifts
             WHERE shift_id = $1`,
            [shiftId]
        );

        if (shiftResult.rows.length === 0) {
            throw new Error("Shift not found");
        }

        const shift = shiftResult.rows[0];

        /*
         * Convert the shift into actual timestamps.
         *
         * Morning: 08:00 -> 16:00 same day
         * Evening: 16:00 -> 00:00 next day
         * Night:   00:00 -> 08:00 same day
         */
        const shiftStart = new Date(
            `${shiftDate}T${shift.start_time}Z`
        );

        const shiftEnd = new Date(
            `${shiftDate}T${shift.end_time}Z`
        );

        if (shiftEnd <= shiftStart) {
            shiftEnd.setUTCDate(
                shiftEnd.getUTCDate() + 1
            );
        }

        // 6. Check whether this nurse is already assigned
        // to the same shift/date in this roster.
        const duplicateNurseResult = await client.query(
            `SELECT assignment_id
            FROM roster_assignments
            WHERE roster_id = $1
            AND nurse_id = $2
            AND shift_id = $3
            AND shift_date = $4`,
            [rosterId, nurseId, shiftId, shiftDate]
        );

        if (duplicateNurseResult.rows.length > 0) {
            throw new Error(
                "This nurse is already assigned to this shift and date"
            );
        }

        // 7. Check nurse's existing assignments for overlap/rest.
        //
        // We check assignments around the requested date rather than
        // only assignments in the current roster. This also catches
        // boundary cases between consecutive roster weeks.
        // 7. Determine whether this ward/shift/date already has a primary nurse.
        const primaryResult = await client.query(
            `SELECT assignment_id
            FROM roster_assignments
            WHERE roster_id = $1
            AND ward_id = $2
            AND shift_id = $3
            AND shift_date = $4
            AND is_primary = TRUE`,
            [rosterId, wardId, shiftId, shiftDate]
        );

        if (isPrimary && primaryResult.rows.length > 0) {
            throw new Error(
                "A primary nurse is already assigned to this ward, shift and date"
            );
        }
        if (primaryResult.rows.length === 0) {
            isPrimary = true;
        }

        await validateNurseSchedule(
            nurseId,
            rosterId,
            shiftDate,
            shiftStart,
            shiftEnd,
            Number(shift.duration_hours)
        );
        // 9. Create assignment
        const assignmentResult = await client.query(
            `INSERT INTO roster_assignments (
                roster_id,
                nurse_id,
                ward_id,
                shift_id,
                shift_date,
                is_primary
            )
            VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING
                assignment_id,
                roster_id,
                nurse_id,
                ward_id,
                shift_id,
                shift_date::text AS shift_date,
                is_primary`,
                
            [
                rosterId,
                nurseId,
                wardId,
                shiftId,
                shiftDate,
                isPrimary
            ]
        );

        await client.query("COMMIT");

        return assignmentResult.rows[0];

    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

export async function getRosterById(rosterId: number) {
    const rosterResult = await pool.query(
        `SELECT
            r.roster_id,
            r.week_start_date::text AS week_start_date,
            r.week_end_date::text AS week_end_date,
            r.created_by,
            r.status,
            r.created_at
         FROM rosters r
         WHERE r.roster_id = $1`,
        [rosterId]
    );

    if (rosterResult.rows.length === 0) {
        throw new Error("Roster not found");
    }

    const roster = rosterResult.rows[0];

    // REPLACE THE EXISTING assignmentsResult BLOCK HERE
    const assignmentsResult = await pool.query(
        `SELECT
            ra.assignment_id,
            ra.nurse_id,
            u.full_name AS nurse_name,
            ra.ward_id,
            w.ward_name,
            ra.shift_id,
            s.shift_name,
            s.start_time,
            s.end_time,
            s.duration_hours,
            ra.shift_date::text AS shift_date,
            ra.is_primary,

            ro.replacement_nurse_id,
            replacement_nurse.full_name AS replacement_nurse_name,
            ro.reason AS override_reason

         FROM roster_assignments ra

         JOIN users u
           ON u.user_id = ra.nurse_id

         JOIN wards w
           ON w.ward_id = ra.ward_id

         JOIN shifts s
           ON s.shift_id = ra.shift_id

         LEFT JOIN LATERAL (
             SELECT
                 ro.replacement_nurse_id,
                 ro.reason
             FROM roster_overrides ro
             WHERE ro.assignment_id = ra.assignment_id
             ORDER BY ro.created_at DESC
             LIMIT 1
         ) ro
           ON TRUE

         LEFT JOIN users replacement_nurse
           ON replacement_nurse.user_id = ro.replacement_nurse_id

         WHERE ra.roster_id = $1

         ORDER BY
            ra.shift_date,
            s.start_time,
            w.ward_name,
            u.full_name`,
        [rosterId]
    );

    return {
        ...roster,
        assignments: assignmentsResult.rows
    };
}

export async function getRosters() {
    const result = await pool.query(
        `SELECT
            roster_id,
            week_start_date::text AS week_start_date,
            week_end_date::text AS week_end_date,
            created_by,
            status,
            created_at
         FROM rosters
         ORDER BY week_start_date DESC`
    );

    return result.rows;
}

export async function createRosterOverride(
    assignmentId: number,
    replacementNurseId: number,
    reason: string,
    createdBy: number
) {
    // 1. Find the original roster assignment
    const assignmentResult = await pool.query(
        `SELECT
            ra.assignment_id,
            ra.roster_id,
            ra.nurse_id,
            ra.ward_id,
            ra.shift_id,
            ra.shift_date,
            r.status AS roster_status
         FROM roster_assignments ra
         JOIN rosters r
           ON r.roster_id = ra.roster_id
         WHERE ra.assignment_id = $1`,
        [assignmentId]
    );

    if (assignmentResult.rows.length === 0) {
        throw new Error("Roster assignment not found");
    }

    const assignment = assignmentResult.rows[0];

    // 2. Overrides can only be created for a DRAFT roster
    if (assignment.roster_status !== "DRAFT") {
        throw new Error(
            "Overrides can only be created for a DRAFT roster"
        );
    }

    // 3. Validate replacement nurse
    const nurseResult = await pool.query(
        `SELECT
            user_id,
            full_name,
            role,
            is_active
         FROM users
         WHERE user_id = $1`,
        [replacementNurseId]
    );

    if (nurseResult.rows.length === 0) {
        throw new Error("Replacement nurse not found");
    }

    const replacementNurse = nurseResult.rows[0];

    if (replacementNurse.role !== "NURSE") {
        throw new Error("Selected user is not a nurse");
    }

    if (!replacementNurse.is_active) {
        throw new Error("Replacement nurse is inactive");
    }

    // 4. Validate reason
    if (!reason || !reason.trim()) {
        throw new Error("Override reason is required");
    }

    // 5. Make sure replacement nurse is not already
    //    assigned to the same shift/date
    const duplicateResult = await pool.query(
        `SELECT assignment_id
         FROM roster_assignments
         WHERE roster_id = $1
           AND nurse_id = $2
           AND shift_id = $3
           AND shift_date = $4`,
        [
            assignment.roster_id,
            replacementNurseId,
            assignment.shift_id,
            assignment.shift_date
        ]
    );

    if (duplicateResult.rows.length > 0) {
        throw new Error(
            "Replacement nurse is already assigned to this shift and date"
        );
    }
        // 6. Get shift details
    const shiftResult = await pool.query(
        `SELECT
            shift_id,
            start_time,
            end_time,
            duration_hours
         FROM shifts
         WHERE shift_id = $1`,
        [assignment.shift_id]
    );

    if (shiftResult.rows.length === 0) {
        throw new Error("Shift not found");
    }

    const shift = shiftResult.rows[0];

    const shiftStart = new Date(
        `${assignment.shift_date}T${shift.start_time}Z`
    );

    const shiftEnd = new Date(
        `${assignment.shift_date}T${shift.end_time}Z`
    );

    if (shiftEnd <= shiftStart) {
        shiftEnd.setUTCDate(
            shiftEnd.getUTCDate() + 1
        );
    }

    // 7. Validate the replacement nurse's schedule
    await validateNurseSchedule(
        replacementNurseId,
        assignment.roster_id,
        assignment.shift_date,
        shiftStart,
        shiftEnd,
        Number(shift.duration_hours)
    );

    // 6. Create the override
    const overrideResult = await pool.query(
        `INSERT INTO roster_overrides (
            assignment_id,
            replacement_nurse_id,
            reason,
            created_by
         )
         VALUES ($1, $2, $3, $4)
         RETURNING
            override_id,
            assignment_id,
            replacement_nurse_id,
            reason,
            created_by,
            created_at`,
        [
            assignmentId,
            replacementNurseId,
            reason.trim(),
            createdBy
        ]
    );

    return overrideResult.rows[0];
}