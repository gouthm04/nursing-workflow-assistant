import { useState } from "react";
import {
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { router } from "expo-router";
import { getStoredToken } from "../services/auth";

const API_URL = "http://localhost:3000";

export default function ChangePasswordScreen() {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleChangePassword() {
        if (!currentPassword || !newPassword || !confirmPassword) {
            Alert.alert(
                "Change Password",
                "Please fill in all fields."
            );
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert(
                "Change Password",
                "New passwords do not match."
            );
            return;
        }

        if (newPassword.length < 8) {
            Alert.alert(
                "Change Password",
                "New password must be at least 8 characters long."
            );
            return;
        }

        try {
            setLoading(true);

            const token = await getStoredToken();

            if (!token) {
                Alert.alert(
                    "Session expired",
                    "Please log in again."
                );

                router.replace("/");
                return;
            }

            const response = await fetch(
                `${API_URL}/api/auth/change-password`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        currentPassword,
                        newPassword,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                Alert.alert(
                    "Change Password Failed",
                    data.message || "Could not change password."
                );
                return;
            }

            Alert.alert(
                "Password Changed",
                "Your password has been changed successfully.",
                [
                    {
                        text: "Continue",
                        onPress: () => router.replace("/dashboard"),
                    },
                ]
            );
        } catch (error) {
            console.error("Change password error:", error);

            Alert.alert(
                "Connection Error",
                "Could not connect to the backend."
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <Text style={styles.title}>
                    Change Password
                </Text>

                <Text style={styles.subtitle}>
                    Please change your temporary password before continuing.
                </Text>

                <Text style={styles.label}>
                    Current Password
                </Text>

                <TextInput
                    style={styles.input}
                    placeholder="Enter current password"
                    secureTextEntry
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                />

                <Text style={styles.label}>
                    New Password
                </Text>

                <TextInput
                    style={styles.input}
                    placeholder="Enter new password"
                    secureTextEntry
                    value={newPassword}
                    onChangeText={setNewPassword}
                />

                <Text style={styles.label}>
                    Confirm New Password
                </Text>

                <TextInput
                    style={styles.input}
                    placeholder="Re-enter new password"
                    secureTextEntry
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                />

                <TouchableOpacity
                    style={styles.button}
                    onPress={handleChangePassword}
                    disabled={loading}
                >
                    <Text style={styles.buttonText}>
                        {loading
                            ? "Changing Password..."
                            : "Change Password"}
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
        marginBottom: 10,
    },

    subtitle: {
        fontSize: 14,
        textAlign: "center",
        marginBottom: 30,
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
});