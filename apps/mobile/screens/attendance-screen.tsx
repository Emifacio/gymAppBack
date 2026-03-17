import { StyleSheet, Text, View, FlatList } from "react-native";
import { ScreenShell } from "../components/screen-shell";
import { useMemberAttendance } from "../hooks/use-workouts";
import { formatWorkoutSchedule } from "../app/format";
import { useAuth } from "../hooks/use-auth";

export function AttendanceScreen() {
  const { session } = useAuth();
  // Using a generic attendance fetch if available, or just recent session attendance
  const attendanceQuery = useMemberAttendance(session!.member.id);
  const attendance = attendanceQuery.data ?? [];

  return (
    <ScreenShell>
      <View style={styles.headerCard}>
        <Text style={styles.eyebrow}>Historial Operativo</Text>
        <Text style={styles.title}>Asistencia</Text>
      </View>

      <FlatList
        data={attendance}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.attendanceCard}>
            <Text style={styles.classId}>ID Clase: {item.class_id.slice(0, 8)}</Text>
            <Text style={styles.date}>{formatWorkoutSchedule(item.marked_at)}</Text>
            <Text style={[styles.status, item.status === 'present' ? styles.present : styles.absent]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        )}
        contentContainerStyle={{ gap: 12, paddingBottom: 20 }}
      />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  headerCard: {
    backgroundColor: "rgba(255,255,255,0.84)",
    borderColor: "rgba(19,34,56,0.08)",
    borderRadius: 28,
    borderWidth: 1,
    gap: 6,
    padding: 22,
    marginBottom: 16
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
    fontSize: 32,
    fontWeight: "700"
  },
  attendanceCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(19,34,56,0.08)",
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12
  },
  classId: {
    fontSize: 14,
    fontWeight: "600",
    color: "#132238",
    flex: 1
  },
  date: {
    fontSize: 12,
    color: "#5F6F86"
  },
  status: {
    fontSize: 10,
    fontWeight: "800",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: 'hidden'
  },
  present: {
    backgroundColor: "#DCFCE7",
    color: "#166534",
  },
  absent: {
    backgroundColor: "#FEE2E2",
    color: "#991B1B",
  }
});
