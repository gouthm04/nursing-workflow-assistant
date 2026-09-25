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

const API_URL = "http://localhost:3000";

type Consumable = {
    consumable_id: number;
    name: string;
    unit: string;
};

type ConsumableUsage = {
    usage_id: number;
    admission_id: number;
    consumable_id: number;
    consumable_name: string;
    unit: string;
    quantity: number;
    used_for_type: string | null;
    used_for_id: number | null;
    recorded_by: number;
    used_at: string;
};

export default function ConsumablesScreen() {
    const { admissionId } = useLocalSearchParams<{
        admissionId: string;
    }>();

    const [consumables, setConsumables] = useState<Consumable[]>(
        []
    );

    const [selectedConsumableId, setSelectedConsumableId] =
        useState<number | null>(null);

    const [quantity, setQuantity] = useState("");

    const [usageHistory, setUsageHistory] = useState<
        ConsumableUsage[]
    >([]);

    const [loadingConsumables, setLoadingConsumables] =
        useState(true);

    const [loadingHistory, setLoadingHistory] =
        useState(true);

    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadConsumables();
        loadUsageHistory();
    }, [admissionId]);

    async function loadConsumables() {
        try {
            setLoadingConsumables(true);

            const token = await getStoredToken();

            if (!token) {
                router.replace("/");
                return;
            }

            const response = await fetch(
                `${API_URL}/api/nurse/consumables`,
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
                        "Failed to load consumables"
                );
            }

            setConsumables(data.consumables || []);
        } catch (error) {
            console.error(
                "Load consumables error:",
                error
            );

            Alert.alert(
                "Error",
                error instanceof Error
                    ? error.message
                    : "Failed to load consumables"
            );
        } finally {
            setLoadingConsumables(false);
        }
    }

    async function loadUsageHistory() {
        try {
            setLoadingHistory(true);

            const token = await getStoredToken();

            if (!token) {
                router.replace("/");
                return;
            }

            const response = await fetch(
                `${API_URL}/api/nurse/patients/${admissionId}/consumables`,
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
                        "Failed to load consumable usage history"
                );
            }

            setUsageHistory(data.usage || []);
        } catch (error) {
            console.error(
                "Load consumable usage history error:",
                error
            );

            Alert.alert(
                "Error",
                error instanceof Error
                    ? error.message
                    : "Failed to load usage history"
            );
        } finally {
            setLoadingHistory(false);
        }
    }

    async function saveUsage() {
        try {
            const token = await getStoredToken();

            if (!token) {
                router.replace("/");
                return;
            }

            if (selectedConsumableId === null) {
                Alert.alert(
                    "Missing Information",
                    "Select a consumable."
                );
                return;
            }

            const parsedQuantity = Number(quantity);

            if (
                !Number.isFinite(parsedQuantity) ||
                parsedQuantity <= 0
            ) {
                Alert.alert(
                    "Invalid Quantity",
                    "Enter a quantity greater than zero."
                );
                return;
            }

            setSaving(true);

            const response = await fetch(
                `${API_URL}/api/nurse/patients/${admissionId}/consumables`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        consumableId:
                            selectedConsumableId,
                        quantity: parsedQuantity,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                        "Failed to record consumable usage"
                );
            }

            Alert.alert(
                "Success",
                "Consumable usage recorded successfully.",
                [
                    {
                        text: "OK",
                        onPress: () => {
                            setSelectedConsumableId(null);
                            setQuantity("");
                            loadUsageHistory();
                        },
                    },
                ]
            );
        } catch (error) {
            console.error(
                "Record consumable usage error:",
                error
            );

            Alert.alert(
                "Error",
                error instanceof Error
                    ? error.message
                    : "Failed to record consumable usage"
            );
        } finally {
            setSaving(false);
        }
    }

    function formatUsedAt(dateString: string) {
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

    function getSelectedConsumable() {
        return consumables.find(
            (item) =>
                item.consumable_id ===
                selectedConsumableId
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
                    Consumables
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
                        Record Consumable Usage
                    </Text>

                    <Text style={styles.label}>
                        Select Consumable
                    </Text>

                    {loadingConsumables ? (
                        <View
                            style={
                                styles.loadingContainer
                            }
                        >
                            <ActivityIndicator />
                            <Text
                                style={
                                    styles.loadingText
                                }
                            >
                                Loading consumables...
                            </Text>
                        </View>
                    ) : consumables.length === 0 ? (
                        <Text style={styles.mutedText}>
                            No active consumables available.
                        </Text>
                    ) : (
                        <View
                            style={
                                styles.consumableList
                            }
                        >
                            {consumables.map(
                                (consumable) => {
                                    const selected =
                                        selectedConsumableId ===
                                        consumable.consumable_id;

                                    return (
                                        <Pressable
                                            key={
                                                consumable.consumable_id
                                            }
                                            style={[
                                                styles.consumableOption,
                                                selected &&
                                                    styles.selectedOption,
                                            ]}
                                            onPress={() =>
                                                setSelectedConsumableId(
                                                    consumable.consumable_id
                                                )
                                            }
                                        >
                                            <View>
                                                <Text
                                                    style={[
                                                        styles.consumableName,
                                                        selected &&
                                                            styles.selectedText,
                                                    ]}
                                                >
                                                    {
                                                        consumable.name
                                                    }
                                                </Text>

                                                <Text
                                                    style={[
                                                        styles.consumableUnit,
                                                        selected &&
                                                            styles.selectedText,
                                                    ]}
                                                >
                                                    Unit:{" "}
                                                    {
                                                        consumable.unit
                                                    }
                                                </Text>
                                            </View>

                                            {selected && (
                                                <Text
                                                    style={
                                                        styles.checkmark
                                                    }
                                                >
                                                    ✓
                                                </Text>
                                            )}
                                        </Pressable>
                                    );
                                }
                            )}
                        </View>
                    )}

                    <Text style={styles.label}>
                        Quantity
                    </Text>

                    <TextInput
                        style={styles.input}
                        value={quantity}
                        onChangeText={setQuantity}
                        placeholder={
                            getSelectedConsumable()
                                ? `Enter quantity (${getSelectedConsumable()?.unit})`
                                : "Enter quantity"
                        }
                        keyboardType="decimal-pad"
                    />

                    <Pressable
                        style={[
                            styles.saveButton,
                            saving &&
                                styles.disabledButton,
                        ]}
                        onPress={saveUsage}
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
                                Record Usage
                            </Text>
                        )}
                    </Pressable>
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>
                        Consumable Usage History
                    </Text>

                    {loadingHistory ? (
                        <View
                            style={
                                styles.historyLoading
                            }
                        >
                            <ActivityIndicator />
                            <Text
                                style={
                                    styles.loadingText
                                }
                            >
                                Loading usage history...
                            </Text>
                        </View>
                    ) : usageHistory.length === 0 ? (
                        <Text style={styles.mutedText}>
                            No consumable usage recorded yet.
                        </Text>
                    ) : (
                        usageHistory.map((usage) => (
                            <View
                                key={usage.usage_id}
                                style={
                                    styles.historyItem
                                }
                            >
                                <Text
                                    style={
                                        styles.consumableName
                                    }
                                >
                                    {
                                        usage.consumable_name
                                    }
                                </Text>

                                <Text
                                    style={
                                        styles.quantityText
                                    }
                                >
                                    Quantity:{" "}
                                    {usage.quantity}{" "}
                                    {usage.unit}
                                </Text>

                                <Text
                                    style={
                                        styles.historyTime
                                    }
                                >
                                    {formatUsedAt(
                                        usage.used_at
                                    )}
                                </Text>

                                {usage.used_for_type && (
                                    <Text
                                        style={
                                            styles.referenceText
                                        }
                                    >
                                        Used for:{" "}
                                        {
                                            usage.used_for_type
                                        }
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

    consumableList: {
        gap: 8,
    },

    consumableOption: {
        minHeight: 58,
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#fff",
    },

    selectedOption: {
        borderColor: "#222",
        backgroundColor: "#eee",
    },

    consumableName: {
        fontSize: 16,
        fontWeight: "700",
    },

    consumableUnit: {
        fontSize: 13,
        color: "#666",
        marginTop: 3,
    },

    selectedText: {
        color: "#222",
    },

    checkmark: {
        fontSize: 22,
        fontWeight: "bold",
    },

    loadingContainer: {
        alignItems: "center",
        paddingVertical: 12,
    },

    loadingText: {
        marginTop: 8,
        fontSize: 14,
        color: "#666",
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

    quantityText: {
        fontSize: 15,
        marginTop: 5,
    },

    historyTime: {
        fontSize: 13,
        color: "#666",
        marginTop: 6,
    },

    referenceText: {
        fontSize: 13,
        color: "#555",
        marginTop: 6,
    },
});