import { StyleSheet, Text, View } from "react-native";
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
    },
});