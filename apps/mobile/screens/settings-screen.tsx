import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ScreenShell } from "../components/screen-shell";
import { useAuth } from "../hooks/use-auth";
import { getBillingErrorMessage, useBilling } from "../hooks/useBilling";
import { Ionicons } from "@expo/vector-icons";
import type { RootStackParamList } from "../navigation/types";

export function SettingsScreen() {
  const { logout, session } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isPremium, loading, restore } = useBilling();
  const showPremiumCard = session?.member.role === "member";

  return (
    <ScreenShell>
      <View style={styles.headerCard}>
        <Text style={styles.eyebrow}>Configuración</Text>
        <Text style={styles.title}>Ajustes</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cuenta</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.iconContainer}>
              <Ionicons name="person-outline" size={20} color="#132238" />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.label}>{session?.member.full_name}</Text>
              <Text style={styles.subLabel}>{session?.member.email}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <View style={[styles.iconContainer, { backgroundColor: "#F3E8FF" }]}>
              <Ionicons name="shield-outline" size={20} color="#7C3AED" />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.label}>Rol</Text>
              <Text style={styles.subLabel}>{session?.member.role?.toUpperCase()}</Text>
            </View>
          </View>
        </View>
      </View>

      {showPremiumCard ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Premium</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={[styles.iconContainer, styles.premiumIconContainer]}>
                <Ionicons name="diamond-outline" size={20} color="#FF7A59" />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.label}>{isPremium ? "Premium active" : "Free member"}</Text>
                <Text style={styles.subLabel}>
                  {isPremium
                    ? "Your premium entitlement is active."
                    : "Upgrade to unlock premium booking."}
                </Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.actionsRow}>
              {!isPremium ? (
                <Pressable
                  onPress={() => {
                    navigation.navigate("Paywall");
                  }}
                  style={({ pressed }) => [styles.primaryAction, pressed && styles.buttonPressed]}
                >
                  <Text style={styles.primaryActionText}>Upgrade to Premium</Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => {
                  void restore()
                    .then(() => {
                      Alert.alert("Restore complete", "Your purchases are synced.");
                    })
                    .catch((error) => {
                      Alert.alert("Restore unavailable", getBillingErrorMessage(error));
                    });
                }}
                style={({ pressed }) => [styles.secondaryAction, pressed && styles.buttonPressed]}
              >
                <Text style={styles.secondaryActionText}>
                  {loading ? "Syncing..." : "Restore purchases"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <Pressable
          onPress={() => void logout()}
          style={({ pressed }) => [styles.logoutButton, pressed && styles.buttonPressed]}
        >
          <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </Pressable>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  headerCard: {
    padding: 24,
    gap: 4
  },
  eyebrow: {
    color: "#FF7A59",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase"
  },
  title: {
    color: "#132238",
    fontSize: 34,
    fontWeight: "800"
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 20
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#5F6F86",
    textTransform: "uppercase",
    marginBottom: 8,
    marginLeft: 4
  },
  card: {
    backgroundColor: "white",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(19,34,56,0.06)"
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(19,34,56,0.06)",
    marginLeft: 56
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center"
  },
  textContainer: {
    flex: 1
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#132238"
  },
  subLabel: {
    fontSize: 13,
    color: "#5F6F86",
    marginTop: 1
  },
  logoutButton: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 59, 48, 0.1)"
  },
  logoutText: {
    color: "#FF3B30",
    fontSize: 16,
    fontWeight: "700"
  },
  buttonPressed: {
    opacity: 0.8
  },
  premiumIconContainer: {
    backgroundColor: "#FFF2EC"
  },
  actionsRow: {
    gap: 10,
    padding: 16
  },
  primaryAction: {
    alignItems: "center",
    backgroundColor: "#FF7A59",
    borderRadius: 999,
    paddingVertical: 14
  },
  primaryActionText: {
    color: "white",
    fontSize: 15,
    fontWeight: "700"
  },
  secondaryAction: {
    alignItems: "center",
    borderColor: "rgba(19,34,56,0.1)",
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 14
  },
  secondaryActionText: {
    color: "#132238",
    fontSize: 15,
    fontWeight: "700"
  }
});
