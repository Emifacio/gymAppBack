import type { Workout } from "@gym/api-client";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { formatWorkoutSchedule } from "../app/format";

interface WorkoutCardProps {
  workout: Workout;
  onPress: () => void;
}

export function WorkoutCard({ workout, onPress }: WorkoutCardProps) {
  const now = new Date();
  const isPast = new Date(workout.scheduled_at) <= now;

  const statusLabel = (() => {
    if (workout.status === "cancelled") return "CANCELADA";
    if (workout.status === "completed") return "CONCLUÍDA";
    if (isPast) return "CONCLUÍDA";
    return "PROGRAMADA";
  })();

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={styles.header}>
        <View style={styles.copy}>
          <Text style={styles.status}>{statusLabel}</Text>
          <Text style={styles.title}>{workout.name}</Text>
          <Text style={styles.description} numberOfLines={2}>
            {workout.description ?? "Strength, conditioning, and guided pacing delivered from the shared API contract."}
          </Text>
        </View>
        <View style={styles.durationPill}>
          <Text style={styles.durationText}>{workout.duration_minutes} min</Text>
        </View>
      </View>

      <View style={styles.metaGrid}>
        <View>
          <Text style={styles.metaLabel}>Schedule</Text>
          <Text style={styles.metaValue}>{formatWorkoutSchedule(workout.scheduled_at)}</Text>
        </View>
        <View>
          <Text style={styles.metaLabel}>Location</Text>
          <Text style={styles.metaValue}>{workout.location}</Text>
        </View>
        <View>
          <Text style={styles.metaLabel}>Coach</Text>
          <Text style={styles.metaValue}>{workout.instructor?.full_name ?? "TBD"}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.84)",
    borderColor: "rgba(19,34,56,0.08)",
    borderRadius: 28,
    borderWidth: 1,
    gap: 18,
    padding: 20
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }]
  },
  header: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between"
  },
  copy: {
    flex: 1,
    gap: 8
  },
  status: {
    color: "#FF7A59",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5
  },
  title: {
    color: "#132238",
    fontSize: 24,
    fontWeight: "700"
  },
  description: {
    color: "#5F6F86",
    fontSize: 14,
    lineHeight: 22
  },
  durationPill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(19,34,56,0.08)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  durationText: {
    color: "#132238",
    fontSize: 12,
    fontWeight: "700"
  },
  metaGrid: {
    flexDirection: "row",
    gap: 24
  },
  metaLabel: {
    color: "#132238",
    fontSize: 13,
    fontWeight: "700"
  },
  metaValue: {
    color: "#5F6F86",
    fontSize: 13,
    marginTop: 4
  }
});
