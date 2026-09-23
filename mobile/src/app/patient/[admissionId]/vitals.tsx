import { useState } from "react";
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

const API_URL = "http://localhost:3000";

export default function RecordVitalsScreen() {
    const { admissionId } = useLocalSearchParams<{
        admissionId: string;
    }>();

    const [systolicBp, setSystolicBp] = useState("");
    const [diastolicBp, setDiastolicBp] = useState("");
    const [pulseRate, setPulseRate] = useState("");
    const [spo2, setSpo2] = useState("");
    const [temperature, setTemperature] = useState("");
    const [respiratoryRate, setRespiratoryRate] =
        useState("");

    const [saving, setSaving] = useState(false);

    async function saveVitals() {
        try {
            const token = await getStoredToken();

            if (!token) {
                router.replace("/");
                return;
            }

            const values = {
                systolicBp,
                diastolicBp,
                pulseRate,
                spo2,
                temperature,
                respiratoryRate,
            };

            const hasValue = Object.values(values).some(
                (value) => value.trim() !== ""
            );

            if (!hasValue) {
                Alert.alert(
                    "Missing Information",
                    "Enter at least one vital sign."
                );
                return;
            }

            if (
                spo2.trim() !== "" &&
                (Number(spo2) < 0 || Number(spo2) > 100)
            ) {
                Alert.alert(
                    "Invalid SpO₂",
                    "SpO₂ must be between 0 and 100."
                );
                return;
            }

            setSaving(true);

            const response = await fetch(
                `${API_URL}/api/nurse/patients/${admissionId}/vitals`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        systolicBp:
                            systolicBp.trim() !== ""
                                ? Number(systolicBp)
                                : undefined,

                        diastolicBp:
                            diastolicBp.trim() !== ""
                                ? Number(diastolicBp)
                                : undefined,

                        pulseRate:
                            pulseRate.trim() !== ""
                                ? Number(pulseRate)
                                : undefined,

                        spo2:
                            spo2.trim() !== ""
                                ? Number(spo2)
                                : undefined,

                        temperature:
                            temperature.trim() !== ""
                                ? Number(temperature)
                                : undefined,

                        respiratoryRate:
                            respiratoryRate.trim() !== ""
                                ? Number(
                                      respiratoryRate
                                  )
                                : undefined,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                        "Failed to record vitals"
                );
            }

            Alert.alert(
                "Success",
                "Vitals recorded successfully.",
                [
                    {
                        text: "OK",
                        onPress: () => router.back(),
                    },
                ]
            );
        } catch (error) {
            console.error(
                "Record vitals error:",
                error
            );

            Alert.alert(
                "Error",
                error instanceof Error
                    ? error.message
                    : "Failed to record vitals"
            );
        } finally {
            setSaving(false);
        }
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
                    Record Vitals
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
                        Blood Pressure
                    </Text>

                    <View style={styles.row}>
                        <View style={styles.halfField}>
                            <Text style={styles.label}>
                                Systolic
                            </Text>

                            <TextInput
                                style={styles.input}
                                value={systolicBp}
                                onChangeText={
                                    setSystolicBp
                                }
                                placeholder="e.g. 120"
                                keyboardType="numeric"
                                maxLength={3}
                            />
                        </View>

                        <View style={styles.halfField}>
                            <Text style={styles.label}>
                                Diastolic
                            </Text>

                            <TextInput
                                style={styles.input}
                                value={diastolicBp}
                                onChangeText={
                                    setDiastolicBp
                                }
                                placeholder="e.g. 80"
                                keyboardType="numeric"
                                maxLength={3}
                            />
                        </View>
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>
                        Pulse Rate
                    </Text>

                    <Text style={styles.label}>
                        Beats per minute
                    </Text>

                    <TextInput
                        style={styles.input}
                        value={pulseRate}
                        onChangeText={setPulseRate}
                        placeholder="e.g. 72"
                        keyboardType="numeric"
                        maxLength={3}
                    />
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>
                        SpO₂
                    </Text>

                    <Text style={styles.label}>
                        Oxygen saturation (%)
                    </Text>

                    <TextInput
                        style={styles.input}
                        value={spo2}
                        onChangeText={setSpo2}
                        placeholder="e.g. 98"
                        keyboardType="decimal-pad"
                        maxLength={5}
                    />
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>
                        Temperature
                    </Text>

                    <Text style={styles.label}>
                        Temperature (°C)
                    </Text>

                    <TextInput
                        style={styles.input}
                        value={temperature}
                        onChangeText={setTemperature}
                        placeholder="e.g. 36.8"
                        keyboardType="decimal-pad"
                        maxLength={4}
                    />
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>
                        Respiratory Rate
                    </Text>

                    <Text style={styles.label}>
                        Breaths per minute
                    </Text>

                    <TextInput
                        style={styles.input}
                        value={respiratoryRate}
                        onChangeText={
                            setRespiratoryRate
                        }
                        placeholder="e.g. 16"
                        keyboardType="numeric"
                        maxLength={3}
                    />
                </View>

                <Pressable
                    style={[
                        styles.saveButton,
                        saving &&
                            styles.disabledButton,
                    ]}
                    onPress={saveVitals}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator
                            color="#fff"
                        />
                    ) : (
                        <Text
                            style={styles.saveButtonText}
                        >
                            Save Vitals
                        </Text>
                    )}
                </Pressable>
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

    row: {
        flexDirection: "row",
        gap: 12,
    },

    halfField: {
        flex: 1,
    },

    label: {
        fontSize: 14,
        color: "#666",
        marginBottom: 6,
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

    saveButton: {
        height: 52,
        borderRadius: 10,
        backgroundColor: "#222",
        justifyContent: "center",
        alignItems: "center",
        marginTop: 4,
    },

    disabledButton: {
        opacity: 0.6,
    },

    saveButtonText: {
        color: "#fff",
        fontSize: 17,
        fontWeight: "bold",
    },
});