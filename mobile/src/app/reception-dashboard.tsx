import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { router } from "expo-router";
import DashboardHeader from "../components/DashboardHeader";

export default function ReceptionDashboard() {
    return (
        <View style={styles.container}>
            <DashboardHeader />

            <View style={styles.content}>
                <Text style={styles.title}>
                    Reception Dashboard
                </Text>

                <Text style={styles.subtitle}>
                    Register and admit patients
                </Text>

                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => router.push("/register-patient")}
                >
                    <Text style={styles.actionText}>
                        Register / Admit Patient
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },

    content: {
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

    actionButton: {
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderWidth: 1,
        borderRadius: 8,
    },

    actionText: {
        fontSize: 16,
        fontWeight: "bold",
    },
});