import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import DashboardHeader from "../components/DashboardHeader";

export default function ReceptionDashboard() {
  return (
    <View style={styles.container}>
      <DashboardHeader />

      <View style={styles.content}>
        <Text style={styles.title}>Reception Dashboard</Text>

        <Text style={styles.subtitle}>Manage patient admissions</Text>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push("/register-patient")}
        >
          <Text style={styles.actionText}>Register / Admit Patient</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push("/current-patients")}
        >
          <Text style={styles.actionText}>Current Patients</Text>
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
    marginBottom: 14,
    minWidth: 200,
    alignItems: "center",
  },

  actionText: {
    fontSize: 16,
    fontWeight: "bold",
  },
});