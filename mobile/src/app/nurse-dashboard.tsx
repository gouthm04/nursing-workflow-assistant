import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import DashboardHeader from "../components/DashboardHeader";
import { getStoredToken, getStoredUser } from "../services/auth";
import { API_URL } from "../constants/api";
import { colors, spacing, typography } from "../theme";

type Assignment = {
  assignment_id: number;
  nurse_id: number;
  ward_id: number;
  ward_name: string;
  shift_id: number;
  shift_name: string;
  start_time: string;
  end_time: string;
  shift_date: string;
  is_primary: boolean;
  is_override: boolean;
  replacement_nurse_id: number | null;
  override_reason: string | null;
};

type Patient = {
  admission_id: number;
};

type IncomingHandover = {
  handover_id: number;
  status: "SENT" | "ACKNOWLEDGED";
};

export default function NurseDashboard() {
  const [user, setUser] = useState<any>(null);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [patientCount, setPatientCount] = useState(0);
  const [incomingCount, setIncomingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const storedUser = await getStoredUser();
      const token = await getStoredToken();

      if (!storedUser || !token) {
        router.replace("/");
        return;
      }

      setUser(storedUser);

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const [assignmentResponse, patientsResponse, incomingResponse] =
        await Promise.all([
          fetch(`${API_URL}/api/nurse/today`, {
            method: "GET",
            headers,
          }),

          fetch(`${API_URL}/api/nurse/patients`, {
            method: "GET",
            headers,
          }),

          fetch(`${API_URL}/api/handovers/incoming`, {
            method: "GET",
            headers,
          }),
        ]);

      const assignmentData = await assignmentResponse.json();
      const patientsData = await patientsResponse.json();
      const incomingData = await incomingResponse.json();

      if (!assignmentResponse.ok) {
        throw new Error(
          assignmentData.message || "Failed to load today's assignment",
        );
      }

      if (!patientsResponse.ok) {
        throw new Error(
          patientsData.message || "Failed to load assigned patients",
        );
      }

      if (!incomingResponse.ok) {
        throw new Error(
          incomingData.message || "Failed to load incoming handovers",
        );
      }

      setAssignment(assignmentData.assignment);

      const patients: Patient[] = Array.isArray(patientsData.patients)
        ? patientsData.patients
        : [];

      const handovers: IncomingHandover[] = Array.isArray(
        incomingData.handovers,
      )
        ? incomingData.handovers
        : [];

      setPatientCount(patients.length);

      setIncomingCount(
        handovers.filter((handover) => handover.status === "SENT").length,
      );
    } catch (error) {
      console.error("Nurse dashboard error:", error);

      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to load dashboard",
      );
    } finally {
      setLoading(false);
    }
  }

  function formatTime(time: string) {
    return time.substring(0, 5);
  }

  function formatDate(date: string) {
    const parsed = new Date(`${date}T00:00:00`);

    return parsed.toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "short",
    });
  }

  return (
    <View style={styles.container}>
      <DashboardHeader />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome / Hero */}
        <View style={styles.hero}>
          <View style={styles.waveOne} />
          <View style={styles.waveTwo} />
          <View style={styles.waveThree} />

          <View style={styles.heroText}>
            <Text style={styles.greeting}>Hello,</Text>

            <Text style={styles.greetingName}>
              {user?.full_name || "Nurse"}
            </Text>
          </View>

          <Image
            source={require("../../assets/nurse-hero.png")}
            style={styles.nurseImage}
            resizeMode="contain"
          />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />

            <Text style={styles.loadingText}>Loading today’s shift...</Text>
          </View>
        ) : (
          <>
            {/* Today's Shift */}
            <View style={styles.section}>
              <View style={styles.sectionLabelRow}>
                <Ionicons
                  name="calendar-outline"
                  size={17}
                  color={colors.textSecondary}
                />

                <Text style={styles.sectionTitle}>TODAY’S SHIFT</Text>
              </View>

              {assignment ? (
                <View style={styles.shiftCard}>
                  <View style={styles.shiftTopRow}>
                    <View style={styles.shiftTitleArea}>
                      <Text style={styles.shiftWard}>
                        {assignment.ward_name}
                      </Text>

                      <Text style={styles.shiftName}>
                        {assignment.shift_name} Shift
                      </Text>
                    </View>

                    <View style={styles.activeBadge}>
                      <View style={styles.activeDot} />

                      <Text style={styles.activeText}>ACTIVE</Text>
                    </View>
                  </View>

                  <View style={styles.shiftDivider} />

                  <View style={styles.shiftDetails}>
                    <View style={styles.detailItem}>
                      <Ionicons
                        name="time-outline"
                        size={18}
                        color={colors.primary}
                      />

                      <View>
                        <Text style={styles.detailLabel}>SHIFT TIME</Text>

                        <Text style={styles.detailValue}>
                          {formatTime(assignment.start_time)} –{" "}
                          {formatTime(assignment.end_time)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.detailItem}>
                      <Ionicons
                        name="calendar-outline"
                        size={18}
                        color={colors.primary}
                      />

                      <View>
                        <Text style={styles.detailLabel}>DATE</Text>

                        <Text style={styles.detailValue}>
                          {formatDate(assignment.shift_date)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {assignment.is_override && assignment.override_reason && (
                    <View style={styles.overrideNotice}>
                      <Ionicons
                        name="swap-horizontal-outline"
                        size={17}
                        color={colors.warning}
                      />

                      <Text style={styles.overrideText}>
                        Replacement duty: {assignment.override_reason}
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.emptyShiftCard}>
                  <View style={styles.emptyIcon}>
                    <Ionicons
                      name="calendar-outline"
                      size={24}
                      color={colors.textSecondary}
                    />
                  </View>

                  <Text style={styles.emptyTitle}>No assignment today</Text>

                  <Text style={styles.emptyText}>
                    You do not have a roster assignment for today.
                  </Text>
                </View>
              )}
            </View>

            {/* My Work */}
            <View style={styles.section}>
              <Text style={styles.myWorkTitle}>My Work</Text>

              <View style={styles.workGrid}>
                {/* Patients */}
                <Pressable
  style={styles.workCard}
  onPress={() => router.push("/my-patients")}
>
  <View style={styles.workIcon}>
    <Ionicons
      name="people-outline"
      size={24}
      color={colors.primary}
    />
  </View>

  <View style={styles.workTitleRow}>
    <Text style={styles.workTitle}>Patients</Text>

    <Ionicons
      name="chevron-forward"
      size={18}
      color={colors.textTertiary}
    />
  </View>

  <Text style={styles.patientCount}>
    {patientCount}{" "}
    {patientCount === 1 ? "patient" : "patients"}
  </Text>
</Pressable>

                {/* Shift Handover */}
               <Pressable
  style={styles.workCard}
  onPress={() => router.push("/handover")}
>
  <View style={styles.workIcon}>
    <Ionicons
      name="swap-horizontal-outline"
      size={24}
      color={colors.primary}
    />
  </View>

  <View style={styles.workTitleRow}>
    <Text style={styles.workTitle}>
      Shift Handover
    </Text>

    <Ionicons
      name="chevron-forward"
      size={18}
      color={colors.textTertiary}
    />
  </View>
</Pressable>
              </View>

              {/* Incoming Handovers */}
              <Pressable
                style={styles.incomingCard}
                onPress={() => router.push("/incoming-handovers")}
              >
                <View style={styles.incomingIcon}>
                  <Ionicons
                    name="mail-open-outline"
                    size={23}
                    color={colors.primary}
                  />
                </View>

                <View style={styles.incomingContent}>
                  <Text style={styles.incomingTitle}>Incoming Handovers</Text>

                  <Text style={styles.incomingCount}>
                    {incomingCount} pending
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.textTertiary}
                />
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    paddingBottom: spacing.xxxl,
  },

  hero: {
    height: 174,
    marginTop: spacing.xs,
    marginHorizontal: spacing.lg,
    borderRadius: 28,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#F3F0FB",
  },

  waveOne: {
    position: "absolute",
    width: 310,
    height: 150,
    borderRadius: 100,
    backgroundColor: "#E9E5FA",
    opacity: 0.65,
    left: -120,
    bottom: -82,
    transform: [{ rotate: "-10deg" }],
  },

  waveTwo: {
    position: "absolute",
    width: 280,
    height: 130,
    borderRadius: 100,
    backgroundColor: "#E7EEFA",
    opacity: 0.7,
    left: 65,
    bottom: -90,
    transform: [{ rotate: "8deg" }],
  },

  waveThree: {
    position: "absolute",
    width: 230,
    height: 120,
    borderRadius: 100,
    backgroundColor: "#F0EAFB",
    opacity: 0.8,
    right: -80,
    top: -65,
  },

  heroText: {
    position: "absolute",
    left: spacing.xl,
    top: spacing.xxl,
    zIndex: 2,
  },

  greeting: {
    fontSize: 22,
    fontWeight: "500",
    color: colors.text,
  },

  greetingName: {
    marginTop: 1,
    fontSize: 27,
    fontWeight: "700",
    color: colors.text,
    maxWidth: 190,
  },

  nurseImage: {
    position: "absolute",
    right: -12,
    bottom: -4,
    width: 225,
    height: 160,
    zIndex: 1,
  },

  section: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
  },

  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },

  sectionTitle: {
    ...typography.sectionTitle,
    color: colors.textSecondary,
    letterSpacing: 0.8,
  },

  shiftCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,

    shadowColor: "#7B82A3",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.035,
    shadowRadius: 18,

    elevation: 1,
  },

  shiftTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },

  shiftTitleArea: {
    flex: 1,
  },

  shiftWard: {
    fontSize: 21,
    fontWeight: "700",
    color: colors.text,
  },

  shiftName: {
    marginTop: spacing.xs,
    fontSize: 14,
    fontWeight: "500",
    color: colors.textSecondary,
  },

  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.successSoft,
  },

  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.success,
  },

  activeText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.success,
    letterSpacing: 0.5,
  },

  shiftDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },

  shiftDetails: {
    flexDirection: "row",
    gap: spacing.xxl,
  },

  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },

  detailLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textTertiary,
    letterSpacing: 0.5,
  },

  detailValue: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },

  overrideNotice: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.warningSoft,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  overrideText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "500",
    color: colors.warning,
  },

  emptyShiftCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },

  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.iconBackground,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },

  emptyTitle: {
    ...typography.cardTitle,
    color: colors.text,
  },

  emptyText: {
    marginTop: spacing.xs,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
  },

  myWorkTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.md,
  },

 workGrid: {
  flexDirection: "row",
  gap: spacing.sm,
},

 workCard: {
  flex: 1,
  minHeight: 112,
  backgroundColor: colors.surface,
  borderRadius: 18,
  padding: spacing.lg,
  borderWidth: 1,
  borderColor: colors.border,

  shadowColor: "#7B82A3",
  shadowOffset: {
    width: 0,
    height: 4,
  },
  shadowOpacity: 0.03,
  shadowRadius: 16,

  elevation: 1,
},

  workIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },


workTitleRow: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  marginTop: spacing.md,
},

workTitle: {
  ...typography.cardTitle,
  color: colors.text,
  flexShrink: 1,
},

patientCount: {
  marginTop: 4,
  fontSize: 12,
  fontWeight: "500",
  color: colors.textSecondary,
},

  incomingCard: {
    marginTop: spacing.md,
    minHeight: 82,
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",

    shadowColor: "#7B82A3",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.03,
    shadowRadius: 16,

    elevation: 1,
  },

  incomingIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },

  incomingContent: {
    flex: 1,
    marginLeft: spacing.md,
  },

  incomingTitle: {
    ...typography.cardTitle,
    color: colors.text,
  },

  incomingCount: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: "500",
    color: colors.textSecondary,
  },

  loadingContainer: {
    minHeight: 260,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: spacing.md,
    fontSize: 14,
    color: colors.textSecondary,
  },
});
