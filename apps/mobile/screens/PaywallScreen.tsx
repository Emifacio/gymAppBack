import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { ScreenShell } from "../components/screen-shell";
import { getBillingErrorMessage, useBilling } from "../hooks/useBilling";
import type { RootStackParamList } from "../navigation/types";
import { getPrimaryPackage } from "../services/billing.service";

type PaywallScreenProps = NativeStackScreenProps<RootStackParamList, "Paywall">;

const BENEFITS = [
  "Book classes without hitting the paywall",
  "Keep your premium access synced across devices",
  "Restore purchases anytime from the app"
];

export function PaywallScreen({ navigation }: PaywallScreenProps) {
  const { isPremium, loading, offerings, purchase, restore } = useBilling();
  const primaryPackage = getPrimaryPackage(offerings);
  const price = primaryPackage?.product.priceString ?? "Loading...";

  const handlePurchase = async () => {
    try {
      await purchase();
      Alert.alert("Premium unlocked", "Your subscription is active.");
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    } catch (error) {
      const message = getBillingErrorMessage(error);
      if (message === "Purchase cancelled.") {
        return;
      }
      Alert.alert("Purchase unavailable", message);
    }
  };

  const handleRestore = async () => {
    try {
      await restore();
      Alert.alert("Restore complete", "Your purchases have been restored.");
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    } catch (error) {
      Alert.alert("Restore unavailable", getBillingErrorMessage(error));
    }
  };

  return (
    <ScreenShell>
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>ATHLYT Premium</Text>
        <Text style={styles.title}>Upgrade to Premium</Text>
        <Text style={styles.copy}>
          Unlock the premium booking flow with one monthly subscription managed by the App Store or
          Google Play.
        </Text>
      </View>

      <View style={styles.card}>
        {BENEFITS.map((benefit) => (
          <View key={benefit} style={styles.benefitRow}>
            <View style={styles.bullet} />
            <Text style={styles.benefitText}>{benefit}</Text>
          </View>
        ))}

        <View style={styles.priceBox}>
          <Text style={styles.priceLabel}>Monthly price</Text>
          <Text style={styles.priceValue}>{price}</Text>
          <Text style={styles.priceCaption}>Product: athlyt_premium_monthly</Text>
        </View>

        {isPremium ? (
          <View style={styles.activeBox}>
            <Text style={styles.activeTitle}>Premium is active</Text>
            <Text style={styles.activeCopy}>
              Your account already has access to premium features.
            </Text>
          </View>
        ) : null}

        <Pressable
          disabled={loading || !primaryPackage || isPremium}
          onPress={() => void handlePurchase()}
          style={({ pressed }) => [
            styles.primaryButton,
            (pressed || loading || !primaryPackage || isPremium) && styles.buttonPressed,
            (loading || !primaryPackage || isPremium) && styles.buttonDisabled
          ]}
        >
          <Text style={styles.primaryButtonText}>{loading ? "Processing..." : "Subscribe"}</Text>
        </Pressable>

        <Pressable
          disabled={loading}
          onPress={() => void handleRestore()}
          style={({ pressed }) => [
            styles.secondaryButton,
            (pressed || loading) && styles.buttonPressed
          ]}
        >
          <Text style={styles.secondaryButtonText}>
            {loading ? "Syncing..." : "Restore purchases"}
          </Text>
        </Pressable>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: "#132238",
    borderRadius: 32,
    gap: 12,
    padding: 26
  },
  eyebrow: {
    color: "#FFB7A4",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.6,
    textTransform: "uppercase"
  },
  title: {
    color: "white",
    fontSize: 34,
    fontWeight: "800"
  },
  copy: {
    color: "rgba(255,255,255,0.74)",
    fontSize: 15,
    lineHeight: 24
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderColor: "rgba(19,34,56,0.08)",
    borderRadius: 28,
    borderWidth: 1,
    gap: 18,
    padding: 22
  },
  benefitRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10
  },
  bullet: {
    backgroundColor: "#FF7A59",
    borderRadius: 999,
    height: 8,
    width: 8
  },
  benefitText: {
    color: "#132238",
    flex: 1,
    fontSize: 15,
    lineHeight: 22
  },
  priceBox: {
    backgroundColor: "#132238",
    borderRadius: 24,
    gap: 4,
    padding: 20
  },
  priceLabel: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase"
  },
  priceValue: {
    color: "white",
    fontSize: 30,
    fontWeight: "800"
  },
  priceCaption: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 13
  },
  activeBox: {
    backgroundColor: "rgba(23,184,156,0.12)",
    borderRadius: 20,
    gap: 6,
    padding: 18
  },
  activeTitle: {
    color: "#17B89C",
    fontSize: 16,
    fontWeight: "700"
  },
  activeCopy: {
    color: "#18846F",
    fontSize: 14,
    lineHeight: 20
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#FF7A59",
    borderRadius: 999,
    paddingVertical: 16
  },
  primaryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700"
  },
  secondaryButton: {
    alignItems: "center",
    borderColor: "rgba(19,34,56,0.12)",
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 16
  },
  secondaryButtonText: {
    color: "#132238",
    fontSize: 15,
    fontWeight: "700"
  },
  buttonPressed: {
    opacity: 0.88
  },
  buttonDisabled: {
    opacity: 0.55
  }
});
