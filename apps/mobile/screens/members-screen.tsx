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
  Platform,
  Dimensions
} from "react-native";
import { ScreenShell } from "../components/screen-shell";
import { 
  useMembers, 
  useUpdateMember, 
  useAssignPlan, 
  usePlans 
} from "../hooks/use-workouts";
import { useAuth } from "../hooks/use-auth";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import type { components } from "@gym/api-client";

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type MemberRead = components["schemas"]["MemberRead"];
type MembershipPlanRead = components["schemas"]["MembershipPlanRead"];
type MembershipStatus = components["schemas"]["MembershipStatus"];

interface MemberWithPlanName extends MemberRead {
  plan_name?: string | undefined;
}

interface PlanWithMeta extends MembershipPlanRead {
  price: string;
  duration_days: number;
}

export function MembersScreen() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const isAdmin = session?.member.role === "admin";
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<MemberWithPlanName | null>(null);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Queries & Mutations
  const membersQuery = useMembers();
  const plansQuery = usePlans();
  const updateMemberMutation = useUpdateMember();
  const assignPlanMutation = useAssignPlan();

  const plans = (plansQuery.data ?? []) as unknown as PlanWithMeta[];

  // Search Debounce Logic
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Toast Timer
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Filtered List
  const filteredMembers = useMemo(() => {
    const members = (membersQuery.data ?? []) as MemberWithPlanName[];
    const query = debouncedSearch.toLowerCase().trim();
    if (!query) return members;
    return members.filter(m => 
      m.full_name.toLowerCase().includes(query) || 
      m.email.toLowerCase().includes(query)
    );
  }, [membersQuery.data, debouncedSearch]);

  const handleToggleStatus = async (member: MemberWithPlanName) => {
    if (!isAdmin) return;
    const newStatus: MembershipStatus = member.membership_status === "active" ? "suspended" : "active";
    try {
      await updateMemberMutation.mutateAsync({
        memberId: member.id,
        payload: { membership_status: newStatus }
      });
      setIsActionModalOpen(false);
      setSelectedMember(null);
      setToast(`✅ ${member.full_name} ${newStatus === 'active' ? 'activado' : 'suspendido'}`);
    } catch (err) {
      const error = err as Error;
      Alert.alert("Error", error?.message ?? "No se pudo cambiar el estado.");
    }
  };

  const handleAssignPlan = async (planId: string) => {
    if (!selectedMember || !isAdmin) return;
    
    const plan = plans.find(p => p.id === planId);
    
    // Optimistic Update
    const previousMembers = queryClient.getQueryData<MemberWithPlanName[]>(['gym', 'members', 'list', {}]);
    queryClient.setQueryData<MemberWithPlanName[]>(['gym', 'members', 'list', {}], (old) => {
      if (!old || !selectedMember) return old;
      return old.map(m => 
        m.id === selectedMember.id ? { ...m, plan_name: plan?.name ?? undefined, membership_status: 'active' } : m
      );
    });

    try {
      await assignPlanMutation.mutateAsync({
        memberId: selectedMember.id,
        payload: { plan_id: planId }
      });
      setIsPlanModalOpen(false);
      setSelectedMember(null);
      setToast(`✅ Plan ${plan?.name} asignado con éxito`);
    } catch (err) {
      // Rollback
      queryClient.setQueryData(['gym', 'members', 'list', {}], previousMembers);
      const error = err as Error;
      Alert.alert("Error", error?.message ?? "No se pudo asignar el plan.");
    }
  };

  const renderMemberCard = ({ item }: { item: MemberWithPlanName }) => (
    <View style={styles.memberCard}>
      <TouchableOpacity 
        activeOpacity={isAdmin ? 0.7 : 1}
        style={styles.cardMain}
        onPress={() => {
          if (isAdmin) {
            setSelectedMember(item);
            setIsActionModalOpen(true);
          }
        }}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.full_name.charAt(0)}</Text>
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.memberName}>{item.full_name}</Text>
          <Text style={styles.memberEmail}>{item.email}</Text>
          <View style={styles.metaRow}>
            <View style={styles.planTag}>
              <Ionicons name="fitness-outline" size={10} color="#5F6F86" />
              <Text style={styles.planText}>{item.plan_name || "Sin plan asignado"}</Text>
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
        {isAdmin && <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />}
      </TouchableOpacity>

      {isAdmin && (
        <View style={styles.cardActions}>
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => {
              setSelectedMember(item);
              setIsPlanModalOpen(true);
            }}
          >
            <Ionicons name="card-outline" size={16} color="#4A90E2" />
            <Text style={styles.quickActionText}>
              {item.plan_name ? "Cambiar Plan" : "Asignar Plan"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <ScreenShell>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.eyebrow}>Administración</Text>
            <Text style={styles.title}>Miembros</Text>
          </View>
          {!isAdmin && (
            <View style={styles.readOnlyBadge}>
              <Ionicons name="lock-closed" size={12} color="#5F6F86" />
              <Text style={styles.readOnlyText}>Solo lectura</Text>
            </View>
          )}
        </View>
        
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#718198" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar miembros..."
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
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color="#E5E7EB" />
              <Text style={styles.emptyText}>No se encontraron resultados</Text>
            </View>
          }
        />
      )}

      {/* Action Sheet - Member Management */}
      <Modal
        visible={isActionModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsActionModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.dismissOverlay} onPress={() => setIsActionModalOpen(false)} />
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
                  <Ionicons name="card-outline" size={24} color="#0EA5E9" />
                </View>
                <Text style={styles.actionLabel}>Gestionar Plan</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => { if (selectedMember) void handleToggleStatus(selectedMember); }}
              >
                <View style={[
                  styles.actionIcon, 
                  { backgroundColor: selectedMember?.membership_status === 'active' ? '#FEF2F2' : '#F0FDF4' }
                ]}>
                  <Ionicons 
                    name={selectedMember?.membership_status === 'active' ? "pause-circle-outline" : "checkmark-circle-outline"} 
                    size={24} 
                    color={selectedMember?.membership_status === 'active' ? "#EF4444" : "#22C55E"} 
                  />
                </View>
                <Text style={styles.actionLabel}>
                  {selectedMember?.membership_status === 'active' ? "Suspender" : "Activar"}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={() => setIsActionModalOpen(false)}
            >
              <Text style={styles.cancelText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Plan Selection Bottom Sheet */}
      <Modal
        visible={isPlanModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsPlanModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.dismissOverlay} onPress={() => setIsPlanModalOpen(false)} />
          <View style={styles.planSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Asignar Plan</Text>
            <Text style={styles.sheetSubtitle}>Para: {selectedMember?.full_name}</Text>
            
            <View style={styles.planList}>
              {plans.map((plan) => {
                const isPremium = plan.name.toLowerCase().includes("premium") || plan.name.toLowerCase().includes("unlimited");
                return (
                  <TouchableOpacity
                    key={plan.id}
                    style={[
                      styles.planItem,
                      isPremium && styles.planItemPremium
                    ]}
                    onPress={() => handleAssignPlan(plan.id)}
                  >
                    <View style={styles.planItemInfo}>
                      <View style={[styles.planIcon, isPremium ? styles.planIconPremium : styles.planIconBasic]}>
                        <Ionicons 
                          name={isPremium ? "star" : "fitness"} 
                          size={20} 
                          color={isPremium ? "#FFD700" : "#5F6F86"} 
                        />
                      </View>
                      <View>
                        <Text style={[styles.planItemName, isPremium && styles.planItemNamePremium]}>{plan.name}</Text>
                        <Text style={styles.planItemMeta}>${plan.price} • {plan.duration_days} días</Text>
                      </View>
                    </View>
                    {selectedMember?.plan_name === plan.name && (
                      <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={() => setIsPlanModalOpen(false)}
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Toast Notification */}
      {toast && (
        <View style={styles.toastContainer}>
          <View style={styles.toast}>
            <Text style={styles.toastText}>{toast}</Text>
          </View>
        </View>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4
  },
  readOnlyBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
    marginTop: 8
  },
  readOnlyText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#5F6F86"
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
    marginBottom: 16
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(19, 34, 56, 0.05)",
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 44
  },
  searchIcon: {
    marginRight: 8
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#132238",
    fontWeight: "500"
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 120,
    gap: 16
  },
  memberCard: {
    backgroundColor: "white",
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(19, 34, 56, 0.06)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2
  },
  cardMain: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(19, 34, 56, 0.04)"
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#132238"
  },
  textContainer: {
    flex: 1
  },
  memberName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#132238"
  },
  memberEmail: {
    fontSize: 13,
    color: "#5F6F86",
    marginBottom: 6
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  planTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4
  },
  planText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1E40AF"
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
    backgroundColor: "#DCFCE7"
  },
  statusSuspended: {
    backgroundColor: "#FEE2E2"
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700"
  },
  cardActions: {
    backgroundColor: "#F9FAFB",
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(19, 34, 56, 0.04)"
  },
  quickActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 6
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4A90E2"
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 80,
    gap: 12
  },
  emptyText: {
    color: "#9CA3AF",
    fontSize: 16,
    fontWeight: "500"
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end"
  },
  dismissOverlay: {
    ...StyleSheet.absoluteFillObject
  },
  actionSheet: {
    backgroundColor: "white",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 44 : 32
  },
  planSheet: {
    backgroundColor: "white",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 44 : 32,
    maxHeight: SCREEN_HEIGHT * 0.8
  },
  sheetHandle: {
    width: 36,
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
    marginBottom: 28
  },
  actionGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24
  },
  actionButton: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    gap: 10
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#132238"
  },
  planList: {
    gap: 12,
    marginBottom: 20
  },
  planItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "white",
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#F3F4F6"
  },
  planItemPremium: {
    backgroundColor: "#FAF5FF",
    borderColor: "#E9D5FF"
  },
  planItemInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  planIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  planIconBasic: {
    backgroundColor: "#F3F4F6"
  },
  planIconPremium: {
    backgroundColor: "white"
  },
  planItemName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#132238"
  },
  planItemNamePremium: {
    color: "#7C3AED"
  },
  planItemMeta: {
    fontSize: 13,
    color: "#5F6F86",
    marginTop: 2
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: "center"
  },
  cancelText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#718198"
  },
  toastContainer: {
    position: "absolute",
    bottom: 50,
    left: 20,
    right: 20,
    alignItems: "center",
    zIndex: 9999
  },
  toast: {
    backgroundColor: "#132238",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6
  },
  toastText: {
    color: "white",
    fontSize: 14,
    fontWeight: "700"
  }
});


