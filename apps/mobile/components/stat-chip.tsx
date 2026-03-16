import { StyleSheet, Text, View } from "react-native";

interface StatChipProps {
  label: string;
  value: string;
  tone?: "accent" | "highlight" | "default";
}

const toneStyles = {
  accent: { backgroundColor: "rgba(255,122,89,0.12)", color: "#FF7A59" },
  highlight: { backgroundColor: "rgba(23,184,156,0.12)", color: "#17B89C" },
  default: { backgroundColor: "rgba(19,34,56,0.07)", color: "#132238" }
} as const;

export function StatChip({ label, value, tone = "default" }: StatChipProps) {
  const toneStyle = toneStyles[tone];

  return (
    <View style={[styles.card, { backgroundColor: toneStyle.backgroundColor }]}>
      <Text style={[styles.label, { color: toneStyle.color }]}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 18,
    gap: 8
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1
  },
  value: {
    color: "#132238",
    fontSize: 28,
    fontWeight: "700"
  }
});
