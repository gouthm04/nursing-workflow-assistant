import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { router } from "expo-router";
import { getStoredToken } from "../services/auth";

const API_URL = "http://localhost:3000";

type Patient = {
    admission_id: number;
    patient_id: number;
    uhid: string;
    first_name: string;
    last_name: string | null;
    date_of_birth: string | null;
    gender: string | null;
    bed_id: number;
    bed_number: string;
    ward_id: number;
    ward_name: string;
    doctor_id: number;
    doctor_name: string;
    chief_complaint: string | null;
    status: string;
    admission_datetime: string;
};

export default function MyPatientsScreen() {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadPatients();
    }, []);

    async function loadPatients() {
        try {
            const token = await getStoredToken();

            if (!token) {
                router.replace("/");
                return;
            }

            const response = await fetch(
                `${API_URL}/api/nurse/patients`,
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
                    "Failed to load patients"
                );
            }

            setPatients(data.patients);

        } catch (error) {
            console.error(
                "My patients error:",
                error
            );

            Alert.alert(
                "Error",
                error instanceof Error
                    ? error.message
                    : "Failed to load patients"
            );
        } finally {
            setLoading(false);
        }
    }

    function getPatientName(patient: Patient) {
        return `${patient.first_name}${
            patient.last_name
                ? ` ${patient.last_name}`
                : ""
        }`;
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
                    My Patients
                </Text>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" />

                    <Text style={styles.loadingText}>
                        Loading patients...
                    </Text>
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={
                        styles.content
                    }
                >
                    {patients.length === 0 ? (
                        <View
                            style={
                                styles.emptyCard
                            }
                        >
                            <Text
                                style={
                                    styles.emptyTitle
                                }
                            >
                                No patients
                            </Text>

                            <Text
                                style={
                                    styles.emptyText
                                }
                            >
                                There are no currently
                                admitted patients in
                                your assigned ward.
                            </Text>
                        </View>
                    ) : (
                        <>
                            <View
                                style={
                                    styles.summaryCard
                                }
                            >
                                <Text
                                    style={
                                        styles.wardName
                                    }
                                >
                                    {patients[0].ward_name}
                                </Text>

                                <Text
                                    style={
                                        styles.patientCount
                                    }
                                >
                                    {patients.length}{" "}
                                    {patients.length === 1
                                        ? "patient"
                                        : "patients"}
                                </Text>
                            </View>

                            {patients.map(
                                (patient) => (
                                    <Pressable
                                        key={
                                            patient.admission_id
                                        }
                                        style={
                                            styles.patientCard
                                        }
                                        onPress={() =>
                                            Alert.alert(
                                                "Coming Soon",
                                                "Patient workspace will be added next."
                                            )
                                        }
                                    >
                                        <View
                                            style={
                                                styles.patientHeader
                                            }
                                        >
                                            <Text
                                                style={
                                                    styles.patientName
                                                }
                                            >
                                                {getPatientName(
                                                    patient
                                                )}
                                            </Text>

                                            <Text
                                                style={
                                                    styles.bedNumber
                                                }
                                            >
                                                Bed{" "}
                                                {
                                                    patient.bed_number
                                                }
                                            </Text>
                                        </View>

                                        <Text
                                            style={
                                                styles.uhid
                                            }
                                        >
                                            UHID:{" "}
                                            {patient.uhid}
                                        </Text>

                                        <Text
                                            style={
                                                styles.doctor
                                            }
                                        >
                                            Doctor:{" "}
                                            {
                                                patient.doctor_name
                                            }
                                        </Text>

                                        {patient.chief_complaint && (
                                            <Text
                                                style={
                                                    styles.complaint
                                                }
                                            >
                                                Complaint:{" "}
                                                {
                                                    patient.chief_complaint
                                                }
                                            </Text>
                                        )}

                                        <Text
                                            style={
                                                styles.viewText
                                            }
                                        >
                                            View Patient →
                                        </Text>
                                    </Pressable>
                                )
                            )}
                        </>
                    )}
                </ScrollView>
            )}
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

    summaryCard: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 18,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: "#ddd",
    },

    wardName: {
        fontSize: 22,
        fontWeight: "bold",
    },

    patientCount: {
        fontSize: 15,
        color: "#666",
        marginTop: 4,
    },

    patientCard: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 18,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#ddd",
    },

    patientHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },

    patientName: {
        fontSize: 20,
        fontWeight: "bold",
        flex: 1,
    },

    bedNumber: {
        fontSize: 15,
        fontWeight: "600",
    },

    uhid: {
        fontSize: 14,
        color: "#555",
        marginBottom: 5,
    },

    doctor: {
        fontSize: 14,
        color: "#555",
        marginBottom: 5,
    },

    complaint: {
        fontSize: 14,
        color: "#555",
        marginBottom: 10,
    },

    viewText: {
        fontSize: 15,
        fontWeight: "600",
        marginTop: 6,
    },

    emptyCard: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 20,
        borderWidth: 1,
        borderColor: "#ddd",
    },

    emptyTitle: {
        fontSize: 20,
        fontWeight: "bold",
        marginBottom: 6,
    },

    emptyText: {
        fontSize: 15,
        color: "#666",
        lineHeight: 22,
    },

    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },

    loadingText: {
        marginTop: 12,
        fontSize: 15,
        color: "#666",
    },
});