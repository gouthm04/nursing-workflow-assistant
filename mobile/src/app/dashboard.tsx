import { useEffect } from "react";
import { Alert, Text, View, StyleSheet } from "react-native";
import { router } from "expo-router";
import { getStoredUser } from "../services/auth";

export default function DashboardScreen() {
    useEffect(() => {
        async function routeUser() {
            const user = await getStoredUser();

            console.log("STORED USER:", user);

            if (!user) {
                router.replace("/");
                return;
            }

            

            switch (user.role) {
                case "SUPER_ADMIN":
                    router.replace("/admin-dashboard");
                    break;

                case "NURSE_SUPERVISOR":
                    router.replace("/supervisor-dashboard");
                    break;

                case "RECEPTIONIST":
                    router.replace("/reception-dashboard");
                    break;

                case "NURSE":
                    router.replace("/nurse-dashboard");
                    break;

                default:
                    Alert.alert(
                        "Unknown Role",
                        `Received role: ${user.role}`
                    );
                    router.replace("/");
            }
        }

        routeUser();
    }, []);

    return (
        <View style={styles.container}>
            <Text style={styles.text}>
                Loading dashboard...
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },

    text: {
        fontSize: 16,
    },
});