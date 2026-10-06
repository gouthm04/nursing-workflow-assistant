import React, { useEffect, useState } from "react";
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { router } from "expo-router";
import { getStoredToken } from "../services/auth";

import { API_URL } from "../constants/api";

type Roster = {
    roster_id: string;
    week_start_date: string;
    week_end_date: string;
    status: string;
};

export default function WeeklyRosterScreen() {
    const [rosters, setRosters] = useState<Roster[]>([]);
    const [loading, setLoading] = useState(true);

    async function loadRosters() {
        try {
            setLoading(true);

            const token = await getStoredToken();

            if (!token) {
                router.replace("/");
                return;
            }

            const response = await fetch(
                `${API_URL}/api/rosters`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Failed to load rosters"
                );
            }

            setRosters(data.rosters);

        } catch (error) {
            Alert.alert(
                "Error",
                error instanceof Error
                    ? error.message
                    : "Failed to load rosters"
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadRosters();
    }, []);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Weekly Roster</Text>

            <Text style={styles.subtitle}>
                Select a roster to view assignments
            </Text>

            {loading ? (
                <Text style={styles.message}>
                    Loading rosters...
                </Text>
            ) : (
                <ScrollView>
                    {rosters.map((roster) => (
                        <Pressable
                            key={roster.roster_id}
                            style={styles.rosterCard}
                            onPress={() =>
                                router.push(
                                    `/roster/${roster.roster_id}`
                                )
                            }
                        >
                            <Text style={styles.rosterDate}>
                                {roster.week_start_date} –{" "}
                                {roster.week_end_date}
                            </Text>

                            <Text style={styles.status}>
                                Status: {roster.status}
                            </Text>
                        </Pressable>
                    ))}

                    {rosters.length === 0 && (
                        <Text style={styles.message}>
                            No rosters found.
                        </Text>
                    )}
                </ScrollView>
            )}

            <Pressable
                style={styles.createButton}
                onPress={() => {
                    Alert.alert(
                        "Coming Next",
                        "Roster creation will be added next."
                    );
                }}
            >
                <Text style={styles.createButtonText}>
                    + Create New Roster
                </Text>
            </Pressable>

            <Pressable
                style={styles.backButton}
                onPress={() => router.back()}
            >
                <Text style={styles.backButtonText}>
                    Back
                </Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: "#fff",
    },

    title: {
        fontSize: 24,
        fontWeight: "700",
        marginBottom: 6,
    },

    subtitle: {
        fontSize: 14,
        color: "#666",
        marginBottom: 20,
    },

    rosterCard: {
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
    },

    rosterDate: {
        fontSize: 17,
        fontWeight: "600",
        marginBottom: 6,
    },

    status: {
        fontSize: 14,
        color: "#666",
    },

    message: {
        fontSize: 15,
        color: "#666",
        marginTop: 20,
    },

    createButton: {
        backgroundColor: "#222",
        padding: 14,
        borderRadius: 8,
        alignItems: "center",
        marginTop: 16,
    },

    createButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },

    backButton: {
        padding: 14,
        alignItems: "center",
        marginTop: 8,
    },

    backButtonText: {
        fontSize: 15,
    },
});