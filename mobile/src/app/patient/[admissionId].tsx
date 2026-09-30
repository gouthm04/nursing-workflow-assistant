import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import {
    router,
    useFocusEffect,
    useLocalSearchParams,
} from "expo-router";
import { getStoredToken } from "../../services/auth";

const API_URL = "http://localhost:3000";

type Patient = {
    admission_id: number;
    patient_id: number;
    uhid: string;
    first_name: string;
    last_name: string | null;
    date_of_birth: string | null;
    gender: string | null;
    contact_number: string | null;
    chief_complaint: string | null;
    admission_status: string;
    admission_datetime: string;
    ward_id: number;
    ward_name: string;
    bed_id: number;
    bed_number: string;
    doctor_id: number;
    doctor_name: string;
};

type Vital = {
    vital_id: number;
    admission_id: number;
    recorded_by: number;
    recorded_at: string;

    systolic_bp: number | null;
    diastolic_bp: number | null;
    pulse_rate: number | null;
    spo2: number | string | null;
    temperature: number | string | null;
    respiratory_rate: number | null;
};

export default function PatientWorkspaceScreen() {
    const { admissionId } = useLocalSearchParams<{
        admissionId: string;
    }>();

    const [patient, setPatient] =
        useState<Patient | null>(null);

    const [loading, setLoading] = useState(true);
    const [vitals, setVitals] = useState<Vital[]>([]);
    const [vitalsLoading, setVitalsLoading] = useState(true);
    const [expandedVitalId, setExpandedVitalId] = useState<number | null>(null);

    useEffect(() => {
        loadPatient();
    }, [admissionId]);

    useFocusEffect(
    useCallback(() => {
            if (admissionId) {
                loadVitals();
            }
        }, [admissionId])
    );

    async function loadVitals() {
        try {
            setVitalsLoading(true);

            const token = await getStoredToken();

            if (!token) {
                return;
            }

            const response = await fetch(
                `${API_URL}/api/nurse/patients/${admissionId}/vitals`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Failed to load vitals"
                );
            }

            setVitals(data.vitals || []);
        } catch (error) {
            console.error("Load vitals error:", error);
        } finally {
            setVitalsLoading(false);
        }
    }

    async function loadPatient() {
        try {
            const token = await getStoredToken();

            if (!token) {
                router.replace("/");
                return;
            }

            const response = await fetch(
                `${API_URL}/api/nurse/patients/${admissionId}`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                        "Failed to load patient"
                );
            }

            setPatient(data.patient);
        } catch (error) {
            console.error(
                "Patient workspace error:",
                error
            );

            Alert.alert(
                "Error",
                error instanceof Error
                    ? error.message
                    : "Failed to load patient",
                [
                    {
                        text: "Go Back",
                        onPress: () => router.back(),
                    },
                ]
            );
        } finally {
            setLoading(false);
        }
    }

    function getPatientName() {
        if (!patient) {
            return "";
        }

        return `${patient.first_name}${
            patient.last_name
                ? ` ${patient.last_name}`
                : ""
        }`;
    }

    function formatAdmissionDate(
        date: string
    ) {
        return new Date(date).toLocaleDateString(
            "en-IN",
            {
                day: "2-digit",
                month: "short",
                year: "numeric",
            }
        );
    }

    function formatRecordedAt(dateString: string) {
        return new Date(dateString).toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    function displayValue(
        value: number | string | null,
        unit: string
    ) {
        if (value === null || value === undefined) {
            return "Not recorded";
        }

        return `${value} ${unit}`;
    }

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" />

                <Text style={styles.loadingText}>
                    Loading patient...
                </Text>
            </View>
        );
    }

    if (!patient) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.errorText}>
                    Patient information unavailable.
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Pressable
                    onPress={() => router.back()}
                    style={styles.backButton}
                >
                    <Text style={styles.backText}>
                        ← Back
                    </Text>
                </Pressable>

                <Text style={styles.title}>
                    Patient Workspace
                </Text>
            </View>

            <ScrollView
                contentContainerStyle={
                    styles.content
                }
            >
                <View style={styles.patientCard}>
                    <Text style={styles.patientName}>
                        {getPatientName()}
                    </Text>

                    <Text style={styles.uhid}>
                        UHID: {patient.uhid}
                    </Text>

                    <View style={styles.statusBadge}>
                        <Text
                            style={
                                styles.statusText
                            }
                        >
                            {patient.admission_status}
                        </Text>
                    </View>
                </View>

                <View style={styles.infoCard}>
                    <Text style={styles.sectionTitle}>
                        Patient Details
                    </Text>

                    <InfoRow
                        label="Bed"
                        value={`${patient.bed_number} · ${patient.ward_name}`}
                    />

                    <InfoRow
                        label="Doctor"
                        value={patient.doctor_name}
                    />

                    <InfoRow
                        label="Gender"
                        value={
                            patient.gender || "Not recorded"
                        }
                    />

                    <InfoRow
                        label="Date of Birth"
                        value={
                            patient.date_of_birth ||
                            "Not recorded"
                        }
                    />

                    <InfoRow
                        label="Contact"
                        value={
                            patient.contact_number ||
                            "Not recorded"
                        }
                    />

                    <InfoRow
                        label="Admission Date"
                        value={formatAdmissionDate(
                            patient.admission_datetime
                        )}
                    />
                </View>

                <View style={styles.infoCard}>
                    <Text style={styles.sectionTitle}>
                        Chief Complaint
                    </Text>

                    <Text style={styles.bodyText}>
                        {patient.chief_complaint ||
                            "No complaint recorded"}
                    </Text>
                </View>

                                {/* Vitals */}
                <View style={styles.infoCard}>
                    <Text style={styles.sectionTitle}>
                        Vitals
                    </Text>

                    {vitalsLoading ? (
                        <Text style={styles.mutedText}>
                            Loading vitals...
                        </Text>
                    ) : vitals.length === 0 ? (
                        <Text style={styles.mutedText}>
                            No vitals recorded yet.
                        </Text>
                    ) : (
                        <>
                            {/* Latest Vitals */}
                            <View style={styles.vitalsCard}>
                                <Text style={styles.vitalsCardTitle}>
                                    Latest Vitals
                                </Text>

                                <Text style={styles.vitalsTime}>
                                    {formatRecordedAt(
                                        vitals[0].recorded_at
                                    )}
                                </Text>

                                <VitalItem
                                    label="Blood Pressure"
                                    value={
                                        vitals[0].systolic_bp !== null &&
                                        vitals[0].diastolic_bp !== null
                                            ? `${vitals[0].systolic_bp} / ${vitals[0].diastolic_bp} mmHg`
                                            : "Not recorded"
                                    }
                                />

                                <VitalItem
                                    label="Pulse"
                                    value={displayValue(
                                        vitals[0].pulse_rate,
                                        "bpm"
                                    )}
                                />

                                <VitalItem
                                    label="SpO₂"
                                    value={displayValue(
                                        vitals[0].spo2,
                                        "%"
                                    )}
                                />

                                <VitalItem
                                    label="Temperature"
                                    value={displayValue(
                                        vitals[0].temperature,
                                        "°C"
                                    )}
                                />

                                <VitalItem
                                    label="Respiratory Rate"
                                    value={displayValue(
                                        vitals[0].respiratory_rate,
                                        "/min"
                                    )}
                                />
                            </View>

                            {/* Previous Records */}
                            {vitals.length > 1 && (
                                <View style={styles.previousVitals}>
                                    <Text style={styles.subsectionTitle}>
                                        Previous Records
                                    </Text>

                                    {vitals.slice(1).map((vital) => {
                                        const isExpanded =
                                            expandedVitalId ===
                                            vital.vital_id;

                                        return (
                                            <View
                                                key={vital.vital_id}
                                                style={styles.historyCard}
                                            >
                                                <Pressable
                                                    style={
                                                        styles.historyHeader
                                                    }
                                                    onPress={() =>
                                                        setExpandedVitalId(
                                                            isExpanded
                                                                ? null
                                                                : vital.vital_id
                                                        )
                                                    }
                                                >
                                                    <View>
                                                        <Text
                                                            style={
                                                                styles.historyDate
                                                            }
                                                        >
                                                            {formatRecordedAt(
                                                                vital.recorded_at
                                                            )}
                                                        </Text>

                                                        {!isExpanded && (
                                                            <Text
                                                                style={
                                                                    styles.historyPreview
                                                                }
                                                            >
                                                                {vital.systolic_bp !==
                                                                    null &&
                                                                vital.diastolic_bp !==
                                                                    null
                                                                    ? `BP ${vital.systolic_bp}/${vital.diastolic_bp}`
                                                                    : "BP not recorded"}
                                                                {"  •  "}
                                                                {vital.pulse_rate !==
                                                                null
                                                                    ? `Pulse ${vital.pulse_rate}`
                                                                    : "Pulse not recorded"}
                                                            </Text>
                                                        )}
                                                    </View>

                                                    <Text
                                                        style={
                                                            styles.expandIcon
                                                        }
                                                    >
                                                        {isExpanded
                                                            ? "▲"
                                                            : "▼"}
                                                    </Text>
                                                </Pressable>

                                                {isExpanded && (
                                                    <View
                                                        style={
                                                            styles.expandedVitals
                                                        }
                                                    >
                                                        <VitalItem
                                                            label="Blood Pressure"
                                                            value={
                                                                vital.systolic_bp !==
                                                                    null &&
                                                                vital.diastolic_bp !==
                                                                    null
                                                                    ? `${vital.systolic_bp} / ${vital.diastolic_bp} mmHg`
                                                                    : "Not recorded"
                                                            }
                                                        />

                                                        <VitalItem
                                                            label="Pulse"
                                                            value={displayValue(
                                                                vital.pulse_rate,
                                                                "bpm"
                                                            )}
                                                        />

                                                        <VitalItem
                                                            label="SpO₂"
                                                            value={displayValue(
                                                                vital.spo2,
                                                                "%"
                                                            )}
                                                        />

                                                        <VitalItem
                                                            label="Temperature"
                                                            value={displayValue(
                                                                vital.temperature,
                                                                "°C"
                                                            )}
                                                        />

                                                        <VitalItem
                                                            label="Respiratory Rate"
                                                            value={displayValue(
                                                                vital.respiratory_rate,
                                                                "/min"
                                                            )}
                                                        />
                                                    </View>
                                                )}
                                            </View>
                                        );
                                    })}
                                </View>
                            )}
                        </>
                    )}
                </View>

                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>
                        Patient Timeline
                    </Text>

                    <ActionButton
                        title="View Patient Timeline"
                        onPress={() =>
                            router.push(
                                `/patient/${admissionId}/timeline`
                            )
                        }
                    />
                </View>

                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>
                        AI Documentation
                    </Text>

                    <ActionButton
                        title="Create Documentation Draft"
                        onPress={() =>
                            router.push(
                                `/patient/${admissionId}/documentation`
                            )
                        }
                    />
                </View>

                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>
                        Nursing Care
                    </Text>

                    

                    <ActionButton
                        title="Record Vitals"
                        onPress={() =>
                            router.push(
                                `/patient/${admissionId}/vitals`
                            )
                        }
                    />

                    <ActionButton
                        title="Medication Administration"
                        onPress={() =>
                            router.push(
                                `/patient/${admissionId}/medications`
                            )
                        }
                    />

                    <ActionButton
                        title="Nursing Notes"
                        onPress={() =>
                            router.push(
                                `/patient/${admissionId}/nursing-notes`
                            )
                        }
                    />

                    <ActionButton
                        title="Clinical Events"
                        onPress={() =>
                            router.push(
                                `/patient/${admissionId}/clinical-events`
                            )
                        }
                    />

                    <ActionButton
                        title="Consumables"
                        onPress={() =>
                            router.push(
                                `/patient/${admissionId}/consumables`
                            )
                        }
                    />
                </View>
            </ScrollView>
        </View>
    );
}

