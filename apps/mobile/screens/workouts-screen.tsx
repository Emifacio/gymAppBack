import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { StyleSheet, Text, View } from "react-native";

import { ScreenShell } from "../components/screen-shell";
import { WorkoutCard } from "../components/workout-card";
import { useWorkouts } from "../hooks/use-workouts";
import type { RootStackParamList } from "../navigation/types";

export function WorkoutsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const workoutsQuery = useWorkouts({ limit: 20 });
  const workouts = workoutsQuery.data ?? [];

  return (
    <ScreenShell>
      <View style={styles.headerCard}>
        <Text style={styles.eyebrow}>Shared `/classes` resource</Text>
        <Text style={styles.title}>Workouts</Text>
        <Text style={styles.copy}>
          The product copy says workouts, but the generated API client still targets the backend’s real
          `/classes` endpoints.
        </Text>
      </View>

      {workouts.map((workout) => (
        <WorkoutCard
          key={workout.id}
          onPress={() => {
            navigation.navigate("WorkoutDetail", { workoutId: workout.id });
          }}
          workout={workout}
        />
      ))}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  headerCard: {
    backgroundColor: "rgba(255,255,255,0.84)",
    borderColor: "rgba(19,34,56,0.08)",
    borderRadius: 28,
    borderWidth: 1,
    gap: 10,
    padding: 22
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
    fontWeight: "700"
  },
  copy: {
    color: "#5F6F86",
    fontSize: 15,
    lineHeight: 24
  }
});
