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

type Medication = {
    medication_admin_id: number;
    admission_id: number;
    recorded_by: number;
    drug_name: string;
    dosage: string;
    route: string;
    administered_at: string;
    notes: string | null;
};

export default function MedicationScreen() {
    const { admissionId } = useLocalSearchParams<{
        admissionId: string;
    }>();

    const [drugName, setDrugName] = useState("");
    const [dosage, setDosage] = useState("");
    const [route, setRoute] = useState("");
    const [notes, setNotes] = useState("");

    const [medications, setMedications] = useState<Medication[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadMedicationHistory();
    }, [admissionId]);

    async function loadMedicationHistory() {
        try {
            setLoadingHistory(true);

            const token = await getStoredToken();

            if (!token) {
                router.replace("/");
                return;
            }

            const response = await fetch(
                `${API_URL}/api/nurse/patients/${admissionId}/medications`,
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
                        "Failed to load medication history"
                );
            }

            setMedications(data.medications || []);
        } catch (error) {
            console.error(
                "Load medication history error:",
                error
            );

            Alert.alert(
                "Error",
                error instanceof Error
                    ? error.message
                    : "Failed to load medication history"
            );
        } finally {
            setLoadingHistory(false);
        }
    }

    async function saveMedication() {
        try {
            const token = await getStoredToken();

            if (!token) {
                router.replace("/");
                return;
            }

            if (!drugName.trim()) {
                Alert.alert(
                    "Missing Information",
                    "Enter the medicine name."
                );
                return;
            }

            if (!dosage.trim()) {
                Alert.alert(
                    "Missing Information",
                    "Enter the dosage."
                );
                return;
            }

            if (!route.trim()) {
                Alert.alert(
                    "Missing Information",
                    "Enter the route of administration."
                );
                return;
            }

            setSaving(true);

            const response = await fetch(
                `${API_URL}/api/nurse/patients/${admissionId}/medications`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        drugName: drugName.trim(),
                        dosage: dosage.trim(),
                        route: route.trim(),
                        notes:
                            notes.trim() !== ""
                                ? notes.trim()
                                : undefined,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                        "Failed to record medication"
                );
            }

            Alert.alert(
                "Success",
                "Medication administration recorded successfully.",
                [
                    {
                        text: "OK",
                        onPress: () => {
                            setDrugName("");
                            setDosage("");
                            setRoute("");
                            setNotes("");
                            loadMedicationHistory();
                        },
                    },
                ]
            );
        } catch (error) {
            console.error(
                "Record medication error:",
                error
            );

            Alert.alert(
                "Error",
                error instanceof Error
                    ? error.message
                    : "Failed to record medication"
            );
        } finally {
            setSaving(false);
        }
    }

    function formatAdministeredAt(
        dateString: string
    ) {
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
                    Medication Administration
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
                        Record Medication
                    </Text>

                    <Text style={styles.label}>
                        Medicine Name
                    </Text>

                    <TextInput
                        style={styles.input}
                        value={drugName}
                        onChangeText={setDrugName}
                        placeholder="e.g. Paracetamol"
                    />

                    <Text style={styles.label}>
                        Dosage
                    </Text>

                    <TextInput
                        style={styles.input}
                        value={dosage}
                        onChangeText={setDosage}
                        placeholder="e.g. 500 mg"
                    />

                    <Text style={styles.label}>
                        Route
                    </Text>

                    <TextInput
                        style={styles.input}
                        value={route}
                        onChangeText={setRoute}
                        placeholder="e.g. Oral"
                        autoCapitalize="words"
                    />

                    <Text style={styles.label}>
                        Notes (Optional)
                    </Text>

                    <TextInput
                        style={[
                            styles.input,
                            styles.notesInput,
                        ]}
                        value={notes}
                        onChangeText={setNotes}
                        placeholder="e.g. Given after food"
                        multiline
                        textAlignVertical="top"
                    />

                    <Pressable
                        style={[
                            styles.saveButton,
                            saving &&
                                styles.disabledButton,
                        ]}
                        onPress={saveMedication}
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
                                Record Medication
                            </Text>
                        )}
                    </Pressable>
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>
                        Medication History
                    </Text>

                    {loadingHistory ? (
                        <View style={styles.historyLoading}>
                            <ActivityIndicator />
                            <Text
                                style={
                                    styles.loadingText
                                }
                            >
                                Loading medication history...
                            </Text>
                        </View>
                    ) : medications.length === 0 ? (
                        <Text style={styles.mutedText}>
                            No medications recorded yet.
                        </Text>
                    ) : (
                        medications.map((medication) => (
                            <View
                                key={
                                    medication.medication_admin_id
                                }
                                style={
                                    styles.historyItem
                                }
                            >
                                <Text
                                    style={
                                        styles.medicationName
                                    }
                                >
                                    {medication.drug_name}
                                </Text>

                                <Text
                                    style={
                                        styles.medicationDetails
                                    }
                                >
                                    {medication.dosage} •{" "}
                                    {medication.route}
                                </Text>

                                <Text
                                    style={
                                        styles.medicationTime
                                    }
                                >
                                    {formatAdministeredAt(
                                        medication.administered_at
                                    )}
                                </Text>

                                {medication.notes && (
                                    <Text
                                        style={
                                            styles.medicationNotes
                                        }
                                    >
                                        Notes:{" "}
                                        {medication.notes}
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

    notesInput: {
        height: 90,
        paddingTop: 12,
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

    medicationName: {
        fontSize: 17,
        fontWeight: "700",
    },

    medicationDetails: {
        fontSize: 15,
        marginTop: 4,
    },

    medicationTime: {
        fontSize: 13,
        color: "#666",
        marginTop: 6,
    },

    medicationNotes: {
        fontSize: 14,
        color: "#555",
        marginTop: 6,
    },
});