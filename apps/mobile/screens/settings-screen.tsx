import { useEffect, useState, useCallback } from "react";
import { StyleSheet, Text, View, Pressable, Alert, Linking } from "react-native";

import { ScreenShell } from "../components/screen-shell";
import { useAuth } from "../hooks/use-auth";
import { useStravaAuthorize, useStravaCallback } from "../hooks/use-workouts";
import { Ionicons } from "@expo/vector-icons";

export function SettingsScreen() {
  const { logout, session } = useAuth();
  const stravaAuthorize = useStravaAuthorize();
  const stravaCallback = useStravaCallback();
  const [isConnecting, setIsConnecting] = useState(false);

  const completeConnection = useCallback((code: string) => {
    setIsConnecting(true);
    stravaCallback.mutate({ code }, {
      onSuccess: () => {
        setIsConnecting(false);
        Alert.alert("Éxito", "Tu cuenta de Strava ha sido conectada correctamente.");
      },
      onError: (error) => {
        setIsConnecting(false);
        Alert.alert("Error", error.message || "No se pudo conectar con Strava.");
      }
    });
  }, [stravaCallback]);

  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      const url = event.url;
      const codeMatch = url.match(/[?&]code=([^&#]*)/);
      if (codeMatch && codeMatch[1]) {
        completeConnection(codeMatch[1]);
      }
    };

    const subscription = Linking.addEventListener("url", handleDeepLink);

    void Linking.getInitialURL().then((url) => {
      if (url) {
        const codeMatch = url.match(/[?&]code=([^&#]*)/);
        if (codeMatch && codeMatch[1]) {
          completeConnection(codeMatch[1]);
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [completeConnection]);

  const handleStravaConnect = async () => {
    if (stravaAuthorize.data?.url) {
      await Linking.openURL(stravaAuthorize.data.url);
    } else {
      Alert.alert("Error", "No se pudo obtener la URL de conexión de Strava.");
    }
  };

  return (
    <ScreenShell>
      <View style={styles.headerCard}>
        <Text style={styles.eyebrow}>Configuración</Text>
        <Text style={styles.title}>Ajustes</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cuenta</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.iconContainer}>
              <Ionicons name="person-outline" size={20} color="#132238" />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.label}>{session?.member.full_name}</Text>
              <Text style={styles.subLabel}>{session?.member.email}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <View style={[styles.iconContainer, { backgroundColor: '#F3E8FF' }]}>
              <Ionicons name="shield-outline" size={20} color="#7C3AED" />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.label}>Rol</Text>
              <Text style={styles.subLabel}>{session?.member.role?.toUpperCase()}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Integraciones</Text>
        <View style={styles.card}>
          <Pressable
            onPress={handleStravaConnect}
            disabled={stravaAuthorize.isLoading || isConnecting}
            style={({ pressed }) => [styles.row, pressed && styles.buttonPressed]}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#FFF0E6' }]}>
              <Ionicons name="flash-outline" size={20} color="#FC4C02" />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.label}>Strava</Text>
              <Text style={styles.subLabel}>
                {isConnecting ? "Conectando..." : "Sincroniza tus estadísticas de running"}
              </Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={20} color="#5F6F86" />
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <Pressable
          onPress={() => void logout()}
          style={({ pressed }) => [styles.logoutButton, pressed && styles.buttonPressed]}
        >
          <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </Pressable>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  headerCard: {
    padding: 24,
    gap: 4
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
    fontWeight: "800"
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 20
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#5F6F86",
    textTransform: "uppercase",
    marginBottom: 8,
    marginLeft: 4
  },
  card: {
    backgroundColor: "white",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(19,34,56,0.06)"
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(19,34,56,0.06)",
    marginLeft: 56
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center"
  },
  textContainer: {
    flex: 1
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#132238"
  },
  subLabel: {
    fontSize: 13,
    color: "#5F6F86",
    marginTop: 1
  },
  logoutButton: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 59, 48, 0.1)"
  },
  logoutText: {
    color: "#FF3B30",
    fontSize: 16,
    fontWeight: "700"
  },
  buttonPressed: {
    opacity: 0.8
  }
});
