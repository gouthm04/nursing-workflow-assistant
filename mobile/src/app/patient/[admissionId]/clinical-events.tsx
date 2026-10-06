import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { getStoredToken } from "../../../services/auth";

import { API_URL } from "../../../constants/api";

type ClinicalEvent = {
    event_id: number;
    admission_id: number;
    recorded_by: number;
    event_type: string;
    event_time: string;
    description: string;
    doctor_notified: boolean;
    doctor_id: number | null;
    doctor_name: string | null;
    doctor_notification_time: string | null;
    immediate_action: string | null;
};

export default function ClinicalEventsScreen() {
    const { admissionId } = useLocalSearchParams<{
        admissionId: string;
    }>();

    const [eventType, setEventType] = useState("");
    const [description, setDescription] = useState("");
    const [immediateAction, setImmediateAction] =
        useState("");
    const [doctorNotified, setDoctorNotified] =
        useState(false);

    const [events, setEvents] = useState<ClinicalEvent[]>(
        []
    );
    const [loadingHistory, setLoadingHistory] =
        useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadClinicalEvents();
    }, [admissionId]);

    async function loadClinicalEvents() {
        try {
            setLoadingHistory(true);

            const token = await getStoredToken();

            if (!token) {
                router.replace("/");
                return;
            }

            const response = await fetch(
                `${API_URL}/api/nurse/patients/${admissionId}/clinical-events`,
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
                        "Failed to load clinical events"
                );
            }

            setEvents(data.events || []);
        } catch (error) {
            console.error(
                "Load clinical events error:",
                error
            );

            Alert.alert(
                "Error",
                error instanceof Error
                    ? error.message
                    : "Failed to load clinical events"
            );
        } finally {
            setLoadingHistory(false);
        }
    }

    async function saveClinicalEvent() {
        try {
            const token = await getStoredToken();

            if (!token) {
                router.replace("/");
                return;
            }

            if (!eventType.trim()) {
                Alert.alert(
                    "Missing Information",
                    "Enter the event type."
                );
                return;
            }

            if (!description.trim()) {
                Alert.alert(
                    "Missing Information",
                    "Enter the event description."
                );
                return;
            }

            setSaving(true);

            const response = await fetch(
                `${API_URL}/api/nurse/patients/${admissionId}/clinical-events`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        eventType: eventType.trim(),
                        description:
                            description.trim(),
                        immediateAction:
                            immediateAction.trim() !== ""
                                ? immediateAction.trim()
                                : undefined,
                        doctorNotified,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                        "Failed to record clinical event"
                );
            }

            Alert.alert(
                "Success",
                "Clinical event recorded successfully.",
                [
                    {
                        text: "OK",
                        onPress: () => {
                            setEventType("");
                            setDescription("");
                            setImmediateAction("");
                            setDoctorNotified(false);
                            loadClinicalEvents();
                        },
                    },
                ]
            );
        } catch (error) {
            console.error(
                "Record clinical event error:",
                error
            );

            Alert.alert(
                "Error",
                error instanceof Error
                    ? error.message
                    : "Failed to record clinical event"
            );
        } finally {
            setSaving(false);
        }
    }

    function formatEventTime(dateString: string) {
        return new Date(dateString).toLocaleString(
            "en-IN",
            {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            }
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={
                Platform.OS === "ios"
                    ? "padding"
                    : undefined
            }
        >
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
                    Clinical Events
                </Text>

                <Text style={styles.subtitle}>
                    Admission ID: {admissionId}
                </Text>
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>
                        Record Clinical Event
                    </Text>

                    <Text style={styles.label}>
                        Event Type
                    </Text>

                    <TextInput
                        style={styles.input}
                        value={eventType}
                        onChangeText={setEventType}
                        placeholder="e.g. Patient Complaint"
                    />

                    <Text style={styles.label}>
                        Description
                    </Text>

                    <TextInput
                        style={[
                            styles.input,
                            styles.textArea,
                        ]}
                        value={description}
                        onChangeText={setDescription}
                        placeholder="Describe what happened"
                        multiline
                        textAlignVertical="top"
                    />

                    <Text style={styles.label}>
                        Immediate Action (Optional)
                    </Text>

                    <TextInput
                        style={[
                            styles.input,
                            styles.textArea,
                        ]}
                        value={immediateAction}
                        onChangeText={setImmediateAction}
                        placeholder="Describe any immediate action taken"
                        multiline
                        textAlignVertical="top"
                    />

                    <Text style={styles.label}>
                        Doctor Notified?
                    </Text>

                    <View style={styles.choiceRow}>
                        <Pressable
                            style={[
                                styles.choiceButton,
                                !doctorNotified &&
                                    styles.selectedChoice,
                            ]}
                            onPress={() =>
                                setDoctorNotified(false)
                            }
                        >
                            <View
                                style={[
                                    styles.radio,
                                    !doctorNotified &&
                                        styles.radioSelected,
                                ]}
                            />

                            <Text
                                style={
                                    styles.choiceText
                                }
                            >
                                No
                            </Text>
                        </Pressable>

                        <Pressable
                            style={[
                                styles.choiceButton,
                                doctorNotified &&
                                    styles.selectedChoice,
                            ]}
                            onPress={() =>
                                setDoctorNotified(true)
                            }
                        >
                            <View
                                style={[
                                    styles.radio,
                                    doctorNotified &&
                                        styles.radioSelected,
                                ]}
                            />

                            <Text
                                style={
                                    styles.choiceText
                                }
                            >
                                Yes
                            </Text>
                        </Pressable>
                    </View>

                    {doctorNotified && (
                        <Text style={styles.infoText}>
                            The doctor assigned to this
                            admission will be recorded
                            automatically.
                        </Text>
                    )}

                    <Pressable
                        style={[
                            styles.saveButton,
                            saving &&
                                styles.disabledButton,
                        ]}
                        onPress={saveClinicalEvent}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text
                                style={
                                    styles.saveButtonText
                                }
                            >
                                Record Clinical Event
                            </Text>
                        )}
                    </Pressable>
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>
                        Clinical Event History
                    </Text>

                    {loadingHistory ? (
                        <View style={styles.historyLoading}>
                            <ActivityIndicator />

                            <Text
                                style={
                                    styles.loadingText
                                }
                            >
                                Loading clinical events...
                            </Text>
                        </View>
                    ) : events.length === 0 ? (
                        <Text style={styles.mutedText}>
                            No clinical events recorded
                            yet.
                        </Text>
                    ) : (
                        events.map((event) => (
                            <View
                                key={event.event_id}
                                style={styles.historyItem}
                            >
                                <Text
                                    style={
                                        styles.eventType
                                    }
                                >
                                    {event.event_type}
                                </Text>

                                <Text
                                    style={
                                        styles.eventDescription
                                    }
                                >
                                    {event.description}
                                </Text>

                                <Text
                                    style={
                                        styles.eventTime
                                    }
                                >
                                    {formatEventTime(
                                        event.event_time
                                    )}
                                </Text>

                                <View
                                    style={
                                        styles.divider
                                    }
                                />

                                <Text
                                    style={
                                        styles.detailText
                                    }
                                >
                                    Doctor Notified:{" "}
                                    <Text
                                        style={
                                            styles.detailValue
                                        }
                                    >
                                        {event.doctor_notified
                                            ? "Yes"
                                            : "No"}
                                    </Text>
                                </Text>

                                {event.doctor_notified &&
                                    event.doctor_name && (
                                        <Text
                                            style={
                                                styles.detailText
                                            }
                                        >
                                            Doctor:{" "}
                                            <Text
                                                style={
                                                    styles.detailValue
                                                }
                                            >
                                                {
                                                    event.doctor_name
                                                }
                                            </Text>
                                        </Text>
                                    )}

                                {event.immediate_action && (
                                    <Text style={styles.detailText}>
                                        Immediate Action:{" "}
                                        <Text style={styles.detailValue}>
                                            {event.immediate_action}
                                        </Text>
                                    </Text>
                                )}
                                </View>
                                ))
                            )}
                        </View>
            </ScrollView>
        </KeyboardAvoidingView>
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
        paddingBottom: 18,
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

    subtitle: {
        fontSize: 14,
        color: "#666",
        marginTop: 4,
    },

    content: {
        padding: 20,
        paddingBottom: 40,
    },

    card: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 18,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: "#ddd",
    },

    sectionTitle: {
        fontSize: 19,
        fontWeight: "bold",
        marginBottom: 14,
    },

    label: {
        fontSize: 14,
        color: "#666",
        marginBottom: 6,
        marginTop: 10,
    },

    input: {
        height: 50,
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        paddingHorizontal: 12,
        fontSize: 17,
        backgroundColor: "#fff",
    },

    textArea: {
        height: 110,
        paddingTop: 12,
    },

    choiceRow: {
        flexDirection: "row",
        gap: 10,
    },

    choiceButton: {
        flex: 1,
        height: 52,
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
    },

    selectedChoice: {
        borderColor: "#222",
        backgroundColor: "#f0f0f0",
    },

    radio: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: "#777",
        marginRight: 10,
    },

    radioSelected: {
        borderColor: "#222",
        backgroundColor: "#222",
    },

    choiceText: {
        fontSize: 16,
        fontWeight: "600",
    },

    infoText: {
        fontSize: 13,
        color: "#666",
        marginTop: 8,
    },

    saveButton: {
        height: 52,
        borderRadius: 10,
        backgroundColor: "#222",
        justifyContent: "center",
        alignItems: "center",
        marginTop: 18,
    },

    disabledButton: {
        opacity: 0.6,
    },

    saveButtonText: {
        color: "#fff",
        fontSize: 17,
        fontWeight: "bold",
    },

    historyLoading: {
        alignItems: "center",
        paddingVertical: 10,
    },

    loadingText: {
        marginTop: 8,
        fontSize: 14,
        color: "#666",
    },

    mutedText: {
        color: "#666",
        fontSize: 14,
    },

    historyItem: {
        borderWidth: 1,
        borderColor: "#eee",
        borderRadius: 10,
        padding: 14,
        marginBottom: 10,
        backgroundColor: "#fafafa",
    },

    eventType: {
        fontSize: 17,
        fontWeight: "700",
    },

    eventDescription: {
        fontSize: 15,
        lineHeight: 22,
        marginTop: 6,
    },

    eventTime: {
        fontSize: 13,
        color: "#666",
        marginTop: 8,
    },

    divider: {
        height: 1,
        backgroundColor: "#eee",
        marginVertical: 10,
    },

    detailText: {
        fontSize: 14,
        color: "#555",
        marginTop: 4,
        lineHeight: 20,
    },

    detailValue: {
        color: "#222",
        fontWeight: "600",
    },
});