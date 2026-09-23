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
import DashboardHeader from "../components/DashboardHeader";
import {
    getStoredToken,
    getStoredUser,
} from "../services/auth";

const API_URL = "http://localhost:3000";

type Assignment = {
    assignment_id: number;
    nurse_id: number;
    ward_id: number;
    ward_name: string;
    shift_id: number;
    shift_name: string;
    start_time: string;
    end_time: string;
    shift_date: string;
    is_primary: boolean;
    is_override: boolean;
    replacement_nurse_id: number | null;
    override_reason: string | null;
};

export default function NurseDashboard() {
    const [user, setUser] = useState<any>(null);
    const [assignment, setAssignment] =
        useState<Assignment | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboard();
    }, []);

    async function loadDashboard() {
        try {
            const storedUser = await getStoredUser();
            const token = await getStoredToken();

            if (!storedUser || !token) {
                router.replace("/");
                return;
            }

            setUser(storedUser);

            const response = await fetch(
                `${API_URL}/api/nurse/today`,
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
                    "Failed to load today's assignment"
                );
            }

            setAssignment(data.assignment);

        } catch (error) {
            console.error(
                "Nurse dashboard error:",
                error
            );

            Alert.alert(
                "Error",
                error instanceof Error
                    ? error.message
                    : "Failed to load dashboard"
            );
        } finally {
            setLoading(false);
        }
    }

    function formatTime(time: string) {
        return time.substring(0, 5);
    }

    return (
        <View style={styles.container}>
            <DashboardHeader />

            <ScrollView
                contentContainerStyle={styles.content}
            >
                <Text style={styles.title}>
                    Nurse Dashboard
                </Text>

                {user && (
                    <Text style={styles.welcome}>
                        Welcome, {user.full_name}
                    </Text>
                )}

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" />

                        <Text style={styles.loadingText}>
                            Loading today's assignment...
                        </Text>
                    </View>
                ) : (
                    <>
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>
                                Today's Assignment
                            </Text>

                            {assignment ? (
                                <View style={styles.assignmentCard}>
                                    <View style={styles.cardHeader}>
                                        <Text
                                            style={
                                                styles.wardName
                                            }
                                        >
                                            {assignment.ward_name}
                                        </Text>

                                        {assignment.is_override && (
                                            <Text
                                                style={
                                                    styles.overrideBadge
                                                }
                                            >
                                                REPLACEMENT
                                            </Text>
                                        )}
                                    </View>

                                    <Text
                                        style={
                                            styles.shiftName
                                        }
                                    >
                                        {assignment.shift_name} Shift
                                    </Text>

                                    <Text
                                        style={
                                            styles.shiftTime
                                        }
                                    >
                                        {formatTime(
                                            assignment.start_time
                                        )}{" "}
                                        –{" "}
                                        {formatTime(
                                            assignment.end_time
                                        )}
                                    </Text>

                                    <Text
                                        style={
                                            styles.assignmentDate
                                        }
                                    >
                                        {assignment.shift_date}
                                    </Text>

                                    {assignment.is_override &&
                                        assignment.override_reason && (
                                            <Text
                                                style={
                                                    styles.overrideReason
                                                }
                                            >
                                                Reason:{" "}
                                                {
                                                    assignment.override_reason
                                                }
                                            </Text>
                                        )}
                                </View>
                            ) : (
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
                                        No assignment today
                                    </Text>

                                    <Text
                                        style={
                                            styles.emptyText
                                        }
                                    >
                                        You do not have a roster
                                        assignment for today.
                                    </Text>
                                </View>
                            )}
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>
                                My Work
                            </Text>

                            <Pressable
                                style={styles.actionCard}
                                onPress={() => router.push("/my-patients")}
                            >
                                <Text
                                    style={
                                        styles.actionTitle
                                    }
                                >
                                    My Patients
                                </Text>

                                <Text
                                    style={
                                        styles.actionDescription
                                    }
                                >
                                    View patients assigned to
                                    your ward
                                </Text>
                            </Pressable>

                            <Pressable
                                style={styles.actionCard}
                                onPress={() =>
                                    Alert.alert(
                                        "Coming Soon",
                                        "Shift handover will be added later."
                                    )
                                }
                            >
                                <Text
                                    style={
                                        styles.actionTitle
                                    }
                                >
                                    Shift Handover
                                </Text>

                                <Text
                                    style={
                                        styles.actionDescription
                                    }
                                >
                                    Prepare and review patient
                                    handovers
                                </Text>
                            </Pressable>
                        </View>
                    </>
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

    title: {
        fontSize: 28,
        fontWeight: "bold",
        marginBottom: 6,
    },

    welcome: {
        fontSize: 16,
        color: "#666",
        marginBottom: 24,
    },

    section: {
        marginBottom: 28,
    },

    sectionTitle: {
        fontSize: 20,
        fontWeight: "bold",
        marginBottom: 12,
    },

    assignmentCard: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 18,
        borderWidth: 1,
        borderColor: "#ddd",
    },

    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },

    wardName: {
        fontSize: 22,
        fontWeight: "bold",
    },

    overrideBadge: {
        fontSize: 11,
        fontWeight: "bold",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        backgroundColor: "#fff3cd",
    },

    shiftName: {
        fontSize: 18,
        marginBottom: 6,
    },

    shiftTime: {
        fontSize: 17,
        fontWeight: "600",
        marginBottom: 6,
    },

    assignmentDate: {
        fontSize: 14,
        color: "#666",
    },

    overrideReason: {
        marginTop: 12,
        fontSize: 14,
        color: "#555",
    },

    emptyCard: {
        backgroundColor: "#f5f5f5",
        borderRadius: 12,
        padding: 18,
    },

    emptyTitle: {
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 6,
    },

    emptyText: {
        fontSize: 14,
        color: "#666",
    },

    actionCard: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 18,
        borderWidth: 1,
        borderColor: "#ddd",
        marginBottom: 12,
    },

    actionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 5,
    },

    actionDescription: {
        fontSize: 14,
        color: "#666",
    },

    loadingContainer: {
        alignItems: "center",
        paddingVertical: 50,
    },

    loadingText: {
        marginTop: 12,
        fontSize: 15,
        color: "#666",
    },
});