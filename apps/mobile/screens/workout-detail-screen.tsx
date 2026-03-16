import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ScreenShell } from "../components/screen-shell";
import { useAuth } from "../hooks/use-auth";
import { useCreateBooking, useWorkout } from "../hooks/use-workouts";
import { formatWorkoutSchedule } from "../app/format";
import type { RootStackParamList } from "../navigation/types";

type WorkoutDetailScreenProps = NativeStackScreenProps<RootStackParamList, "WorkoutDetail">;

export function WorkoutDetailScreen({ route }: WorkoutDetailScreenProps) {
  const { session } = useAuth();
  const workoutQuery = useWorkout(route.params.workoutId);
  const bookingMutation = useCreateBooking();

  const workout = workoutQuery.data;

  if (!workout) {
    return (
      <ScreenShell>
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Loading workout...</Text>
          <Text style={styles.emptyCopy}>The typed query is resolving the class detail from the backend.</Text>
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell>
      <View style={styles.heroCard}>
        <Text style={styles.status}>{workout.status.toUpperCase()}</Text>
        <Text style={styles.title}>{workout.name}</Text>
        <Text style={styles.copy}>
          {workout.description ??
            "This view is powered by the shared `useWorkout` and `useCreateBooking` hooks from the API package."}
        </Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>Schedule</Text>
        <Text style={styles.infoValue}>{formatWorkoutSchedule(workout.scheduled_at)}</Text>

        <Text style={styles.infoLabel}>Location</Text>
        <Text style={styles.infoValue}>{workout.location}</Text>

        <Text style={styles.infoLabel}>Capacity</Text>
        <Text style={styles.infoValue}>{workout.capacity} athletes</Text>

        <Text style={styles.infoLabel}>Duration</Text>
        <Text style={styles.infoValue}>{workout.duration_minutes} minutes</Text>
      </View>

      <Pressable
        onPress={() => {
          bookingMutation.mutate({
            class_id: workout.id,
            member_id: session!.member.id
          });
        }}
        style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
      >
        <Text style={styles.primaryButtonText}>{bookingMutation.isPending ? "Booking..." : "Book workout"}</Text>
      </Pressable>

      {bookingMutation.data ? (
        <View style={styles.successBox}>
          <Text style={styles.successText}>{bookingMutation.data.message}</Text>
        </View>
      ) : null}
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
  status: {
    color: "#FFB7A4",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.7
  },
  title: {
    color: "white",
    fontSize: 34,
    fontWeight: "700"
  },
  copy: {
    color: "rgba(255,255,255,0.74)",
    fontSize: 15,
    lineHeight: 24
  },
  infoCard: {
    backgroundColor: "rgba(255,255,255,0.84)",
    borderColor: "rgba(19,34,56,0.08)",
    borderRadius: 28,
    borderWidth: 1,
    gap: 6,
    padding: 22
  },
  infoLabel: {
    color: "#5F6F86",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginTop: 8,
    textTransform: "uppercase"
  },
  infoValue: {
    color: "#132238",
    fontSize: 16,
    fontWeight: "600"
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#FF7A59",
    borderRadius: 999,
    paddingVertical: 16
  },
  primaryButtonText: {
    color: "white",
    fontSize: 15,
    fontWeight: "700"
  },
  buttonPressed: {
    opacity: 0.92
  },
  successBox: {
    backgroundColor: "rgba(23,184,156,0.12)",
    borderRadius: 20,
    padding: 16
  },
  successText: {
    color: "#17B89C",
    fontSize: 14,
    lineHeight: 22
  },
  emptyCard: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.84)",
    borderColor: "rgba(19,34,56,0.08)",
    borderRadius: 28,
    borderWidth: 1,
    gap: 12,
    padding: 24
  },
  emptyTitle: {
    color: "#132238",
    fontSize: 24,
    fontWeight: "700"
  },
  emptyCopy: {
    color: "#5F6F86",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center"
  }
});
