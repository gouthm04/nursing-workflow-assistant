import React, { useCallback, useState } from "react";
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
import { getStoredToken } from "../../../services/auth";

const API_URL = "http://localhost:3000";

type TimelineType =
    | "VITAL"
    | "MEDICATION"
    | "NURSING_NOTE"
    | "CLINICAL_EVENT"
    | "CONSUMABLE";

type TimelineItem = {
    type: TimelineType;
    record_id: number;
    timestamp: string;
    title: string;
    details: Record<string, unknown>;
    recorded_by: {
        user_id: number;
        name: string;
    };
};

export default function PatientTimelineScreen() {
    const { admissionId } =
        useLocalSearchParams<{
            admissionId: string;
        }>();

    const [timeline, setTimeline] = useState<
        TimelineItem[]
    >([]);

    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            if (admissionId) {
                loadTimeline();
            }
        }, [admissionId])
    );

    async function loadTimeline() {
        try {
            setLoading(true);

            const token = await getStoredToken();

            if (!token) {
                router.replace("/");
                return;
            }

            const response = await fetch(
                `${API_URL}/api/nurse/patients/${admissionId}/timeline`,
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
                        "Failed to load patient timeline"
                );
            }

            setTimeline(data.timeline || []);
        } catch (error) {
            console.error(
                "Load patient timeline error:",
                error
            );

            Alert.alert(
                "Error",
                error instanceof Error
                    ? error.message
                    : "Failed to load patient timeline"
            );
        } finally {
            setLoading(false);
        }
    }

    function formatDate(timestamp: string) {
        return new Date(timestamp).toLocaleDateString(
            "en-IN",
            {
                day: "2-digit",
                month: "short",
                year: "numeric",
            }
        );
    }

    function formatTime(timestamp: string) {
        return new Date(timestamp).toLocaleTimeString(
            "en-IN",
            {
                hour: "2-digit",
                minute: "2-digit",
            }
        );
    }

    function renderDetails(item: TimelineItem) {
        const details = item.details;

        switch (item.type) {
            case "VITAL":
                return (
                    <View>
                        <DetailRow
                            label="Blood Pressure"
                            value={
                                details.systolic_bp !== null &&
                                details.systolic_bp !== undefined &&
                                details.diastolic_bp !== null &&
                                details.diastolic_bp !== undefined
                                    ? `${details.systolic_bp} / ${details.diastolic_bp} mmHg`
                                    : "Not recorded"
                            }
                        />

                        <DetailRow
                            label="Pulse"
                            value={
                                details.pulse_rate !== null &&
                                details.pulse_rate !== undefined
                                    ? `${details.pulse_rate} bpm`
                                    : "Not recorded"
                            }
                        />

                        <DetailRow
                            label="SpO₂"
                            value={
                                details.spo2 !== null &&
                                details.spo2 !== undefined
                                    ? `${details.spo2}%`
                                    : "Not recorded"
                            }
                        />

                        <DetailRow
                            label="Temperature"
                            value={
                                details.temperature !== null &&
                                details.temperature !== undefined
                                    ? `${details.temperature} °C`
                                    : "Not recorded"
                            }
                        />

                        <DetailRow
                            label="Respiratory Rate"
                            value={
                                details.respiratory_rate !== null &&
                                details.respiratory_rate !== undefined
                                    ? `${details.respiratory_rate} /min`
                                    : "Not recorded"
                            }
                        />
                    </View>
                );

            case "MEDICATION":
                return (
                    <View>
                        <DetailRow
                            label="Medication"
                            value={String(
                                details.drug_name
                            )}
                        />

                        <DetailRow
                            label="Dosage"
                            value={String(
                                details.dosage
                            )}
                        />

                        <DetailRow
                            label="Route"
                            value={String(
                                details.route
                            )}
                        />

                        {details.notes !== null &&
                            details.notes !== undefined && (
                                <DetailRow
                                    label="Notes"
                                    value={String(
                                        details.notes
                                    )}
                                />
                            )}
                    </View>
                );

            case "NURSING_NOTE":
                return (
                    <View>
                        <DetailRow
                            label="Type"
                            value={String(
                                details.note_type
                            )}
                        />

                        <DetailRow
                            label="Note"
                            value={String(
                                details.content
                            )}
                        />
                    </View>
                );

            case "CLINICAL_EVENT":
                return (
                    <View>
                        <DetailRow
                            label="Description"
                            value={String(
                                details.description
                            )}
                        />

                        <DetailRow
                            label="Doctor Notified"
                            value={
                                details.doctor_notified
                                    ? `Yes${
                                          details.doctor_name
                                              ? ` — ${details.doctor_name}`
                                              : ""
                                      }`
                                    : "No"
                            }
                        />

                        {details.immediate_action !==
                            null &&
                            details.immediate_action !==
                                undefined && (
                                <DetailRow
                                    label="Immediate Action"
                                    value={String(
                                        details.immediate_action
                                    )}
                                />
                            )}
                    </View>
                );

            case "CONSUMABLE":
                return (
                    <View>
                        <DetailRow
                            label="Consumable"
                            value={String(
                                details.name
                            )}
                        />

                        <DetailRow
                            label="Quantity"
                            value={`${details.quantity} ${details.unit}`}
                        />

                        {details.used_for_type !==
                            null &&
                            details.used_for_type !==
                                undefined && (
                                <DetailRow
                                    label="Used For"
                                    value={String(
                                        details.used_for_type
                                    )}
                                />
                            )}
                    </View>
                );

            default:
                return null;
        }
    }

    function getTypeLabel(type: TimelineType) {
        switch (type) {
            case "VITAL":
                return "Vitals";

            case "MEDICATION":
                return "Medication";

            case "NURSING_NOTE":
                return "Nursing Note";

            case "CLINICAL_EVENT":
                return "Clinical Event";

            case "CONSUMABLE":
                return "Consumable";

            default:
                return type;
        }
    }

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" />

                <Text style={styles.loadingText}>
                    Loading timeline...
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
                    Patient Timeline
                </Text>
            </View>

            <ScrollView
                contentContainerStyle={
                    styles.content
                }
            >
                {timeline.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <Text style={styles.emptyTitle}>
                            No timeline records
                        </Text>

                        <Text style={styles.emptyText}>
                            No patient-care records have
                            been documented yet.
                        </Text>
                    </View>
                ) : (
                    timeline.map((item, index) => (
                        <View
                            key={`${item.type}-${item.record_id}`}
                            style={styles.timelineRow}
                        >
                            <View style={styles.timelineMarkerColumn}>
                                <View
                                    style={
                                        styles.timelineDot
                                    }
                                />

                                {index <
                                    timeline.length -
                                        1 && (
                                    <View
                                        style={
                                            styles.timelineLine
                                        }
                                    />
                                )}
                            </View>

                            <View
                                style={
                                    styles.timelineCard
                                }
                            >
                                <View
                                    style={
                                        styles.cardHeader
                                    }
                                >
                                    <Text
                                        style={
                                            styles.typeLabel
                                        }
                                    >
                                        {getTypeLabel(
                                            item.type
                                        )}
                                    </Text>

                                    <Text
                                        style={
                                            styles.timeText
                                        }
                                    >
                                        {formatTime(
                                            item.timestamp
                                        )}
                                    </Text>
                                </View>

                                <Text
                                    style={
                                        styles.dateText
                                    }
                                >
                                    {formatDate(
                                        item.timestamp
                                    )}
                                </Text>

                                <Text
                                    style={
                                        styles.cardTitle
                                    }
                                >
                                    {item.title}
                                </Text>

                                <View
                                    style={
                                        styles.details
                                    }
                                >
                                    {renderDetails(
                                        item
                                    )}
                                </View>

                                <Text
                                    style={
                                        styles.recordedBy
                                    }
                                >
                                    Recorded by{" "}
                                    {
                                        item.recorded_by
                                            .name
                                    }
                                </Text>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>
        </View>
    );
}

function DetailRow({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
                {label}
            </Text>

            <Text style={styles.detailValue}>
                {value}
            </Text>
        </View>
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

    timelineRow: {
        flexDirection: "row",
    },

    timelineMarkerColumn: {
        width: 24,
        alignItems: "center",
    },

    timelineDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: "#333",
        marginTop: 20,
    },

    timelineLine: {
        width: 2,
        flex: 1,
        backgroundColor: "#ccc",
        marginTop: 4,
        marginBottom: -4,
    },

    timelineCard: {
        flex: 1,
        backgroundColor: "#fff",
        borderRadius: 10,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#ddd",
    },

    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },

    typeLabel: {
        fontSize: 13,
        fontWeight: "700",
        textTransform: "uppercase",
    },

    timeText: {
        fontSize: 13,
        color: "#555",
    },

    dateText: {
        fontSize: 12,
        color: "#777",
        marginTop: 2,
    },

    cardTitle: {
        fontSize: 17,
        fontWeight: "700",
        marginTop: 8,
        marginBottom: 10,
    },

    details: {
        borderTopWidth: 1,
        borderTopColor: "#eee",
        paddingTop: 8,
    },

    detailRow: {
        marginBottom: 8,
    },

    detailLabel: {
        fontSize: 12,
        color: "#777",
    },

    detailValue: {
        fontSize: 14,
        marginTop: 2,
        lineHeight: 20,
    },

    recordedBy: {
        fontSize: 12,
        color: "#777",
        marginTop: 6,
    },

    emptyCard: {
        backgroundColor: "#fff",
        borderRadius: 10,
        padding: 20,
        borderWidth: 1,
        borderColor: "#ddd",
    },

    emptyTitle: {
        fontSize: 18,
        fontWeight: "700",
    },

    emptyText: {
        fontSize: 14,
        color: "#666",
        marginTop: 6,
        lineHeight: 20,
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
});