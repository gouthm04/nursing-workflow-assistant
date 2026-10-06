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
    is_active: boolean;
};

type Bed = {
    bed_id: string;
    bed_number: string;
    status: string;
    ward_id: string;
    ward_name: string;
    ward_is_active: boolean;
};

export default function ManageBeds() {
    const [wards, setWards] = useState<Ward[]>([]);
    const [beds, setBeds] = useState<Bed[]>([]);

    const [selectedWardId, setSelectedWardId] = useState("");
    const [bedNumber, setBedNumber] = useState("");

    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);

            const token = await getStoredToken();

            const [wardsResponse, bedsResponse] =
                await Promise.all([
                    fetch(`${API_URL}/api/wards`, {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }),

                    fetch(`${API_URL}/api/beds`, {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }),
                ]);

            const wardsData = await wardsResponse.json();
            const bedsData = await bedsResponse.json();

            if (!wardsResponse.ok) {
                throw new Error(
                    wardsData.message ||
                        "Failed to load wards"
                );
            }

            if (!bedsResponse.ok) {
                throw new Error(
                    bedsData.message ||
                        "Failed to load beds"
                );
            }

            setWards(wardsData.wards);
            setBeds(bedsData.beds);
        } catch (error) {
            console.error(
                "Load bed management data error:",
                error
            );

            Alert.alert(
                "Error",
                error instanceof Error
                    ? error.message
                    : "Failed to load data"
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    async function createBed() {
        if (!selectedWardId) {
            Alert.alert(
                "Validation",
                "Please select a ward"
            );
            return;
        }

        if (!bedNumber.trim()) {
            Alert.alert(
                "Validation",
                "Bed number is required"
            );
            return;
        }

        try {
            setCreating(true);

            const token = await getStoredToken();

            const response = await fetch(
                `${API_URL}/api/beds`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        wardId: selectedWardId,
                        bedNumber: bedNumber.trim(),
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                        "Failed to create bed"
                );
            }

            Alert.alert(
                "Success",
                "Bed created successfully"
            );

            setBedNumber("");
            await loadData();
        } catch (error) {
            console.error(
                "Create bed error:",
                error
            );

            Alert.alert(
                "Error",
                error instanceof Error
                    ? error.message
                    : "Failed to create bed"
            );
        } finally {
            setCreating(false);
        }
    }

    function confirmStatusChange(bed: Bed) {
        if (bed.status === "OCCUPIED") {
            Alert.alert(
                "Bed occupied",
                "Occupied beds can only be released through patient discharge"
            );
            return;
        }

        const newStatus =
            bed.status === "AVAILABLE"
                ? "MAINTENANCE"
                : "AVAILABLE";

        Alert.alert(
            "Change bed status?",
            `Change ${bed.bed_number} from ${bed.status} to ${newStatus}?`,
            [
                {
                    text: "Cancel",
                    style: "cancel",
                },
                {
                    text: "Confirm",
                    onPress: () =>
                        updateBedStatus(
                            bed.bed_id,
                            newStatus
                        ),
                },
            ]
        );
    }

    async function updateBedStatus(
        bedId: string,
        status: string
    ) {
        try {
            const token = await getStoredToken();

            const response = await fetch(
                `${API_URL}/api/beds/${bedId}/status`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        status,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                        "Failed to update bed status"
                );
            }

            await loadData();
        } catch (error) {
            console.error(
                "Update bed status error:",
                error
            );

            Alert.alert(
                "Error",
                error instanceof Error
                    ? error.message
                    : "Failed to update bed status"
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
                    Manage Beds
                </Text>

                <Text style={styles.subtitle}>
                    Create and manage hospital beds
                </Text>

                <View style={styles.formCard}>
                    <Text style={styles.sectionTitle}>
                        Create Bed
                    </Text>

                    <Text style={styles.label}>
                        Select Ward
                    </Text>

                    {wards.filter(
                        (ward) => ward.is_active
                    ).length === 0 ? (
                        <Text style={styles.emptyText}>
                            No active wards available.
                        </Text>
                    ) : (
                        wards
                            .filter(
                                (ward) =>
                                    ward.is_active
                            )
                            .map((ward) => (
                                <Pressable
                                    key={ward.ward_id}
                                    style={[
                                        styles.wardOption,
                                        selectedWardId ===
                                            ward.ward_id &&
                                            styles.selectedWard,
                                    ]}
                                    onPress={() =>
                                        setSelectedWardId(
                                            ward.ward_id
                                        )
                                    }
                                >
                                    <Text>
                                        {ward.ward_name}
                                    </Text>
                                </Pressable>
                            ))
                    )}

                    <TextInput
                        style={styles.input}
                        placeholder="Bed number"
                        value={bedNumber}
                        onChangeText={setBedNumber}
                    />

                    <Pressable
                        style={styles.primaryButton}
                        onPress={createBed}
                        disabled={creating}
                    >
                        {creating ? (
                            <ActivityIndicator />
                        ) : (
                            <Text style={styles.buttonText}>
                                Create Bed
                            </Text>
                        )}
                    </Pressable>
                </View>

                <View style={styles.listHeader}>
                    <Text style={styles.sectionTitle}>
                        Beds
                    </Text>

                    <Pressable
                        onPress={loadData}
                        disabled={loading}
                    >
                        <Text style={styles.refreshText}>
                            Refresh
                        </Text>
                    </Pressable>
                </View>

                {loading ? (
                    <ActivityIndicator />
                ) : beds.length === 0 ? (
                    <Text style={styles.emptyText}>
                        No beds found.
                    </Text>
                ) : (
                    beds.map((bed) => (
                        <View
                            key={bed.bed_id}
                            style={styles.card}
                        >
                            <Text style={styles.cardTitle}>
                                Bed {bed.bed_number}
                            </Text>

                            <Text style={styles.cardText}>
                                Ward: {bed.ward_name}
                            </Text>

                            <Text style={styles.cardText}>
                                Status: {bed.status}
                            </Text>

                            <Text style={styles.cardText}>
                                Ward:{" "}
                                {bed.ward_is_active
                                    ? "Active"
                                    : "Inactive"}
                            </Text>

                            <Pressable
                                style={styles.secondaryButton}
                                onPress={() =>
                                    confirmStatusChange(
                                        bed
                                    )
                                }
                            >
                                <Text
                                    style={styles.buttonText}
                                >
                                    {bed.status ===
                                    "OCCUPIED"
                                        ? "Occupied"
                                        : bed.status ===
                                          "AVAILABLE"
                                        ? "Set Maintenance"
                                        : "Set Available"}
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

    label: {
        marginTop: 16,
        marginBottom: 8,
        fontWeight: "600",
    },

    wardOption: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
    },

    selectedWard: {
        borderWidth: 2,
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

    emptyText: {
        fontSize: 14,
        marginTop: 8,
    },
});