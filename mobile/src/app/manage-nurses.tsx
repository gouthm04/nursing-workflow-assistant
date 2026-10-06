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
import { useCallback, useEffect, useState } from "react";
import { router } from "expo-router";
import DashboardHeader from "../components/DashboardHeader";
import { getStoredToken } from "../services/auth";

import { API_URL } from "../constants/api";

type Nurse = {
    user_id: string;
    username: string;
    full_name: string;
    role: string;
    phone: string | null;
    is_active: boolean;
    must_change_password: boolean;
    created_at: string;
};

export default function ManageNursesScreen() {
    const [nurses, setNurses] = useState<Nurse[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [fullName, setFullName] = useState("");
    const [username, setUsername] = useState("");

    const [creating, setCreating] = useState(false);
    const [updatingNurseId, setUpdatingNurseId] = useState<string | null>(
        null
    );

    const loadNurses = useCallback(async () => {
        try {
            const token = await getStoredToken();

            if (!token) {
                router.replace("/");
                return;
            }

            const response = await fetch(
                `${API_URL}/api/users/nurses`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Failed to load nurses"
                );
            }

            setNurses(data.nurses);
        } catch (error) {
            console.error("Load nurses error:", error);

            Alert.alert(
                "Error",
                error instanceof Error
                    ? error.message
                    : "Failed to load nurses"
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadNurses();
    }, [loadNurses]);

    async function handleCreateNurse() {
        const trimmedFullName = fullName.trim();
        const trimmedUsername = username.trim();

        if (!trimmedFullName || !trimmedUsername) {
            Alert.alert(
                "Missing information",
                "Please enter the nurse's full name and username."
            );
            return;
        }

        try {
            setCreating(true);

            const token = await getStoredToken();

            if (!token) {
                router.replace("/");
                return;
            }

            const response = await fetch(
                `${API_URL}/api/users`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        fullName: trimmedFullName,
                        username: trimmedUsername,
                        role: "NURSE",
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Failed to create nurse"
                );
            }

            setFullName("");
            setUsername("");

            Alert.alert(
                "Nurse created",
                `Username: ${data.user.username}\n\nTemporary password:\n${data.temporaryPassword}\n\nGive this password to the nurse securely. They must change it after their first login.`,
                [
                    {
                        text: "OK",
                        onPress: loadNurses,
                    },
                ]
            );
        } catch (error) {
            console.error("Create nurse error:", error);

            Alert.alert(
                "Unable to create nurse",
                error instanceof Error
                    ? error.message
                    : "Something went wrong"
            );
        } finally {
            setCreating(false);
        }
    }

    function handleStatusChange(nurse: Nurse) {
        const nextStatus = !nurse.is_active;

        Alert.alert(
            nextStatus
                ? "Activate nurse?"
                : "Deactivate nurse?",
            nextStatus
                ? `${nurse.full_name} will be able to use the system again.`
                : `${nurse.full_name} will no longer be able to use the system.`,
            [
                {
                    text: "Cancel",
                    style: "cancel",
                },
                {
                    text: nextStatus
                        ? "Activate"
                        : "Deactivate",
                    style: nextStatus
                        ? "default"
                        : "destructive",
                    onPress: () =>
                        updateNurseStatus(
                            nurse.user_id,
                            nextStatus
                        ),
                },
            ]
        );
    }

    async function updateNurseStatus(
        nurseId: string,
        isActive: boolean
    ) {
        try {
            setUpdatingNurseId(nurseId);

            const token = await getStoredToken();

            if (!token) {
                router.replace("/");
                return;
            }

            const response = await fetch(
                `${API_URL}/api/users/${nurseId}/status`,
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
                    data.message || "Failed to update nurse status"
                );
            }

            setNurses((currentNurses) =>
                currentNurses.map((nurse) =>
                    nurse.user_id === nurseId
                        ? {
                              ...nurse,
                              is_active: isActive,
                          }
                        : nurse
                )
            );
        } catch (error) {
            console.error(
                "Update nurse status error:",
                error
            );

            Alert.alert(
                "Unable to update nurse",
                error instanceof Error
                    ? error.message
                    : "Something went wrong"
            );
        } finally {
            setUpdatingNurseId(null);
        }
    }

    async function handleRefresh() {
        setRefreshing(true);
        await loadNurses();
    }

    return (
        <View style={styles.container}>
            <DashboardHeader />

            <ScrollView
                contentContainerStyle={styles.content}
            >
                <Pressable
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Text style={styles.backButtonText}>
                        ← Back to Dashboard
                    </Text>
                </Pressable>

                <Text style={styles.title}>
                    Manage Nurses
                </Text>

                <Text style={styles.subtitle}>
                    Create and manage nurse accounts
                </Text>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        Add Nurse
                    </Text>

                    <TextInput
                        style={styles.input}
                        placeholder="Full name"
                        value={fullName}
                        onChangeText={setFullName}
                        editable={!creating}
                    />

                    <TextInput
                        style={styles.input}
                        placeholder="Username"
                        value={username}
                        onChangeText={setUsername}
                        autoCapitalize="none"
                        editable={!creating}
                    />

                    <Pressable
                        style={[
                            styles.primaryButton,
                            creating && styles.disabledButton,
                        ]}
                        onPress={handleCreateNurse}
                        disabled={creating}
                    >
                        {creating ? (
                            <ActivityIndicator />
                        ) : (
                            <Text style={styles.primaryButtonText}>
                                Create Nurse
                            </Text>
                        )}
                    </Pressable>
                </View>

                <View style={styles.sectionHeader}>
                    <View>
                        <Text style={styles.sectionTitle}>
                            Nurses
                        </Text>

                        <Text style={styles.nurseCount}>
                            {nurses.length} nurse
                            {nurses.length === 1 ? "" : "s"}
                        </Text>
                    </View>

                    <Pressable
                        style={styles.refreshButton}
                        onPress={handleRefresh}
                        disabled={refreshing}
                    >
                        <Text style={styles.refreshText}>
                            {refreshing ? "Refreshing..." : "Refresh"}
                        </Text>
                    </Pressable>
                </View>

                {loading ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" />

                        <Text style={styles.loadingText}>
                            Loading nurses...
                        </Text>
                    </View>
                ) : nurses.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyTitle}>
                            No nurses found
                        </Text>

                        <Text style={styles.emptyText}>
                            Create the first nurse account using
                            the form above.
                        </Text>
                    </View>
                ) : (
                    nurses.map((nurse) => (
                        <View
                            key={nurse.user_id}
                            style={styles.nurseCard}
                        >
                            <View style={styles.nurseInfo}>
                                <Text style={styles.nurseName}>
                                    {nurse.full_name}
                                </Text>

                                <Text style={styles.username}>
                                    @{nurse.username}
                                </Text>

                                <Text
                                    style={[
                                        styles.status,
                                        nurse.is_active
                                            ? styles.activeStatus
                                            : styles.inactiveStatus,
                                    ]}
                                >
                                    {nurse.is_active
                                        ? "Active"
                                        : "Inactive"}
                                </Text>

                                {nurse.must_change_password && (
                                    <Text style={styles.passwordNotice}>
                                        Password change required
                                    </Text>
                                )}
                            </View>

                            <Pressable
                                style={[
                                    styles.statusButton,
                                    nurse.is_active
                                        ? styles.deactivateButton
                                        : styles.activateButton,
                                ]}
                                onPress={() =>
                                    handleStatusChange(nurse)
                                }
                                disabled={
                                    updatingNurseId ===
                                    nurse.user_id
                                }
                            >
                                {updatingNurseId ===
                                nurse.user_id ? (
                                    <ActivityIndicator />
                                ) : (
                                    <Text
                                        style={
                                            styles.statusButtonText
                                        }
                                    >
                                        {nurse.is_active
                                            ? "Deactivate"
                                            : "Activate"}
                                    </Text>
                                )}
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
        marginBottom: 16,
    },

    backButtonText: {
        fontSize: 15,
        fontWeight: "600",
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

    section: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 18,
        marginBottom: 24,
    },

    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },

    sectionTitle: {
        fontSize: 20,
        fontWeight: "bold",
        marginBottom: 4,
    },

    nurseCount: {
        fontSize: 13,
    },

    input: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 11,
        fontSize: 16,
        marginBottom: 12,
    },

    primaryButton: {
        borderRadius: 8,
        paddingVertical: 13,
        alignItems: "center",
        marginTop: 4,
    },

    disabledButton: {
        opacity: 0.6,
    },

    primaryButtonText: {
        fontSize: 16,
        fontWeight: "bold",
    },

    refreshButton: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },

    refreshText: {
        fontSize: 14,
        fontWeight: "600",
    },

    nurseCard: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },

    nurseInfo: {
        flex: 1,
        marginRight: 12,
    },

    nurseName: {
        fontSize: 17,
        fontWeight: "bold",
        marginBottom: 4,
    },

    username: {
        fontSize: 14,
        marginBottom: 8,
    },

    status: {
        fontSize: 13,
        fontWeight: "bold",
    },

    activeStatus: {
        color: "green",
    },

    inactiveStatus: {
        color: "red",
    },

    passwordNotice: {
        fontSize: 12,
        marginTop: 5,
    },

    statusButton: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
    },

    activateButton: {
        borderColor: "green",
    },

    deactivateButton: {
        borderColor: "red",
    },

    statusButtonText: {
        fontSize: 13,
        fontWeight: "600",
    },

    center: {
        alignItems: "center",
        paddingVertical: 30,
    },

    loadingText: {
        marginTop: 10,
        fontSize: 14,
    },

    emptyState: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 20,
        alignItems: "center",
    },

    emptyTitle: {
        fontSize: 17,
        fontWeight: "bold",
        marginBottom: 6,
    },

    emptyText: {
        fontSize: 14,
        textAlign: "center",
    },
});