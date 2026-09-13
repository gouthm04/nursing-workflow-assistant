import { useEffect, useState } from "react";
import { getStoredUser, login } from "../services/auth";
import { router } from "expo-router";
import {
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export default function LoginScreen() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);

    useEffect(() => {
        async function checkSession() {
            const user = await getStoredUser();

            if (user) {
                router.replace("/dashboard");
                return;
            }

            setCheckingSession(false);
        }

        checkSession();
    }, []);

    if (checkingSession) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>
                    Checking session...
                </Text>
            </View>
        );
    }

    async function handleLogin() {
        if (!username || !password) {
            Alert.alert("Login", "Please enter username and password.");
            return;
        }

        try {
            setLoading(true);

            const user = await login(username, password);

            if (user.must_change_password) {
                router.replace("/change-password");
                return;
            }

            Alert.alert(
                "Login successful",
                `Welcome, ${user.full_name}`,
                [
                    {
                        text: "Continue",
                        onPress: () => router.replace("/dashboard"),
                    },
                ]
            );

        } catch (error) {
            console.error("Login error:", error);

            Alert.alert(
                "Login failed",
                error instanceof Error
                    ? error.message
                    : "Could not connect to the backend."
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <Text style={styles.title}>
                    Nursing Workflow Assistant
                </Text>

                <Text style={styles.subtitle}>
                    Hospital Nursing Management System
                </Text>

                <Text style={styles.label}>
                    Username
                </Text>

                <TextInput
                    style={styles.input}
                    placeholder="Enter username"
                    autoCapitalize="none"
                    value={username}
                    onChangeText={setUsername}
                />

                <Text style={styles.label}>
                    Password
                </Text>

                <TextInput
                    style={styles.input}
                    placeholder="Enter password"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                />

                <TouchableOpacity
                    style={styles.button}
                    onPress={handleLogin}
                    disabled={loading}
                >
                    <Text style={styles.buttonText}>
                        {loading ? "Logging in..." : "Login"}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        padding: 24,
    },

    card: {
        width: "100%",
        maxWidth: 420,
        alignSelf: "center",
    },

    title: {
        fontSize: 28,
        fontWeight: "bold",
        textAlign: "center",
        marginBottom: 8,
    },

    subtitle: {
        fontSize: 14,
        textAlign: "center",
        marginBottom: 32,
    },

    label: {
        fontSize: 15,
        fontWeight: "600",
        marginBottom: 6,
    },

    input: {
        height: 50,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 14,
        marginBottom: 18,
    },

    button: {
        height: 50,
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 8,
    },

    buttonText: {
            fontSize: 16,
            fontWeight: "bold",
        },
        loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },

    loadingText: {
        fontSize: 16,
    },
});