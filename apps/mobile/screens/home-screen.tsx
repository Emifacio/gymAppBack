import { Ionicons } from "@expo/vector-icons";
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
        <Text style={styles.eyebrow}>Plataforma Móvil</Text>
        <Text style={styles.heroTitle}>Hola {session?.member.full_name.split(" ")[0]}</Text>
        <Text style={styles.heroCopy}>
          Esta pantalla utiliza el mismo paquete de API compartido que el panel web, con navegación nativa y almacenamiento local.
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 8 }}>
          <Pressable
            onPress={() => {
              void logout();
            }}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
          >
            <Text style={styles.secondaryButtonText}>Cerrar sesión</Text>
          </Pressable>
          {session?.member.role !== 'member' && (
            <View style={[styles.roleBadge, session?.member.role === 'admin' ? styles.adminBadge : styles.instructorBadge]}>
              <Text style={styles.roleText}>{session?.member.role?.toUpperCase()}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.statsRow}>
        {session?.member.role === 'admin' ? (
          <View style={styles.adminWelcome}>
            <Ionicons name="shield-checkmark" size={48} color="rgba(255,255,255,0.2)" />
            <Text style={styles.adminWelcomeTitle}>Panel de Control</Text>
            <Text style={styles.adminWelcomeText}>Gestiona miembros, clases y asistencia desde las pestañas inferiores.</Text>
          </View>
        ) : (
          <>
            <StatChip label="Clases" tone="accent" value={String(workouts.length)} />
            <StatChip label="Reservas" tone="highlight" value={String(bookings.length)} />
            <StatChip label="En Espera" value={String(waitlist.length)} />
          </>
        )}
      </View>


      {(session?.member.role !== 'admin' && nextWorkout) ? (
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
  },
  roleBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
  },
  adminBadge: {
    backgroundColor: "#F3E8FF",
    borderColor: "#D8B4FE",
  },
  instructorBadge: {
    backgroundColor: "#DBEAFE",
    borderColor: "#93C5FD",
  },
  roleText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#4B5563",
  },
  adminWelcome: {
    padding: 24,
    backgroundColor: "#132238",
    borderRadius: 24,
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(255,122,89,0.2)"
  },
  adminWelcomeTitle: {
    color: "white",
    fontSize: 22,
    fontWeight: "800"
  },
  adminWelcomeText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20
  }
});
