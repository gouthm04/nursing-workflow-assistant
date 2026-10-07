import React, { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";

import DashboardHeader from "../components/DashboardHeader";
import { getStoredToken } from "../services/auth";
import { API_URL } from "../constants/api";

type Admission = {
    admission_id: number;
    patient_id: number;
    uhid: string;
    first_name: string;
    last_name: string | null;
    gender: string | null;
    date_of_birth: string | null;
    status: string;
    admission_datetime: string;
    chief_complaint: string | null;
    doctor_id: number;
    doctor_name: string;
    ward_id: number;
    ward_name: string;
    bed_id: number;
    bed_number: string;
};

export default function CurrentPatientsScreen() {
    const [admissions, setAdmissions] = useState<Admission[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [dischargingId, setDischargingId] = useState<number | null>(null);

    useFocusEffect(
        useCallback(() => {
            loadAdmissions();
        }, [])
    );

    async function loadAdmissions() {
        try {
            const token = await getStoredToken();

            const response = await fetch(
                `${API_URL}/api/admissions/active`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Failed to load current patients"
                );
            }

            setAdmissions(data.admissions || []);
        } catch (error: any) {
            Alert.alert(
                "Error",
                error.message || "Could not load current patients"
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    async function handleRefresh() {
        setRefreshing(true);
        await loadAdmissions();
    }

    function confirmDischarge(admission: Admission) {
        const patientName = [
            admission.first_name,
            admission.last_name,
        ]
            .filter(Boolean)
            .join(" ");

        Alert.alert(
            "Discharge Patient",
            `${patientName}\n${admission.uhid}\n\nWard: ${admission.ward_name}\nBed: ${admission.bed_number}\n\nDischarging this patient will release the bed.`,
            [
                {
                    text: "Cancel",
                    style: "cancel",
                },
                {
                    text: "Confirm Discharge",
                    style: "destructive",
                    onPress: () => dischargePatient(admission),
                },
            ]
        );
    }

    async function dischargePatient(admission: Admission) {
        try {
            setDischargingId(admission.admission_id);

            const token = await getStoredToken();

            const response = await fetch(
                `${API_URL}/api/admissions/${admission.admission_id}/discharge`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Failed to discharge patient"
                );
            }

            Alert.alert(
                "Patient Discharged",
                `${admission.first_name} ${admission.last_name || ""}`.trim() +
                    " has been discharged successfully.",
                [
                    {
                        text: "OK",
                        onPress: loadAdmissions,
                    },
                ]
            );
        } catch (error: any) {
            Alert.alert(
                "Discharge Failed",
                error.message || "Could not discharge patient"
            );
        } finally {
            setDischargingId(null);
        }
    }

    function formatAdmissionDate(value: string) {
        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return value;
        }

        return date.toLocaleString();
    }

    return (
        <View style={styles.container}>
            <DashboardHeader />

            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                    />
                }
            >
                <View style={styles.headerRow}>
                    <View>
                        <Text style={styles.title}>
                            Current Patients
                        </Text>

                        <Text style={styles.subtitle}>
                            Patients currently admitted
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={styles.refreshButton}
                        onPress={handleRefresh}
                    >
                        <Text style={styles.refreshText}>
                            Refresh
                        </Text>
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" />
                        <Text style={styles.loadingText}>
                            Loading patients...
                        </Text>
                    </View>
                ) : admissions.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <Text style={styles.emptyTitle}>
                            No active patients
                        </Text>

                        <Text style={styles.emptyText}>
                            There are currently no admitted patients.
                        </Text>
                    </View>
                ) : (
                    admissions.map((admission) => {
                        const patientName = [
                            admission.first_name,
                            admission.last_name,
                        ]
                            .filter(Boolean)
                            .join(" ");

                        const isDischarging =
                            dischargingId === admission.admission_id;

                        return (
                            <View
                                key={admission.admission_id}
                                style={styles.patientCard}
                            >
                                <View style={styles.patientHeader}>
                                    <View style={styles.patientInfo}>
                                        <Text style={styles.patientName}>
                                            {patientName}
                                        </Text>

                                        <Text style={styles.uhid}>
                                            {admission.uhid}
                                        </Text>
                                    </View>

                                    <View style={styles.statusBadge}>
                                        <Text style={styles.statusText}>
                                            {admission.status}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.divider} />

                                <Text style={styles.detail}>
                                    Ward:{" "}
                                    <Text style={styles.detailValue}>
                                        {admission.ward_name}
                                    </Text>
                                </Text>

                                <Text style={styles.detail}>
                                    Bed:{" "}
                                    <Text style={styles.detailValue}>
                                        {admission.bed_number}
                                    </Text>
                                </Text>

                                <Text style={styles.detail}>
                                    Doctor:{" "}
                                    <Text style={styles.detailValue}>
                                        {admission.doctor_name}
                                    </Text>
                                </Text>

                                {admission.chief_complaint && (
                                    <Text style={styles.detail}>
                                        Chief complaint:{" "}
                                        <Text style={styles.detailValue}>
                                            {admission.chief_complaint}
                                        </Text>
                                    </Text>
                                )}

                                <Text style={styles.admissionDate}>
                                    Admitted:{" "}
                                    {formatAdmissionDate(
                                        admission.admission_datetime
                                    )}
                                </Text>

                                <TouchableOpacity
                                    style={[
                                        styles.dischargeButton,
                                        isDischarging &&
                                            styles.disabledButton,
                                    ]}
                                    onPress={() =>
                                        confirmDischarge(admission)
                                    }
                                    disabled={isDischarging}
                                >
                                    <Text style={styles.dischargeText}>
                                        {isDischarging
                                            ? "Discharging..."
                                            : "Discharge Patient"}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        );
                    })
                )}

                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Text style={styles.backText}>
                        Back
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f5f6f8",
    },

    content: {
        padding: 20,
        paddingBottom: 40,
    },

    headerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 20,
    },

    title: {
        fontSize: 26,
        fontWeight: "700",
    },

    subtitle: {
        fontSize: 15,
        color: "#666",
        marginTop: 5,
    },

    refreshButton: {
        borderWidth: 1,
        borderColor: "#d5d9df",
        backgroundColor: "#fff",
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 9,
    },

    refreshText: {
        fontSize: 14,
        fontWeight: "600",
    },

    center: {
        alignItems: "center",
        paddingVertical: 50,
    },

    loadingText: {
        marginTop: 10,
        color: "#666",
    },

    emptyCard: {
        backgroundColor: "#fff",
        borderRadius: 10,
        padding: 24,
        borderWidth: 1,
        borderColor: "#e0e3e7",
        alignItems: "center",
    },

    emptyTitle: {
        fontSize: 18,
        fontWeight: "700",
        marginBottom: 6,
    },

    emptyText: {
        fontSize: 14,
        color: "#666",
        textAlign: "center",
    },

    patientCard: {
        backgroundColor: "#fff",
        borderRadius: 10,
        padding: 18,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: "#e0e3e7",
    },

    patientHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },

    patientInfo: {
        flex: 1,
        marginRight: 10,
    },

    patientName: {
        fontSize: 19,
        fontWeight: "700",
    },

    uhid: {
        fontSize: 13,
        color: "#666",
        marginTop: 4,
    },

    statusBadge: {
        borderRadius: 14,
        paddingHorizontal: 10,
        paddingVertical: 5,
        backgroundColor: "#e8f5e9",
    },

    statusText: {
        fontSize: 12,
        fontWeight: "700",
    },

    divider: {
        height: 1,
        backgroundColor: "#eceef1",
        marginVertical: 14,
    },

    detail: {
        fontSize: 14,
        color: "#555",
        marginBottom: 7,
    },

    detailValue: {
        color: "#222",
        fontWeight: "600",
    },

    admissionDate: {
        fontSize: 12,
        color: "#777",
        marginTop: 4,
        marginBottom: 14,
    },

    dischargeButton: {
        backgroundColor: "#222",
        borderRadius: 8,
        paddingVertical: 13,
        alignItems: "center",
    },

    disabledButton: {
        opacity: 0.5,
    },

    dischargeText: {
        color: "#fff",
        fontSize: 15,
        fontWeight: "700",
    },

    backButton: {
        alignItems: "center",
        paddingVertical: 14,
        marginTop: 4,
    },

    backText: {
        fontSize: 15,
        fontWeight: "600",
    },
});