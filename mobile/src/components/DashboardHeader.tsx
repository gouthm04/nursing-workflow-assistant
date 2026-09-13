import React from "react";
import {
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { getStoredUser, logout } from "../services/auth";

export default function DashboardHeader() {
    async function handleLogout() {
        await logout();

        Alert.alert(
            "Logged out",
            "You have been logged out successfully.",
            [
                {
                    text: "OK",
                    onPress: () => router.replace("/"),
                },
            ]
        );
    }

    const [user, setUser] = React.useState<any>(null);

    React.useEffect(() => {
        async function loadUser() {
            const storedUser = await getStoredUser();
            setUser(storedUser);
        }

        loadUser();
    }, []);

    return (
        <SafeAreaView edges={["top"]} style={styles.safeArea}>
            <View style={styles.header}>
                <View style={styles.userSection}>
                    <Text style={styles.appName}>
                        Nursing Workflow Assistant
                    </Text>

                    {user && (
                        <Text style={styles.userInfo}>
                            {user.full_name} • {user.role}
                        </Text>
                    )}
                </View>

                <TouchableOpacity
                    style={styles.logoutButton}
                    onPress={handleLogout}
                >
                    <Text style={styles.logoutText}>
                        Logout
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        width: "100%",
    },

    header: {
        width: "100%",
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },

    userSection: {
        flex: 1,
        marginRight: 12,
    },

    appName: {
        fontSize: 18,
        fontWeight: "bold",
    },

    userInfo: {
        fontSize: 13,
        marginTop: 4,
    },

    logoutButton: {
        paddingHorizontal: 16,
        paddingVertical: 9,
        borderWidth: 1,
        borderRadius: 8,
    },

    logoutText: {
        fontSize: 14,
        fontWeight: "600",
    },
});