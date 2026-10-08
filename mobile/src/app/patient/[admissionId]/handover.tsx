import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { getStoredToken } from "../../../services/auth";

import { API_URL } from "../../../constants/api";

type HandoverRecipient = {
  admission_id: number;
  ward_id: number;
  ward_name: string;
  incoming_nurse_id: number;
  incoming_nurse_name: string;
  next_shift_id: number;
  next_shift_name: string;
  next_shift_date: string;
  is_override: boolean;
};

type SBARDraft = {
  situation: string;
  background: string;
  assessment: string;
  recommendation: string;
};

type HandoverResponse = {
  recipient: HandoverRecipient;
  draft: SBARDraft;
};

export default function HandoverScreen() {
  const { admissionId, shiftId, shiftDate } = useLocalSearchParams<{
    admissionId: string;
    shiftId: string;
    shiftDate: string;
  }>();

  const [recipient, setRecipient] = useState<HandoverRecipient | null>(null);

  const [draft, setDraft] = useState<SBARDraft | null>(null);

  const [loading, setLoading] = useState(false);
  const [savedHandoverId, setSavedHandoverId] = useState<number | null>(null);
  const [handoverStatus, setHandoverStatus] = useState<"DRAFT" | "SENT" | null>(
    null,
  );

  const [recipientError, setRecipientError] = useState<string | null>(null);

  useEffect(() => {
    loadRecipient();
  }, []);

  async function loadRecipient() {
    setRecipientError(null);
    try {
      setLoading(true);

      const token = await getStoredToken();

      if (!token) {
        Alert.alert("Authentication required", "Please log in again.");
        return;
      }


      const response = await fetch(
        `${API_URL}/api/handovers/recipient/${admissionId}?shiftId=${shiftId}&shiftDate=${shiftDate}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to determine incoming nurse.");
      }

      setRecipient(data);
    } catch (error) {
  console.error("Load handover recipient error:", error);

  const message =
    error instanceof Error
      ? error.message
      : "Failed to determine incoming nurse.";

  setRecipientError(message);

  Alert.alert("Handover Unavailable", message);
} finally {
      setLoading(false);
    }
  }

  async function generateDraft() {
    try {
      setLoading(true);

      const token = await getStoredToken();

      if (!token) {
        Alert.alert("Authentication required", "Please log in again.");
        return;
      }

      const response = await fetch(
        `${API_URL}/api/handovers/${admissionId}/draft`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            shiftId: Number(shiftId),
            shiftDate,
          }),
        },
      );

      const data: HandoverResponse = await response.json();

      if (!response.ok) {
        throw new Error(
          (data as any).message || "Failed to generate SBAR draft.",
        );
      }

      setRecipient(data.recipient);
      setDraft(data.draft);
    } catch (error) {
      console.error("Generate SBAR draft error:", error);

      Alert.alert(
        "Generation Failed",
        error instanceof Error
          ? error.message
          : "Failed to generate SBAR draft.",
      );
    } finally {
      setLoading(false);
    }
  }
  async function saveHandover() {
    if (!draft) {
      return;
    }

    try {
      setLoading(true);

      const token = await getStoredToken();

      if (!token) {
        Alert.alert("Authentication required", "Please log in again.");
        return;
      }

      const response = await fetch(
        `${API_URL}/api/handovers/${admissionId}/save`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            shiftId: Number(shiftId),
            shiftDate,
            situation: draft.situation.trim(),
            background: draft.background.trim(),
            assessment: draft.assessment.trim(),
            recommendation: draft.recommendation.trim(),
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to save handover.");
      }

      setSavedHandoverId(Number(data.handover.handover_id));
      setHandoverStatus("DRAFT");

      Alert.alert(
        "Handover Saved",
        "The handover draft has been saved. You can now send it to the incoming nurse.",
      );
    } catch (error) {
      console.error("Save handover error:", error);

      Alert.alert(
        "Save Failed",
        error instanceof Error ? error.message : "Failed to save handover.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function sendHandover() {
    if (!savedHandoverId) {
      Alert.alert("Handover Not Saved", "Save the handover before sending it.");
      return;
    }

    try {
      setLoading(true);

      const token = await getStoredToken();

      if (!token) {
        Alert.alert("Authentication required", "Please log in again.");
        return;
      }

      const response = await fetch(
        `${API_URL}/api/handovers/${savedHandoverId}/send`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to send handover.");
      }

      setHandoverStatus("SENT");

      Alert.alert(
        "Handover Sent",
        "The handover has been sent to the incoming nurse.",
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ],
      );
    } catch (error) {
      console.error("Send handover error:", error);

      Alert.alert(
        "Send Failed",
        error instanceof Error ? error.message : "Failed to send handover.",
      );
    } finally {
      setLoading(false);
    }
  }
  function updateDraft(field: keyof SBARDraft, value: string) {
    if (!draft) {
      return;
    }

    setDraft({
      ...draft,
      [field]: value,
    });
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>

        <Text style={styles.title}>Shift Handover</Text>

        <Text style={styles.subtitle}>Patient ID: {admissionId}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Incoming Nurse</Text>

          {loading && !recipient ? (
            <ActivityIndicator />
          ) : recipient ? (
            <>
              <Text style={styles.infoText}>
                Nurse:{" "}
                <Text style={styles.infoValue}>
                  {recipient.incoming_nurse_name}
                </Text>
              </Text>

              <Text style={styles.infoText}>
                Ward:{" "}
                <Text style={styles.infoValue}>{recipient.ward_name}</Text>
              </Text>

              <Text style={styles.infoText}>
                Next Shift:{" "}
                <Text style={styles.infoValue}>
                  {recipient.next_shift_name}
                </Text>
              </Text>

              <Text style={styles.infoText}>
                Date:{" "}
                <Text style={styles.infoValue}>
                  {recipient.next_shift_date}
                </Text>
              </Text>
            </>
          ) :
            recipientError ? (
  <View>
    <Text style={styles.errorTitle}>
      Handover unavailable
    </Text>

    <Text style={styles.errorText}>
      {recipientError}
    </Text>

    <Text style={styles.helperText}>
      You can create a handover only when you are authorized
      for this patient during the selected shift.
    </Text>
  </View>
) : (
  <Text style={styles.helperText}>
    Incoming nurse information is not available.
  </Text>
)}

        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>SBAR Handover</Text>

          <Text style={styles.helperText}>
            Generate an AI draft from the patient's documented information.
            Review and edit everything before saving.
          </Text>

          <Pressable
           style={[
  styles.saveButton,
  (loading || !recipient || !!recipientError) && styles.disabledButton,
]}
onPress={generateDraft}
disabled={loading || !recipient || !!recipientError}
          >
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#ffffff" />
                <Text style={styles.buttonText}>Generating...</Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>Generate SBAR Draft</Text>
            )}
          </Pressable>
        </View>

        {draft && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Review Handover Draft</Text>

            <Text style={styles.reviewText}>
              AI-generated information is a draft. Review and correct it before
              saving.
            </Text>

            <View style={styles.section}>
              <Text style={styles.fieldTitle}>Situation</Text>

              <TextInput
                style={styles.textInput}
                value={draft.situation}
                onChangeText={(value) => updateDraft("situation", value)}
                multiline
                textAlignVertical="top"
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.fieldTitle}>Background</Text>

              <TextInput
                style={styles.textInput}
                value={draft.background}
                onChangeText={(value) => updateDraft("background", value)}
                multiline
                textAlignVertical="top"
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.fieldTitle}>Assessment</Text>

              <TextInput
                style={styles.textInput}
                value={draft.assessment}
                onChangeText={(value) => updateDraft("assessment", value)}
                multiline
                textAlignVertical="top"
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.fieldTitle}>Recommendation</Text>

              <TextInput
                style={styles.textInput}
                value={draft.recommendation}
                onChangeText={(value) => updateDraft("recommendation", value)}
                multiline
                textAlignVertical="top"
              />
            </View>

            <View style={styles.reviewBox}>
              <Text style={styles.reviewBoxText}>
                Review all four sections carefully before saving. The saved
                handover will remain a draft until it is sent to the incoming
                nurse.
              </Text>

              <Pressable
                style={[
  styles.generateButton,
  (loading || !recipient || recipientError) && styles.disabledButton,
]}
                onPress={saveHandover}
                disabled={loading || !recipient || !!recipientError}
              >
                {loading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator color="#ffffff" />
                    <Text style={styles.buttonText}>Saving...</Text>
                  </View>
                ) : (
                  <Text style={styles.buttonText}>Save Handover</Text>
                )}
              </Pressable>

              {savedHandoverId && handoverStatus === "DRAFT" && (
                <Pressable
                  style={[styles.sendButton, loading && styles.disabledButton]}
                  onPress={sendHandover}
                  disabled={loading}
                >
                  {loading ? (
                    <View style={styles.loadingRow}>
                      <ActivityIndicator color="#ffffff" />
                      <Text style={styles.buttonText}>Sending...</Text>
                    </View>
                  ) : (
                    <Text style={styles.buttonText}>Send Handover</Text>
                  )}
                </Pressable>
              )}
            </View>
          </View>
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
    backgroundColor: "#ffffff",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#dddddd",
  },

  backButton: {
    marginBottom: 12,
  },

  backText: {
    fontSize: 16,
  },

  title: {
    fontSize: 26,
    fontWeight: "700",
  },

  subtitle: {
    marginTop: 5,
    color: "#666666",
  },

  content: {
    padding: 16,
    paddingBottom: 40,
  },

  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#dddddd",
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },

  helperText: {
    color: "#666666",
    lineHeight: 20,
    marginBottom: 14,
  },

  infoText: {
    fontSize: 15,
    marginTop: 7,
    color: "#555555",
  },

  infoValue: {
    fontWeight: "600",
    color: "#222222",
  },

  generateButton: {
    backgroundColor: "#111111",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  errorTitle: {
  fontSize: 16,
  fontWeight: "700",
  color: "#222222",
  marginBottom: 6,
},

errorText: {
  color: "#555555",
  lineHeight: 20,
  marginBottom: 10,
},

  saveButton: {
    backgroundColor: "#111111",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 12,
  },

  sendButton: {
    backgroundColor: "#333333",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 12,
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

  reviewText: {
    color: "#666666",
    lineHeight: 20,
    marginBottom: 12,
  },

  section: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
  },

  fieldTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
    color: "#222222",
  },

  textInput: {
    minHeight: 125,
    borderWidth: 1,
    borderColor: "#d5d5d5",
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 15,
    lineHeight: 23,
    backgroundColor: "#fafafa",
    color: "#222222",
  },

  reviewBox: {
    marginTop: 18,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#eeeeee",
  },

  reviewBoxText: {
    fontSize: 14,
    color: "#555555",
    lineHeight: 20,
  },
});