function InfoRow({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>
                {label}
            </Text>

            <Text style={styles.infoValue}>
                {value}
            </Text>
        </View>
    );
}

function VitalItem({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <View style={styles.vitalItem}>
            <Text style={styles.vitalLabel}>{label}</Text>
            <Text style={styles.vitalValue}>{value}</Text>
        </View>
    );
}

function ActionButton({
    title,
    onPress,
}: {
    title: string;
    onPress: () => void;
}) {
    return (
        <Pressable
            style={styles.actionButton}
            onPress={onPress}
        >
            <Text style={styles.actionText}>
                {title}
            </Text>

            <Text style={styles.arrow}>
                →
            </Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f5f5f5",
    },

    header: {
        paddingTop: 55,
        paddingHorizontal: 20,
        paddingBottom: 16,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#ddd",
    },

    backButton: {
        marginBottom: 10,
    },

    backText: {
        fontSize: 16,
    },

    title: {
        fontSize: 28,
        fontWeight: "bold",
    },

    content: {
        padding: 20,
        paddingBottom: 40,
    },

    patientCard: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 20,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: "#ddd",
    },

    patientName: {
        fontSize: 25,
        fontWeight: "bold",
    },

    uhid: {
        fontSize: 15,
        color: "#555",
        marginTop: 5,
    },

    statusBadge: {
        alignSelf: "flex-start",
        marginTop: 12,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        backgroundColor: "#eee",
    },

    statusText: {
        fontSize: 13,
        fontWeight: "600",
    },

    infoCard: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 18,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: "#ddd",
    },

    sectionCard: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 18,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: "#ddd",
    },

    sectionTitle: {
        fontSize: 20,
        fontWeight: "bold",
        marginBottom: 14,
    },

    infoRow: {
        marginBottom: 12,
    },

    infoLabel: {
        fontSize: 13,
        color: "#777",
        marginBottom: 2,
    },

    infoValue: {
        fontSize: 16,
    },

    bodyText: {
        fontSize: 16,
        lineHeight: 23,
    },

    actionButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 15,
        paddingHorizontal: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 10,
    },

    actionText: {
        fontSize: 16,
        fontWeight: "600",
    },

    arrow: {
        fontSize: 18,
    },

    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f5f5f5",
    },

    loadingText: {
        marginTop: 12,
        fontSize: 15,
        color: "#666",
    },

    errorText: {
        fontSize: 16,
        color: "#666",
    },

    mutedText: {
    color: "#666",
    fontSize: 14,
},

subsectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
},

vitalsCard: {
    backgroundColor: "#fafafa",
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: "#eee",
},

vitalsCardTitle: {
    fontSize: 17,
    fontWeight: "700",
},

vitalsTime: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
    marginBottom: 12,
},

vitalItem: {
    paddingVertical: 5,
},

vitalLabel: {
    fontSize: 13,
    color: "#777",
},

vitalValue: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 2,
},

previousVitals: {
    marginTop: 18,
},

historyCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#eee",
    marginBottom: 8,
    overflow: "hidden",
},

historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
},

historyDate: {
    fontSize: 14,
    fontWeight: "600",
},

historyPreview: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
},

expandIcon: {
    fontSize: 12,
    color: "#555",
},

expandedVitals: {
    borderTopWidth: 1,
    borderTopColor: "#eee",
    padding: 12,
},

});