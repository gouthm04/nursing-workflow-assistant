import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
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

type Patient = {
  admission_id: number;
  patient_id: number;
  uhid: string;
  first_name: string;
  last_name: string | null;
  bed_number: string;
  ward_name: string;
  doctor_name: string;
  chief_complaint: string | null;
  status: string;
};

type Assignment = {
  shift_id: number;
  shift_date: string;
  shift_name: string;
  ward_id: number;
  ward_name: string;
};

export default function HandoverScreen() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignment, setAssignment] = useState<Assignment | null>(null);

  useEffect(() => {
    loadPatients();
  }, []);

  async function loadPatients() {
    try {
      setLoading(true);

      const token = await getStoredToken();

      if (!token) {
        Alert.alert("Authentication Required", "Please log in again.");
        return;
      }

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const assignmentResponse = await fetch(`${API_URL}/api/nurse/today`, {
        method: "GET",
        headers,
      });

      const assignmentData = await assignmentResponse.json();

      if (!assignmentResponse.ok) {
        throw new Error(
          assignmentData.message || "Failed to load today's assignment.",
        );
      }

      if (!assignmentData.assignment) {
        throw new Error("You do not have a roster assignment today.");
      }

      setAssignment(assignmentData.assignment);

      const patientsResponse = await fetch(`${API_URL}/api/nurse/patients`, {
        method: "GET",
        headers,
      });

      const patientsData = await patientsResponse.json();

      if (!patientsResponse.ok) {
        throw new Error(patientsData.message || "Failed to load patients.");
      }

      setPatients(patientsData.patients || []);
    } catch (error) {
      console.error("Load handover patients error:", error);

      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "Failed to load handover patients.",
      );
    } finally {
      setLoading(false);
    }
  }

  function getPatientName(patient: Patient) {
    return `${patient.first_name}${
      patient.last_name ? ` ${patient.last_name}` : ""
    }`;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>

        <Text style={styles.title}>Shift Handover</Text>

        <Text style={styles.subtitle}>
          Select a patient to prepare handover
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Patients</Text>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" />

              <Text style={styles.loadingText}>Loading patients...</Text>
            </View>
          ) : patients.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No patients</Text>

              <Text style={styles.emptyText}>
                There are no active patients assigned to your ward today.
              </Text>
            </View>
          ) : (
            patients.map((patient) => (
              <Pressable
                key={patient.admission_id}
                style={styles.patientCard}
                onPress={() => {
                  if (!assignment) {
                    Alert.alert(
                      "Assignment Required",
                      "Today's shift assignment could not be found.",
                    );
                    return;
                  }

                  router.push({
                    pathname: "/patient/[admissionId]/handover",
                    params: {
                      admissionId: String(patient.admission_id),
                      shiftId: String(assignment.shift_id),
                      shiftDate: assignment.shift_date,
                    },
                  });
                }}
              >
                <View style={styles.patientInfo}>
                  <Text style={styles.patientName}>
                    {getPatientName(patient)}
                  </Text>

                  <Text style={styles.uhid}>UHID: {patient.uhid}</Text>

                  <Text style={styles.patientDetail}>
                    Bed: {patient.bed_number}
                  </Text>

                  <Text style={styles.patientDetail}>
                    Doctor: {patient.doctor_name}
                  </Text>

                  {patient.chief_complaint && (
                    <Text style={styles.complaint}>
                      Complaint: {patient.chief_complaint}
                    </Text>
                  )}
                </View>

                <Text style={styles.arrow}>→</Text>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },

  header: {
    paddingTop: 55,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },

  backButton: {
    marginBottom: 10,
  },

  backText: {
    fontSize: 16,
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
  },

  subtitle: {
    marginTop: 5,
    fontSize: 15,
    color: "#666",
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: "#ddd",
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 14,
  },

  patientCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fafafa",
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },

  patientInfo: {
    flex: 1,
  },

  patientName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },

  uhid: {
    fontSize: 14,
    color: "#555",
    marginBottom: 6,
  },

  patientDetail: {
    fontSize: 14,
    color: "#666",
    marginBottom: 3,
  },

  complaint: {
    fontSize: 14,
    color: "#444",
    marginTop: 5,
  },

  arrow: {
    fontSize: 24,
    marginLeft: 12,
  },

  loadingContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#666",
  },

  emptyCard: {
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    padding: 16,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
  },

  emptyText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
});
