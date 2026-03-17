import { StyleSheet, Text, View, FlatList } from "react-native";
import { ScreenShell } from "../components/screen-shell";
import { useMembers } from "../hooks/use-workouts";

export function MembersScreen() {
  const membersQuery = useMembers();
  const members = membersQuery.data ?? [];

  return (
    <ScreenShell>
      <View style={styles.headerCard}>
        <Text style={styles.eyebrow}>Gestión de Miembros</Text>
        <Text style={styles.title}>Miembros</Text>
      </View>

      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.memberCard}>
            <Text style={styles.memberName}>{item.full_name}</Text>
            <Text style={styles.memberEmail}>{item.email}</Text>
            <View style={[styles.roleBadge, item.role === 'admin' ? styles.adminBadge : item.role === 'instructor' ? styles.instructorBadge : styles.memberBadge]}>
              <Text style={styles.roleText}>{item.role.toUpperCase()}</Text>
            </View>
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
  memberCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(19,34,56,0.08)",
    gap: 4
  },
  memberName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#132238"
  },
  memberEmail: {
    fontSize: 14,
    color: "#5F6F86"
  },
  roleBadge: {
    alignSelf: 'flex-start',
    marginTop: 4,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
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
  memberBadge: {
    backgroundColor: "#F3F4F6",
    borderColor: "#D1D5DB",
  },
  roleText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#4B5563",
  }
});
