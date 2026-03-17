import { useState, useMemo, useEffect } from "react";
import { 
  StyleSheet, 
  Text, 
  View, 
  FlatList, 
  TextInput, 
  Pressable, 
  Modal, 
  ActivityIndicator, 
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import { ScreenShell } from "../components/screen-shell";
import { 
  useMembers, 
  useUpdateMember, 
  useAssignSubscription, 
  usePlans 
} from "../hooks/use-workouts";
import { Ionicons } from "@expo/vector-icons";

export function MembersScreen() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);

  // Queries & Mutations
  const membersQuery = useMembers();
  const plansQuery = usePlans();
  const updateMemberMutation = useUpdateMember();
  const assignSubscriptionMutation = useAssignSubscription();

  const members = membersQuery.data ?? [];
  const plans = plansQuery.data ?? [];

  // Search Debounce Logic
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Filtered List
  const filteredMembers = useMemo(() => {
    const query = debouncedSearch.toLowerCase().trim();
    if (!query) return members;
    return members.filter(m => 
      m.full_name.toLowerCase().includes(query) || 
      m.email.toLowerCase().includes(query)
    );
  }, [members, debouncedSearch]);

  const handleToggleStatus = async (member: any) => {
    const newStatus = member.membership_status === "active" ? "suspended" : "active";
    try {
      await updateMemberMutation.mutateAsync({
        memberId: member.id,
        payload: { membership_status: newStatus }
      });
      setIsActionModalOpen(false);
      setSelectedMember(null);
    } catch (error: any) {
      Alert.alert("Error", error?.message || "No se pudo cambiar el estado del miembro.");
    }
  };

  const handleUpdatePlan = async (planId: string) => {
    if (!selectedMember) return;
    try {
      await assignSubscriptionMutation.mutateAsync({
        memberId: selectedMember.id,
        payload: { plan_id: planId }
      });
      setIsPlanModalOpen(false);
      setSelectedMember(null);
      Alert.alert("Éxito", "Plan actualizado correctamente.");
    } catch (error: any) {
      Alert.alert("Error", error?.message || "No se pudo actualizar el plan.");
    }
  };

  const renderMemberCard = ({ item }: { item: any }) => (
    <Pressable 
      style={({ pressed }) => [styles.memberCard, pressed && styles.cardPressed]}
      onPress={() => {
        setSelectedMember(item);
        setIsActionModalOpen(true);
      }}
    >
      <View style={styles.cardInfo}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.full_name.charAt(0)}</Text>
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.memberName}>{item.full_name}</Text>
          <Text style={styles.memberEmail}>{item.email}</Text>
          <View style={styles.metaRow}>
            <View style={styles.planTag}>
              <Ionicons name="fitness-outline" size={10} color="#5F6F86" />
              <Text style={styles.planText}>{item.plan_name || "Sin plan"}</Text>
            </View>
            <View style={[
              styles.statusBadge, 
              item.membership_status === "active" ? styles.statusActive : styles.statusSuspended
            ]}>
              <View style={[
                styles.statusDot, 
                { backgroundColor: item.membership_status === "active" ? "#34C759" : "#FF3B30" }
              ]} />
              <Text style={[
                styles.statusText,
                { color: item.membership_status === "active" ? "#1A7F37" : "#BF2117" }
              ]}>
                {item.membership_status === "active" ? "Activo" : "Suspendido"}
              </Text>
            </View>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
      </View>
    </Pressable>
  );

  return (
    <ScreenShell>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Consola de Administración</Text>
        <Text style={styles.title}>Miembros</Text>
        
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#718198" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre o email..."
            placeholderTextColor="#718198"
            value={search}
            onChangeText={setSearch}
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {membersQuery.isLoading ? (
        <ActivityIndicator color="#FF7A59" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredMembers}
          keyExtractor={(item) => item.id}
          renderItem={renderMemberCard}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color="#E5E7EB" />
              <Text style={styles.emptyText}>No se encontraron miembros</Text>
            </View>
          }
        />
      )}

      {/* Quick Action Modal */}
      <Modal
        visible={isActionModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsActionModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.actionSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{selectedMember?.full_name}</Text>
            <Text style={styles.sheetSubtitle}>{selectedMember?.email}</Text>
            
            <View style={styles.actionGrid}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => {
                  setIsActionModalOpen(false);
                  setIsPlanModalOpen(true);
                }}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#E0F2FE' }]}>
                  <Ionicons name="card-outline" size={22} color="#0EA5E9" />
                </View>
                <Text style={styles.actionLabel}>Cambiar Plan</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => handleToggleStatus(selectedMember)}
              >
                <View style={[
                  styles.actionIcon, 
                  { backgroundColor: selectedMember?.membership_status === 'active' ? '#FEF2F2' : '#F0FDF4' }
                ]}>
                  <Ionicons 
                    name={selectedMember?.membership_status === 'active' ? "pause-circle-outline" : "checkmark-circle-outline"} 
                    size={22} 
                    color={selectedMember?.membership_status === 'active' ? "#EF4444" : "#22C55E"} 
                  />
                </View>
                <Text style={styles.actionLabel}>
                  {selectedMember?.membership_status === 'active' ? "Suspender" : "Activar"}
                </Text>
              </TouchableOpacity>
            </View>

            <Pressable 
              style={styles.cancelButton} 
              onPress={() => setIsActionModalOpen(false)}
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Change Plan Modal */}
      <Modal
        visible={isPlanModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsPlanModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.planModal}>
            <Text style={styles.modalTitle}>Seleccionar Nuevo Plan</Text>
            <View style={styles.planList}>
              {plans.map((plan: any) => (
                <TouchableOpacity
                  key={plan.id}
                  style={styles.planItem}
                  onPress={() => handleUpdatePlan(plan.id)}
                >
                  <View>
                    <Text style={styles.planItemName}>{plan.name}</Text>
                    <Text style={styles.planItemPrice}>${plan.price} / {plan.duration_days} días</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
                </TouchableOpacity>
              ))}
            </View>
            <Pressable 
              style={styles.closeButton} 
              onPress={() => setIsPlanModalOpen(false)}
            >
              <Text style={styles.closeButtonText}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20
  },
  eyebrow: {
    color: "#FF7A59",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 4
  },
  title: {
    color: "#132238",
    fontSize: 34,
    fontWeight: "800",
    marginBottom: 20
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(19, 34, 56, 0.05)",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44
  },
  searchIcon: {
    marginRight: 8
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#132238"
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
    gap: 12
  },
  memberCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(19, 34, 56, 0.06)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
    backgroundColor: "#F9FAFB"
  },
  cardInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 122, 89, 0.1)",
    alignItems: "center",
    justifyContent: "center"
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FF7A59"
  },
  textContainer: {
    flex: 1,
    gap: 2
  },
  memberName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#132238"
  },
  memberEmail: {
    fontSize: 13,
    color: "#5F6F86",
    marginBottom: 4
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  planTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4
  },
  planText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#5F6F86"
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 5
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3
  },
  statusActive: {
    backgroundColor: "#EBFDF0"
  },
  statusSuspended: {
    backgroundColor: "#FEF2F2"
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700"
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 60,
    gap: 12
  },
  emptyText: {
    color: "#9CA3AF",
    fontSize: 16
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end"
  },
  actionSheet: {
    backgroundColor: "white",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 44 : 32
  },
  sheetHandle: {
    width: 40,
    height: 5,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 20
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#132238",
    textAlign: "center"
  },
  sheetSubtitle: {
    fontSize: 14,
    color: "#5F6F86",
    textAlign: "center",
    marginBottom: 24
  },
  actionGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20
  },
  actionButton: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(19, 34, 56, 0.04)"
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#132238"
  },
  cancelButton: {
    paddingVertical: 16,
    alignItems: "center"
  },
  cancelText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#718198"
  },
  planModal: {
    backgroundColor: "white",
    borderRadius: 24,
    margin: 20,
    padding: 24,
    maxHeight: "80%"
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#132238",
    marginBottom: 20,
    textAlign: "center"
  },
  planList: {
    gap: 10
  },
  planItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(19, 34, 56, 0.04)"
  },
  planItemName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#132238"
  },
  planItemPrice: {
    fontSize: 13,
    color: "#5F6F86",
    marginTop: 2
  },
  closeButton: {
    marginTop: 20,
    paddingVertical: 12,
    alignItems: "center"
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FF7A59"
  }
});

