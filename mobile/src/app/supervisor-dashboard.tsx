import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { router } from "expo-router";
import DashboardHeader from "../components/DashboardHeader";

export default function SupervisorDashboard() {
    return (
        <View style={styles.container}>
            <DashboardHeader />

            <ScrollView
                contentContainerStyle={styles.content}
            >
                <Text style={styles.title}>
                    Supervisor Dashboard
                </Text>

                <Text style={styles.subtitle}>
                    Manage nursing staff and hospital operations
                </Text>

                <Pressable
                    style={styles.card}
                    onPress={() => router.push("/manage-nurses")}
                >
                    <Text style={styles.cardTitle}>
                        Manage Nurses
                    </Text>

                    <Text style={styles.cardDescription}>
                        Create, view, activate and deactivate nurse accounts
                    </Text>
                </Pressable>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>
                        Manage Wards
                    </Text>

                    <Text style={styles.cardDescription}>
                        Manage hospital wards
                    </Text>

                    <Text style={styles.comingSoon}>
                        Coming soon
                    </Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>
                        Manage Beds
                    </Text>

                    <Text style={styles.cardDescription}>
                        Manage bed availability and status
                    </Text>

                    <Text style={styles.comingSoon}>
                        Coming soon
                    </Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>
                        Weekly Roster
                    </Text>

                    <Text style={styles.cardDescription}>
                        Create and manage the weekly nurse roster
                    </Text>

                    <Text style={styles.comingSoon}>
                        Coming soon
                    </Text>
                </View>
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
        marginBottom: 8,
    },

    subtitle: {
        fontSize: 15,
        marginBottom: 24,
    },

    card: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 18,
        marginBottom: 16,
    },

    cardTitle: {
        fontSize: 19,
        fontWeight: "bold",
        marginBottom: 8,
    },

    cardDescription: {
        fontSize: 14,
        lineHeight: 20,
    },

    comingSoon: {
        marginTop: 12,
        fontSize: 13,
        fontWeight: "600",
    },
});