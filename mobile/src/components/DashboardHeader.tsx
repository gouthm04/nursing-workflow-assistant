import React from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { getStoredUser, logout } from "../services/auth";
import { colors, spacing, typography } from "../theme";

export default function DashboardHeader() {
  const [user, setUser] = React.useState<any>(null);

  React.useEffect(() => {
    async function loadUser() {
      const storedUser = await getStoredUser();
      setUser(storedUser);
    }

    loadUser();
  }, []);

  async function handleLogout() {
    await logout();

    Alert.alert("Logged out", "You have been logged out successfully.", [
      {
        text: "OK",
        onPress: () => router.replace("/"),
      },
    ]);
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.brandSection}>
          <View style={styles.logo}>
            <Ionicons
              name="medical"
              size={20}
              color={colors.primary}
            />
          </View>

          <View>
            <Text style={styles.appName}>NurA</Text>

            {user && (
              <Text style={styles.userInfo}>
                {user.full_name}
              </Text>
            )}
          </View>
        </View>

        <Pressable
          style={styles.profileButton}
          onPress={handleLogout}
          accessibilityLabel="Logout"
        >
          <Ionicons
            name="log-out-outline"
            size={21}
            color={colors.textSecondary}
          />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
  },

  header: {
    minHeight: 68,
    paddingHorizontal: spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  brandSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },

  logo: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },

  appName: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.2,
  },

  userInfo: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "500",
    color: colors.textSecondary,
  },

  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
});