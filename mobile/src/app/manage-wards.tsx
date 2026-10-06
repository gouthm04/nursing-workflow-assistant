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
import {
    useCallback,
    useEffect,
    useState,
} from "react";
import { router } from "expo-router";

import DashboardHeader from "../components/DashboardHeader";
import { getStoredToken } from "../services/auth";

import { API_URL } from "../constants/api";

type Ward = {
    ward_id: string;
    ward_name: string;
    ward_type: string | null;
    is_active: boolean;
    bed_count: number;
    available_beds: number;
    occupied_beds: number;
    maintenance_beds: number;
};

export default function ManageWards() {
    const [wards, setWards] = useState<Ward[]>([]);
    const [wardName, setWardName] = useState("");
    const [wardType, setWardType] = useState("");

    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);

    const loadWards = useCallback(async () => {
        try {
            setLoading(true);

            const token = await getStoredToken();

            const response = await fetch(
                `${API_URL}/api/wards`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Failed to load wards"
                );
            }

            setWards(data.wards);
        } catch (error) {
            console.error("Load wards error:", error);

            Alert.alert(
                "Error",
                error instanceof Error
                    ? error.message
                    : "Failed to load wards"
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadWards();
    }, [loadWards]);

    async function createWard() {
        if (!wardName.trim()) {
            Alert.alert(
                "Validation",
                "Ward name is required"
            );
            return;
        }

        try {
            setCreating(true);

            const token = await getStoredToken();

            const response = await fetch(
                `${API_URL}/api/wards`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        wardName: wardName.trim(),
                        wardType: wardType.trim() || undefined,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Failed to create ward"
                );
            }

            Alert.alert(
                "Success",
                "Ward created successfully"
            );

            setWardName("");
            setWardType("");

            await loadWards();
        } catch (error) {
            console.error("Create ward error:", error);

            Alert.alert(
                "Error",
                error instanceof Error
                    ? error.message
                    : "Failed to create ward"
            );
        } finally {
            setCreating(false);
        }
    }

    function confirmStatusChange(ward: Ward) {
        const action = ward.is_active
            ? "deactivate"
            : "activate";

        Alert.alert(
            `${action} ward?`,
            `Are you sure you want to ${action} ${ward.ward_name}?`,
            [
                {
                    text: "Cancel",
                    style: "cancel",
                },
                {
                    text: action,
                    onPress: () =>
                        updateWardStatus(
                            ward.ward_id,
                            !ward.is_active
                        ),
                },
            ]
        );
    }

    async function updateWardStatus(
        wardId: string,
        isActive: boolean
    ) {
        try {
            const token = await getStoredToken();

            const response = await fetch(
                `${API_URL}/api/wards/${wardId}/status`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        isActive,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                        "Failed to update ward status"
                );
            }

            await loadWards();
        } catch (error) {
            console.error(
                "Update ward status error:",
                error
            );

            Alert.alert(
                "Error",
                error instanceof Error
                    ? error.message
                    : "Failed to update ward status"
            );
        }
    }

    return (
        <View style={styles.container}>
            <DashboardHeader />

            <ScrollView
                contentContainerStyle={styles.content}
            >
                <Pressable
                    onPress={() => router.back()}
                    style={styles.backButton}
                >
                    <Text style={styles.backText}>
                        ← Back
                    </Text>
                </Pressable>

                <Text style={styles.title}>
                    Manage Wards
                </Text>

                <Text style={styles.subtitle}>
                    Create, view, activate and deactivate hospital wards
                </Text>

                <View style={styles.formCard}>
                    <Text style={styles.sectionTitle}>
                        Create Ward
                    </Text>

                    <TextInput
                        style={styles.input}
                        placeholder="Ward name"
                        value={wardName}
                        onChangeText={setWardName}
                    />

                    <TextInput
                        style={styles.input}
                        placeholder="Ward type (optional)"
                        value={wardType}
                        onChangeText={setWardType}
                    />

                    <Pressable
                        style={styles.primaryButton}
                        onPress={createWard}
                        disabled={creating}
                    >
                        {creating ? (
                            <ActivityIndicator />
                        ) : (
                            <Text style={styles.buttonText}>
                                Create Ward
                            </Text>
                        )}
                    </Pressable>
                </View>

                <View style={styles.listHeader}>
                    <Text style={styles.sectionTitle}>
                        Wards
                    </Text>

                    <Pressable
                        onPress={loadWards}
                        disabled={loading}
                    >
                        <Text style={styles.refreshText}>
                            Refresh
                        </Text>
                    </Pressable>
                </View>

                {loading ? (
                    <ActivityIndicator />
                ) : wards.length === 0 ? (
                    <Text style={styles.emptyText}>
                        No wards found.
                    </Text>
                ) : (
                    wards.map((ward) => (
                        <View
                            key={ward.ward_id}
                            style={styles.card}
                        >
                            <Text style={styles.cardTitle}>
                                {ward.ward_name}
                            </Text>

                            <Text style={styles.cardText}>
                                Type:{" "}
                                {ward.ward_type || "Not specified"}
                            </Text>

                            <Text style={styles.cardText}>
                                Beds: {ward.bed_count}
                            </Text>

                            <Text style={styles.cardText}>
                                Available: {ward.available_beds}
                            </Text>

                            <Text style={styles.cardText}>
                                Occupied: {ward.occupied_beds}
                            </Text>

                            <Text style={styles.cardText}>
                                Maintenance:{" "}
                                {ward.maintenance_beds}
                            </Text>

                            <Text
                                style={
                                    ward.is_active
                                        ? styles.active
                                        : styles.inactive
                                }
                            >
                                {ward.is_active
                                    ? "Active"
                                    : "Inactive"}
                            </Text>

                            <Pressable
                                style={styles.secondaryButton}
                                onPress={() =>
                                    confirmStatusChange(ward)
                                }
                            >
                                <Text style={styles.buttonText}>
                                    {ward.is_active
                                        ? "Deactivate"
                                        : "Activate"}
                                </Text>
                            </Pressable>
                        </View>
                    ))
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },

    content: {
        padding: 20,
        paddingBottom: 40,
    },

    backButton: {
        marginBottom: 12,
    },

    backText: {
        fontSize: 15,
    },

    title: {
        fontSize: 28,
        fontWeight: "bold",
        marginBottom: 8,
    },

    subtitle: {
        fontSize: 15,
        marginBottom: 24,
    },

    formCard: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 18,
        marginBottom: 24,
    },

    sectionTitle: {
        fontSize: 19,
        fontWeight: "bold",
    },

    input: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        marginTop: 12,
    },

    primaryButton: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        marginTop: 12,
        alignItems: "center",
    },

    secondaryButton: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 10,
        marginTop: 14,
        alignItems: "center",
    },

    buttonText: {
        fontWeight: "600",
    },

    listHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },

    refreshText: {
        fontWeight: "600",
    },

    card: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 18,
        marginBottom: 16,
    },

    cardTitle: {
        fontSize: 19,
        fontWeight: "bold",
        marginBottom: 8,
    },

    cardText: {
        fontSize: 14,
        marginBottom: 4,
    },

    active: {
        marginTop: 8,
        fontWeight: "600",
    },

    inactive: {
        marginTop: 8,
        fontWeight: "600",
    },

    emptyText: {
        fontSize: 14,
        marginTop: 8,
    },
});