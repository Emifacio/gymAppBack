import { useEffect, useMemo } from "react";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { StyleSheet, Text, View } from "react-native";

import { ScreenShell } from "../components/screen-shell";
import { WorkoutCard } from "../components/workout-card";
import { useAuth } from "../hooks/use-auth";
import { useBilling } from "../hooks/useBilling";
import { useWorkouts } from "../hooks/use-workouts";
import type { RootStackParamList } from "../navigation/types";

export function WorkoutsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { session } = useAuth();
  const { isPremium } = useBilling();
  const workoutsQuery = useWorkouts({ limit: 20 });
  const needsPremium = session?.member.role === "member" && !isPremium;

  useEffect(() => {
    const refresh = setInterval(() => {
      void workoutsQuery.refetch?.();
    }, 60_000);
    return () => clearInterval(refresh);
  }, [workoutsQuery]);

  const upcomingWorkouts = useMemo(() => {
    const now = new Date();
    return (workoutsQuery.data ?? [])
      .filter((workout) => new Date(workout.scheduled_at) > now)
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
  }, [workoutsQuery.data]);

  return (
    <ScreenShell>
      <View style={styles.headerCard}>
        <Text style={styles.eyebrow}>Recurso compartido `/classes`</Text>
        <Text style={styles.title}>Clases</Text>
        <Text style={styles.copy}>
          Esta sección muestra las sesiones de entrenamiento disponibles, obtenidas directamente de
          los endpoints reales del backend.
        </Text>
      </View>

      {upcomingWorkouts.length === 0 ? (
        <Text style={styles.noWorkoutsText}>
          No hay clases próximas. Revisa de nuevo en unos minutos.
        </Text>
      ) : (
        upcomingWorkouts.map((workout) => (
          <WorkoutCard
            key={workout.id}
            onPress={() => {
              if (needsPremium) {
                navigation.navigate("Paywall");
                return;
              }
              navigation.navigate("WorkoutDetail", { workoutId: workout.id });
            }}
            workout={workout}
          />
        ))
      )}
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
  },
  noWorkoutsText: {
    color: "#5F6F86",
    fontSize: 16,
    textAlign: "center",
    marginVertical: 20
  }
});
