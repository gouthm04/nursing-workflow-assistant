import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";

import { getStoredToken } from "../services/auth";
import { API_URL } from "../constants/api";

type HandoverContent = {
  situation: string;
  background: string;
  assessment: string;
  recommendation: string;
};

type IncomingHandover = {
  handover_id: number;
  admission_id: number;
  from_nurse_id: number;
  to_nurse_id: number;

  patient: {
    uhid: string;
    name: string;
  };

  ward_name: string;
  bed_number: string | null;

  from_nurse_name: string;

  shift_start: string;
  shift_end: string;

  status: "SENT" | "ACKNOWLEDGED";

  created_at: string;
  sent_at: string | null;
  acknowledged_at: string | null;

  content: HandoverContent;
};

export default function IncomingHandoversScreen() {
  const [handovers, setHandovers] = useState<IncomingHandover[]>([]);
  const [loading, setLoading] = useState(true);
  const [acknowledgingId, setAcknowledgingId] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadHandovers();
    }, []),
  );

  async function loadHandovers() {
    try {
      setLoading(true);

      const token = await getStoredToken();

      if (!token) {
        Alert.alert("Authentication Required", "Please log in again.");
        return;
      }

      const response = await fetch(
        `${API_URL}/api/handovers/incoming`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to load incoming handovers.",
        );
      }

      setHandovers(data.handovers || []);
    } catch (error) {
      console.error("Load incoming handovers error:", error);

      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "Failed to load incoming handovers.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function acknowledgeHandover(handoverId: number) {
    try {
      setAcknowledgingId(handoverId);

      const token = await getStoredToken();

      if (!token) {
        Alert.alert("Authentication Required", "Please log in again.");
        return;
      }

      const response = await fetch(
        `${API_URL}/api/handovers/${handoverId}/acknowledge`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to acknowledge handover.",
        );
      }

      setHandovers((current) =>
        current.map((handover) =>
          handover.handover_id === handoverId
            ? {
                ...handover,
                status: "ACKNOWLEDGED",
                acknowledged_at:
                  data.handover.acknowledged_at ||
                  new Date().toISOString(),
              }
            : handover,
        ),
      );

      Alert.alert(
        "Handover Acknowledged",
        "The handover has been marked as acknowledged.",
      );
    } catch (error) {
      console.error("Acknowledge handover error:", error);

      Alert.alert(
        "Acknowledgement Failed",
        error instanceof Error
          ? error.message
          : "Failed to acknowledge handover.",
      );
    } finally {
      setAcknowledgingId(null);
    }
  }

  function formatDateTime(value: string | null) {
    if (!value) {
      return "—";
    }

    return new Date(value).toLocaleString();
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>← Back</Text>
        </Pressable>

        <Text style={styles.title}>Incoming Handovers</Text>

        <Text style={styles.subtitle}>
          Review handovers received for your current shift
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" />

            <Text style={styles.loadingText}>
              Loading handovers...
            </Text>
          </View>
        ) : handovers.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>
              No Incoming Handovers
            </Text>

            <Text style={styles.emptyText}>
              There are no handovers available for your current shift.
            </Text>
          </View>
        ) : (
          handovers.map((handover) => (
            <View
              key={handover.handover_id}
              style={styles.card}
            >
              <View style={styles.cardHeader}>
                <View style={styles.patientInfo}>
                  <Text style={styles.patientName}>
                    {handover.patient.name}
                  </Text>

                  <Text style={styles.uhid}>
                    UHID: {handover.patient.uhid}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    handover.status === "SENT"
                      ? styles.sentBadge
                      : styles.acknowledgedBadge,
                  ]}
                >
                  <Text style={styles.statusText}>
                    {handover.status}
                  </Text>
                </View>
              </View>

              <Text style={styles.detail}>
                Ward: {handover.ward_name}
              </Text>

              <Text style={styles.detail}>
                Bed: {handover.bed_number || "—"}
              </Text>

              <Text style={styles.detail}>
                From: {handover.from_nurse_name}
              </Text>

              <View style={styles.sbarSection}>
                <Text style={styles.sectionTitle}>Situation</Text>
                <Text style={styles.sbarText}>
                  {handover.content.situation || "Not documented."}
                </Text>
              </View>

              <View style={styles.sbarSection}>
                <Text style={styles.sectionTitle}>Background</Text>
                <Text style={styles.sbarText}>
                  {handover.content.background || "Not documented."}
                </Text>
              </View>

              <View style={styles.sbarSection}>
                <Text style={styles.sectionTitle}>Assessment</Text>
                <Text style={styles.sbarText}>
                  {handover.content.assessment || "Not documented."}
                </Text>
              </View>

              <View style={styles.sbarSection}>
                <Text style={styles.sectionTitle}>
                  Recommendation
                </Text>
                <Text style={styles.sbarText}>
                  {handover.content.recommendation ||
                    "Not documented."}
                </Text>
              </View>

              <View style={styles.timeSection}>
                <Text style={styles.timeText}>
                  Sent: {formatDateTime(handover.sent_at)}
                </Text>

                {handover.acknowledged_at && (
                  <Text style={styles.timeText}>
                    Acknowledged:{" "}
                    {formatDateTime(handover.acknowledged_at)}
                  </Text>
                )}
              </View>

              {handover.status === "SENT" && (
                <Pressable
                  style={[
                    styles.acknowledgeButton,
                    acknowledgingId === handover.handover_id &&
                      styles.disabledButton,
                  ]}
                  onPress={() =>
                    acknowledgeHandover(handover.handover_id)
                  }
                  disabled={
                    acknowledgingId === handover.handover_id
                  }
                >
                  {acknowledgingId === handover.handover_id ? (
                    <View style={styles.loadingRow}>
                      <ActivityIndicator color="#ffffff" />

                      <Text style={styles.buttonText}>
                        Acknowledging...
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.buttonText}>
                      Acknowledge Handover
                    </Text>
                  )}
                </Pressable>
              )}
            </View>
          ))
        )}
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
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#dddddd",
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
    color: "#666666",
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  loadingContainer: {
    alignItems: "center",
    paddingTop: 40,
  },

  loadingText: {
    marginTop: 12,
    color: "#666666",
  },

  emptyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#dddddd",
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },

  emptyText: {
    color: "#666666",
    lineHeight: 21,
  },

  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#dddddd",
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },

  patientInfo: {
    flex: 1,
    paddingRight: 10,
  },

  patientName: {
    fontSize: 20,
    fontWeight: "700",
  },

  uhid: {
    marginTop: 4,
    color: "#666666",
  },

  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  sentBadge: {
    backgroundColor: "#eeeeee",
  },

  acknowledgedBadge: {
    backgroundColor: "#dddddd",
  },

  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },

  detail: {
    fontSize: 15,
    marginTop: 5,
    color: "#444444",
  },

  sbarSection: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },

  sbarText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#444444",
  },

  timeSection: {
    marginTop: 18,
  },

  timeText: {
    fontSize: 13,
    color: "#666666",
    marginTop: 4,
  },

  acknowledgeButton: {
    backgroundColor: "#111111",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 18,
  },

  disabledButton: {
    opacity: 0.6,
  },

  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});