import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ScreenShell } from "../components/screen-shell";
import { StatChip } from "../components/stat-chip";
import { WorkoutCard } from "../components/workout-card";
import { useAuth } from "../hooks/use-auth";
import { useMemberBookings, useWorkouts } from "../hooks/use-workouts";
import type { RootStackParamList } from "../navigation/types";

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { logout, session } = useAuth();
  const workoutsQuery = useWorkouts({ limit: 4 });
  const bookingsQuery = useMemberBookings(session!.member.id);

  const workouts = workoutsQuery.data ?? [];
  const bookings = bookingsQuery.data?.bookings ?? [];
  const waitlist = bookingsQuery.data?.waitlist ?? [];
  const nextWorkout = workouts[0];

  return (
    <ScreenShell>
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Contract-first mobile</Text>
        <Text style={styles.heroTitle}>Hi {session?.member.full_name.split(" ")[0]}</Text>
        <Text style={styles.heroCopy}>
          This home screen is reading the same shared API package as the web dashboard, just with React
          Navigation and Expo-native storage underneath.
        </Text>
        <Pressable
          onPress={() => {
            void logout();
          }}
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
        >
          <Text style={styles.secondaryButtonText}>Logout</Text>
        </Pressable>
      </View>

      <View style={styles.statsRow}>
        <StatChip label="Workouts" tone="accent" value={String(workouts.length)} />
        <StatChip label="Bookings" tone="highlight" value={String(bookings.length)} />
        <StatChip label="Waitlist" value={String(waitlist.length)} />
      </View>

      {nextWorkout ? (
        <WorkoutCard
          onPress={() => {
            navigation.navigate("WorkoutDetail", { workoutId: nextWorkout.id });
          }}
          workout={nextWorkout}
        />
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
  eyebrow: {
    color: "#FFB7A4",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.8,
    textTransform: "uppercase"
  },
  heroTitle: {
    color: "white",
    fontSize: 34,
    fontWeight: "700"
  },
  heroCopy: {
    color: "rgba(255,255,255,0.74)",
    fontSize: 15,
    lineHeight: 24
  },
  secondaryButton: {
    alignSelf: "flex-start",
    backgroundColor: "white",
    borderRadius: 999,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  secondaryButtonText: {
    color: "#132238",
    fontSize: 14,
    fontWeight: "700"
  },
  buttonPressed: {
    opacity: 0.92
  },
  statsRow: {
    gap: 12
  }
});
