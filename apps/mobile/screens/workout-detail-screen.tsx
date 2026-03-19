import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Alert, Pressable, StyleSheet, Text, View, Linking } from "react-native";

import { ScreenShell } from "../components/screen-shell";
import { useAuth } from "../hooks/use-auth";
import { useCreateBooking, useWorkout, useShareToStrava } from "../hooks/use-workouts";
import { formatWorkoutSchedule } from "../app/format";
import type { RootStackParamList } from "../navigation/types";

type WorkoutDetailScreenProps = NativeStackScreenProps<RootStackParamList, "WorkoutDetail">;

export function WorkoutDetailScreen({ route, navigation }: WorkoutDetailScreenProps) {
  const { session } = useAuth();
  const workoutQuery = useWorkout(route.params.workoutId);
  const bookingMutation = useCreateBooking();
  const shareToStravaMutation = useShareToStrava();

  const workout = workoutQuery.data;
  const isPast = workout ? new Date(workout.scheduled_at) < new Date() : false;

  if (!workout) {
    return (
      <ScreenShell>
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Cargando clase...</Text>
          <Text style={styles.emptyCopy}>Estamos obteniendo los detalles de la sesión desde el backend.</Text>
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell>
      <View style={styles.heroCard}>
        <Text style={styles.status}>{workout.status === 'scheduled' ? 'PROGRAMADA' : workout.status.toUpperCase()}</Text>
        <Text style={styles.title}>{workout.name}</Text>
        {isPast ? (
          <View style={styles.pastBadge}>
            <View style={styles.pastDot} />
            <Text style={styles.pastBadgeText}>Clase concluida</Text>
          </View>
        ) : null}
        <Text style={styles.copy}>
          {workout.description ??
            "Esta vista utiliza los hooks compartidos `useWorkout` y `useCreateBooking` del paquete de API."}
        </Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>Horario</Text>
        <Text style={styles.infoValue}>{formatWorkoutSchedule(workout.scheduled_at)}</Text>

        <Text style={styles.infoLabel}>Ubicación</Text>
        <Text style={styles.infoValue}>{workout.location}</Text>

        <Text style={styles.infoLabel}>Instructor</Text>
        <Text style={styles.infoValue}>{workout.instructor?.full_name ?? "Sin asignar"}</Text>

        <Text style={styles.infoLabel}>Capacidad</Text>
        <Text style={styles.infoValue}>{workout.capacity} atletas</Text>

        <Text style={styles.infoLabel}>Duración</Text>
        <Text style={styles.infoValue}>{workout.duration_minutes} minutos</Text>
      </View>

      <Pressable
        onPress={() => {
          if (isPast) {
            Alert.alert(
              "Clase finalizada",
              "El tiempo de inscripción ha terminado. Por favor, selecciona otra sesión disponible.",
              [
                { text: "Cerrar", style: "cancel" },
                { 
                  text: "Ver clases", 
                  onPress: () => {
                    Alert.alert("Redirigiendo a clases...");
                    navigation.goBack();
                  }
                }
              ]
            );
            return;
          }
          bookingMutation.mutate({
            classId: workout.id,
            memberId: session!.member.id
          });
        }}
        style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
      >
        <Text style={styles.primaryButtonText}>
          {bookingMutation.isPending ? "Reservando..." : isPast ? "Clase concluida" : "Reservar clase"}
        </Text>
      </Pressable>      {isPast && (
        <Pressable
          onPress={() => {
            shareToStravaMutation.mutate({ bookingId: workout.id }, {
              onSuccess: (data) => {
                if (data.external_url) {
                  void Linking.openURL(data.external_url);
                } else {
                  Alert.alert("Éxito", "Tu actividad ha sido compartida en Strava.");
                }
              },
              onError: (error) => {
                Alert.alert("Error", error.message || "No se pudo compartir la actividad en Strava. Verifica tu conexión en Ajustes.");
              }
            });
          }}
          disabled={shareToStravaMutation.isPending}
          style={({ pressed }) => [
            styles.stravaButton, 
            pressed && styles.buttonPressed,
            shareToStravaMutation.isPending && styles.disabledButton
          ]}
        >
          <Text style={styles.stravaButtonText}>
            {shareToStravaMutation.isPending ? "Compartiendo..." : "Compartir en Strava"}
          </Text>
        </Pressable>
      )}


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
  },
  pastBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 100, 100, 0.1)",
    borderRadius: 99,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 100, 100, 0.2)"
  },
  pastDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FF5252",
    marginRight: 6
  },
  pastBadgeText: {
    color: "#FF5252",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1
  },
  stravaButton: {
    alignItems: "center",
    backgroundColor: "#FC4C02",
    borderRadius: 999,
    paddingVertical: 16,
    marginTop: 12
  },
  stravaButtonText: {
    color: "white",
    fontSize: 15,
    fontWeight: "700"
  },
  disabledButton: {
    opacity: 0.5
  }
});
