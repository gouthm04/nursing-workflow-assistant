import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { logout } from "../services/auth";

export default function DashboardScreen() {
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

    return (
        <View style={styles.container}>
            <Text style={styles.title}>
                Dashboard
            </Text>

            <Text style={styles.subtitle}>
                You are successfully logged in.
            </Text>

            <TouchableOpacity
                style={styles.logoutButton}
                onPress={handleLogout}
            >
                <Text style={styles.logoutText}>
                    Logout
                </Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },

    title: {
        fontSize: 28,
        fontWeight: "bold",
        marginBottom: 12,
    },

    subtitle: {
        fontSize: 16,
        marginBottom: 30,
    },

    logoutButton: {
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderWidth: 1,
        borderRadius: 8,
    },

    logoutText: {
        fontSize: 16,
        fontWeight: "bold",
    },
});