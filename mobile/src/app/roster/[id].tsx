import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { getStoredToken } from "../../services/auth";

const API_URL = "http://localhost:3000";

type Assignment = {
    assignment_id: string;
    nurse_id: string;
    nurse_name: string;
    ward_id: string;
    ward_name: string;
    shift_id: string;
    shift_name: string;
    start_time: string;
    end_time: string;
    duration_hours: string;
    shift_date: string;
    is_primary: boolean;

    replacement_nurse_id: string | null;
    replacement_nurse_name: string | null;
    override_reason: string | null;
};

type Roster = {
    roster_id: string;
    week_start_date: string;
    week_end_date: string;
    created_by: string;
    status: string;
    created_at: string;
    assignments: Assignment[];
};

type Nurse = {
    user_id: string;
    full_name: string;
    is_active: boolean;
};

type Ward = {
    ward_id: string;
    ward_name: string;
    is_active: boolean;
};

type Shift = {
    shift_id: string;
    shift_name: string;
    start_time: string;
    end_time: string;
    duration_hours: string;
};

export default function RosterDetailsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();

    const [roster, setRoster] = useState<Roster | null>(null);
    const [loading, setLoading] = useState(true);

    const [showForm, setShowForm] = useState(false);

    const [nurses, setNurses] = useState<Nurse[]>([]);
    const [wards, setWards] = useState<Ward[]>([]);
    const [shifts, setShifts] = useState<Shift[]>([]);

    const [selectedDate, setSelectedDate] = useState("");
    const [selectedNurse, setSelectedNurse] = useState("");
    const [selectedWard, setSelectedWard] = useState("");
    const [selectedShift, setSelectedShift] = useState("");

    const [submitting, setSubmitting] = useState(false);

    const [overrideAssignment, setOverrideAssignment] =
        useState<Assignment | null>(null);

    const [replacementNurse, setReplacementNurse] = useState("");
    const [overrideReason, setOverrideReason] = useState("");
    const [overrideSubmitting, setOverrideSubmitting] =
        useState(false);

    async function loadRoster() {
        try {
            setLoading(true);

            const token = await getStoredToken();

            if (!token) {
                router.replace("/");
                return;
            }

            const response = await fetch(
                `${API_URL}/api/rosters/${id}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Failed to load roster"
                );
            }

            setRoster(data.roster);
        } catch (error) {
            Alert.alert(
                "Error",
                error instanceof Error
                    ? error.message
                    : "Failed to load roster"
            );
        } finally {
            setLoading(false);
        }
    }

    async function loadAssignmentOptions() {
        try {
            const token = await getStoredToken();

            if (!token) {
                router.replace("/");
                return;
            }

            const headers = {
                Authorization: `Bearer ${token}`,
            };

            const [
                nursesResponse,
                wardsResponse,
                shiftsResponse,
            ] = await Promise.all([
                fetch(`${API_URL}/api/users/nurses`, {
                    headers,
                }),
                fetch(`${API_URL}/api/wards`, {
                    headers,
                }),
                fetch(`${API_URL}/api/rosters/shifts`, {
                    headers,
                }),
            ]);

            const nursesData = await nursesResponse.json();
            const wardsData = await wardsResponse.json();
            const shiftsData = await shiftsResponse.json();

            if (!nursesResponse.ok) {
                throw new Error(
                    nursesData.message || "Failed to load nurses"
                );
            }

            if (!wardsResponse.ok) {
                throw new Error(
                    wardsData.message || "Failed to load wards"
                );
            }

            if (!shiftsResponse.ok) {
                throw new Error(
                    shiftsData.message || "Failed to load shifts"
                );
            }

            setNurses(
                nursesData.nurses.filter(
                    (nurse: Nurse) => nurse.is_active
                )
            );

            setWards(
                wardsData.wards.filter(
                    (ward: Ward) => ward.is_active
                )
            );

            setShifts(shiftsData.shifts);
        } catch (error) {
            Alert.alert(
                "Error",
                error instanceof Error
                    ? error.message
                    : "Failed to load assignment options"
            );
        }
    }

    function getRosterDates() {
        if (!roster) {
            return [];
        }

        const dates: string[] = [];

        const current = new Date(
            `${roster.week_start_date}T00:00:00Z`
        );

        for (let i = 0; i < 7; i++) {
            dates.push(
                current.toISOString().split("T")[0]
            );

            current.setUTCDate(
                current.getUTCDate() + 1
            );
        }

        return dates;
    }

    async function submitAssignment() {
        if (
            !selectedDate ||
            !selectedNurse ||
            !selectedWard ||
            !selectedShift
        ) {
            Alert.alert(
                "Missing Information",
                "Please select date, nurse, ward and shift."
            );
            return;
        }

        try {
            setSubmitting(true);

            const token = await getStoredToken();

            if (!token) {
                router.replace("/");
                return;
            }

            const response = await fetch(
                `${API_URL}/api/rosters/assignments`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        rosterId: Number(id),
                        nurseId: Number(selectedNurse),
                        wardId: Number(selectedWard),
                        shiftId: Number(selectedShift),
                        shiftDate: selectedDate,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                        "Failed to create assignment"
                );
            }

            Alert.alert(
                "Success",
                "Roster assignment created successfully."
            );

            setSelectedDate("");
            setSelectedNurse("");
            setSelectedWard("");
            setSelectedShift("");
            setShowForm(false);

            await loadRoster();
        } catch (error) {
            Alert.alert(
                "Assignment Failed",
                error instanceof Error
                    ? error.message
                    : "Failed to create assignment"
            );
        } finally {
            setSubmitting(false);
        }
    }

    async function openOverrideForm(assignment: Assignment) {
        await loadAssignmentOptions();

        setOverrideAssignment(assignment);
        setReplacementNurse("");
        setOverrideReason("");
    }

    function closeOverrideForm() {
        setOverrideAssignment(null);
        setReplacementNurse("");
        setOverrideReason("");
    }

    async function submitOverride() {
        if (!overrideAssignment) {
            return;
        }

        if (!replacementNurse || !overrideReason.trim()) {
            Alert.alert(
                "Missing Information",
                "Please select a replacement nurse and enter a reason."
            );
            return;
        }

        try {
            setOverrideSubmitting(true);

            const token = await getStoredToken();

            if (!token) {
                router.replace("/");
                return;
            }

            const response = await fetch(
                `${API_URL}/api/roster-overrides`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        assignmentId: Number(
                            overrideAssignment.assignment_id
                        ),
                        replacementNurseId: Number(
                            replacementNurse
                        ),
                        reason: overrideReason.trim(),
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                        "Failed to replace nurse"
                );
            }

            Alert.alert(
                "Replacement Recorded",
                "The nurse replacement has been recorded."
            );

            closeOverrideForm();

            await loadRoster();
        } catch (error) {
            Alert.alert(
                "Replacement Failed",
                error instanceof Error
                    ? error.message
                    : "Failed to replace nurse"
            );
        } finally {
            setOverrideSubmitting(false);
        }
    }

    useEffect(() => {
        if (id) {
            loadRoster();
        }
    }, [id]);

    if (loading) {
        return (
            <View style={styles.container}>
                <Text style={styles.message}>
                    Loading roster...
                </Text>
            </View>
        );
    }

    if (!roster) {
        return (
            <View style={styles.container}>
                <Text style={styles.message}>
                    Roster could not be loaded.
                </Text>

                <Pressable
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Text style={styles.backButtonText}>
                        ← Back
                    </Text>
                </Pressable>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView>
                <Pressable
                    style={styles.backLink}
                    onPress={() => router.back()}
                >
                    <Text style={styles.backLinkText}>
                        ← Back to Rosters
                    </Text>
                </Pressable>

                <Text style={styles.title}>
                    Weekly Roster
                </Text>

                <Text style={styles.dateRange}>
                    {roster.week_start_date} –{" "}
                    {roster.week_end_date}
                </Text>

                <Text style={styles.status}>
                    Status: {roster.status}
                </Text>

                <Text style={styles.sectionTitle}>
                    Assignments
                </Text>

                {roster.assignments.length === 0 ? (
                    <Text style={styles.message}>
                        No assignments yet.
                    </Text>
                ) : (
                    roster.assignments.map((assignment) => (
                        <View
                            key={assignment.assignment_id}
                            style={styles.assignmentCard}
                        >
                            <Text
                                style={styles.assignmentDate}
                            >
                                {assignment.shift_date}
                            </Text>

                            {assignment.is_primary && (
                                <Text style={styles.primaryBadge}>
                                    PRIMARY
                                </Text>
                            )}

                            {assignment.replacement_nurse_id ? (
                                <>
                                    <Text
                                        style={
                                            styles.originalLabel
                                        }
                                    >
                                        Original nurse
                                    </Text>

                                    <Text
                                        style={
                                            styles.assignmentNurse
                                        }
                                    >
                                        {assignment.nurse_name}
                                    </Text>

                                    <Text
                                        style={
                                            styles.replacementLabel
                                        }
                                    >
                                        Replacement nurse
                                    </Text>

                                    <Text
                                        style={
                                            styles.replacementNurse
                                        }
                                    >
                                        {
                                            assignment.replacement_nurse_name
                                        }
                                    </Text>

                                    <Text
                                        style={
                                            styles.overrideReason
                                        }
                                    >
                                        Reason:{" "}
                                        {
                                            assignment.override_reason
                                        }
                                    </Text>
                                </>
                            ) : (
                                <Text
                                    style={
                                        styles.assignmentNurse
                                    }
                                >
                                    {assignment.nurse_name}
                                </Text>
                            )}

                            <Text
                                style={
                                    styles.assignmentDetails
                                }
                            >
                                {assignment.ward_name}
                            </Text>

                            <Text
                                style={
                                    styles.assignmentDetails
                                }
                            >
                                {assignment.shift_name}{" "}
                                {assignment.start_time.slice(0, 5)}
                                {" – "}
                                {assignment.end_time.slice(
                                    0,
                                    5
                                )}
                            </Text>

                            {roster.status === "DRAFT" && (
                                <Pressable
                                    style={
                                        styles.replaceButton
                                    }
                                    onPress={() =>
                                        openOverrideForm(
                                            assignment
                                        )
                                    }
                                >
                                    <Text
                                        style={
                                            styles.replaceButtonText
                                        }
                                    >
                                        Replace Nurse
                                    </Text>
                                </Pressable>
                            )}
                        </View>
                    ))
                )}

                {overrideAssignment && (
                    <View style={styles.overrideForm}>
                        <Text style={styles.formTitle}>
                            Replace Nurse
                        </Text>

                        <Text style={styles.formInfo}>
                            Assignment:{" "}
                            {overrideAssignment.shift_date}
                        </Text>

                        <Text style={styles.formInfo}>
                            Ward:{" "}
                            {overrideAssignment.ward_name}
                        </Text>

                        <Text style={styles.formInfo}>
                            Shift:{" "}
                            {overrideAssignment.shift_name}
                        </Text>

                        <Text style={styles.label}>
                            Current Nurse
                        </Text>

                        <Text style={styles.currentNurse}>
                            {overrideAssignment.nurse_name}
                        </Text>

                        <Text style={styles.label}>
                            Replacement Nurse
                        </Text>

                        {nurses
                            .filter(
                                (nurse) =>
                                    nurse.user_id !==
                                    overrideAssignment.nurse_id
                            )
                            .map((nurse) => (
                                <Pressable
                                    key={nurse.user_id}
                                    style={[
                                        styles.option,
                                        replacementNurse ===
                                            nurse.user_id &&
                                            styles.selectedOption,
                                    ]}
                                    onPress={() =>
                                        setReplacementNurse(
                                            nurse.user_id
                                        )
                                    }
                                >
                                    <Text>
                                        {nurse.full_name}
                                    </Text>
                                </Pressable>
                            ))}

                        <Text style={styles.label}>
                            Reason
                        </Text>

                        <TextInput
                            style={styles.reasonInput}
                            placeholder="Enter reason for replacement"
                            value={overrideReason}
                            onChangeText={
                                setOverrideReason
                            }
                            multiline
                        />

                        <Pressable
                            style={styles.submitButton}
                            onPress={submitOverride}
                            disabled={
                                overrideSubmitting
                            }
                        >
                            {overrideSubmitting ? (
                                <ActivityIndicator />
                            ) : (
                                <Text
                                    style={
                                        styles.submitButtonText
                                    }
                                >
                                    Confirm Replacement
                                </Text>
                            )}
                        </Pressable>

                        <Pressable
                            style={styles.cancelButton}
                            onPress={closeOverrideForm}
                        >
                            <Text>Cancel</Text>
                        </Pressable>
                    </View>
                )}

                {showForm && (
                    <View style={styles.form}>
                        <Text style={styles.formTitle}>
                            Add Assignment
                        </Text>

                        <Text style={styles.label}>
                            Date
                        </Text>

                        {getRosterDates().map((date) => (
                            <Pressable
                                key={date}
                                style={[
                                    styles.option,
                                    selectedDate ===
                                        date &&
                                        styles.selectedOption,
                                ]}
                                onPress={() =>
                                    setSelectedDate(
                                        date
                                    )
                                }
                            >
                                <Text>{date}</Text>
                            </Pressable>
                        ))}

                        <Text style={styles.label}>
                            Nurse
                        </Text>

                        {nurses.map((nurse) => (
                            <Pressable
                                key={nurse.user_id}
                                style={[
                                    styles.option,
                                    selectedNurse ===
                                        nurse.user_id &&
                                        styles.selectedOption,
                                ]}
                                onPress={() =>
                                    setSelectedNurse(
                                        nurse.user_id
                                    )
                                }
                            >
                                <Text>
                                    {nurse.full_name}
                                </Text>
                            </Pressable>
                        ))}

                        <Text style={styles.label}>
                            Ward
                        </Text>

                        {wards.map((ward) => (
                            <Pressable
                                key={ward.ward_id}
                                style={[
                                    styles.option,
                                    selectedWard ===
                                        ward.ward_id &&
                                        styles.selectedOption,
                                ]}
                                onPress={() =>
                                    setSelectedWard(
                                        ward.ward_id
                                    )
                                }
                            >
                                <Text>
                                    {ward.ward_name}
                                </Text>
                            </Pressable>
                        ))}

                        <Text style={styles.label}>
                            Shift
                        </Text>

                        {shifts.map((shift) => (
                            <Pressable
                                key={shift.shift_id}
                                style={[
                                    styles.option,
                                    selectedShift ===
                                        shift.shift_id &&
                                        styles.selectedOption,
                                ]}
                                onPress={() =>
                                    setSelectedShift(
                                        shift.shift_id
                                    )
                                }
                            >
                                <Text>
                                    {shift.shift_name}{" "}
                                    {shift.start_time.slice(
                                        0,
                                        5
                                    )}
                                    {" – "}
                                    {shift.end_time.slice(
                                        0,
                                        5
                                    )}
                                </Text>
                            </Pressable>
                        ))}

                        <Pressable
                            style={styles.submitButton}
                            onPress={submitAssignment}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <ActivityIndicator />
                            ) : (
                                <Text
                                    style={
                                        styles.submitButtonText
                                    }
                                >
                                    Create Assignment
                                </Text>
                            )}
                        </Pressable>

                        <Pressable
                            style={styles.cancelButton}
                            onPress={() => {
                                setSelectedDate("");
                                setSelectedNurse("");
                                setSelectedWard("");
                                setSelectedShift("");
                                setShowForm(false);
                            }}
                        >
                            <Text>Cancel</Text>
                        </Pressable>
                    </View>
                )}

                {roster.status === "DRAFT" && (
                    <Pressable
                        style={styles.addButton}
                        onPress={() => {
                            setShowForm(true);
                            loadAssignmentOptions();
                        }}
                    >
                        <Text style={styles.addButtonText}>
                            + Add Assignment
                        </Text>
                    </Pressable>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: "#fff",
    },

    backLink: {
        marginBottom: 20,
    },

    backLinkText: {
        fontSize: 16,
        fontWeight: "600",
    },

    title: {
        fontSize: 28,
        fontWeight: "700",
        marginBottom: 6,
    },

    dateRange: {
        fontSize: 18,
        marginBottom: 6,
    },

    status: {
        fontSize: 14,
        color: "#666",
        marginBottom: 24,
    },

    sectionTitle: {
        fontSize: 22,
        fontWeight: "700",
        marginBottom: 12,
    },

    assignmentCard: {
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 8,
        padding: 14,
        marginBottom: 12,
    },

    assignmentDate: {
        fontSize: 15,
        fontWeight: "700",
        marginBottom: 5,
    },

    primaryBadge: {
        fontSize: 11,
        fontWeight: "700",
        marginBottom: 8,
    },

    assignmentNurse: {
        fontSize: 18,
        fontWeight: "600",
        marginBottom: 4,
    },

    originalLabel: {
        fontSize: 12,
        color: "#777",
        marginTop: 2,
    },

    replacementLabel: {
        fontSize: 12,
        color: "#777",
        marginTop: 8,
    },

    replacementNurse: {
        fontSize: 18,
        fontWeight: "700",
        marginBottom: 4,
    },

    overrideReason: {
        fontSize: 13,
        color: "#666",
        marginTop: 4,
        marginBottom: 8,
    },

    assignmentDetails: {
        fontSize: 14,
        color: "#555",
        marginBottom: 2,
    },

    replaceButton: {
        borderWidth: 1,
        borderColor: "#222",
        padding: 10,
        borderRadius: 6,
        alignItems: "center",
        marginTop: 12,
    },

    replaceButtonText: {
        fontSize: 14,
        fontWeight: "600",
    },

    addButton: {
        backgroundColor: "#222",
        padding: 14,
        borderRadius: 8,
        alignItems: "center",
        marginTop: 8,
        marginBottom: 30,
    },

    addButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },

    message: {
        fontSize: 15,
        color: "#666",
        marginTop: 20,
    },

    backButton: {
        padding: 14,
        alignItems: "center",
        marginTop: 20,
    },

    backButtonText: {
        fontSize: 16,
        fontWeight: "600",
    },

    form: {
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 8,
        padding: 16,
        marginBottom: 20,
    },

    overrideForm: {
        borderWidth: 1,
        borderColor: "#bbb",
        borderRadius: 8,
        padding: 16,
        marginBottom: 20,
    },

    formTitle: {
        fontSize: 20,
        fontWeight: "700",
        marginBottom: 16,
    },

    formInfo: {
        fontSize: 14,
        color: "#555",
        marginBottom: 4,
    },

    currentNurse: {
        fontSize: 17,
        fontWeight: "600",
        marginBottom: 8,
    },

    label: {
        fontSize: 15,
        fontWeight: "600",
        marginTop: 12,
        marginBottom: 8,
    },

    option: {
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 6,
        padding: 12,
        marginBottom: 8,
    },

    selectedOption: {
        borderColor: "#222",
        backgroundColor: "#eee",
    },

    reasonInput: {
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 6,
        padding: 12,
        minHeight: 90,
        textAlignVertical: "top",
    },

    submitButton: {
        backgroundColor: "#222",
        padding: 14,
        borderRadius: 8,
        alignItems: "center",
        marginTop: 20,
    },

    submitButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },

    cancelButton: {
        padding: 14,
        alignItems: "center",
        marginTop: 4,
    },
});