import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View, ScrollView } from "react-native";
import { isApiResponseError } from "@gym/api-client";
import { ScreenShell } from "../components/screen-shell";
import { useRegisterMutation } from "../hooks/use-workouts";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Register">;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

export function RegisterScreen({ navigation }: Props) {
  const register = useRegisterMutation();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  
  const emailError = email.length > 0 && !isValidEmail(email);

  const handleRegister = () => {
    if (emailError || !email || !fullName || !password) return;
    
    register.mutate(
      { email, full_name: fullName, password, phone: phone || null },
      {
        onSuccess: () => {
          Alert.alert("Éxito", "Cuenta creada correctamente.");
          navigation.navigate("Login");
        }
      }
    );
  };

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Sumate al equipo</Text>
          <Text style={styles.title}>Creá tu cuenta</Text>
        </View>

        <View style={styles.formCard}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nombre completo</Text>
            <TextInput
              onChangeText={setFullName}
              placeholder="Juan Pérez"
              placeholderTextColor="#8D99AE"
              style={styles.input}
              value={fullName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Correo electrónico</Text>
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="hoyentreno@gym.ok"
              placeholderTextColor="#8D99AE"
              style={[styles.input, emailError ? styles.inputError : null]}
              value={email}
            />
            {emailError ? <Text style={styles.errorHint}>Email inválido</Text> : null}
            {email && !emailError ? <Text style={styles.successHint}>Email válido</Text> : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Teléfono (opcional)</Text>
            <TextInput
              keyboardType="phone-pad"
              onChangeText={setPhone}
              placeholder="+54 11 ..."
              placeholderTextColor="#8D99AE"
              style={styles.input}
              value={phone}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              onChangeText={setPassword}
              placeholder="Mínimo 8 caracteres"
              placeholderTextColor="#8D99AE"
              secureTextEntry
              style={styles.input}
              value={password}
            />
          </View>

          {register.error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>
                {isApiResponseError(register.error)
                  ? "Error al registrarse. Verifica los datos o si el email ya existe."
                  : register.error.message}
              </Text>
            </View>
          ) : null}

          <Pressable
            onPress={handleRegister}
            style={({ pressed }) => [
              styles.primaryButton,
              (pressed || register.isPending || !!emailError) && styles.buttonDisabled
            ]}
            disabled={register.isPending || !!emailError}
          >
            <Text style={styles.primaryButtonText}>
              {register.isPending ? "Creando cuenta..." : "Crear cuenta"}
            </Text>
          </Pressable>

          <View style={styles.separatorContainer}>
            <View style={styles.separator} />
            <Text style={styles.separatorText}>O</Text>
            <View style={styles.separator} />
          </View>

          <Pressable
            onPress={() => Alert.alert("Próximamente", "Integración con Google en camino.")}
            style={({ pressed }) => [styles.googleButton, pressed && styles.buttonPressed]}
          >
            <Text style={styles.googleButtonText}>Continuar con Google</Text>
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate("Login")}
            style={styles.linkButton}
          >
            <Text style={styles.linkText}>¿Ya tenés cuenta? Inicia sesión</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 40
  },
  header: {
    backgroundColor: "#132238",
    borderRadius: 32,
    padding: 28,
    marginBottom: 20
  },
  eyebrow: {
    color: "#FFB7A4",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.6,
    textTransform: "uppercase"
  },
  title: {
    color: "white",
    fontSize: 32,
    fontWeight: "700",
    marginTop: 8
  },
  formCard: {
    backgroundColor: "rgba(255,255,255,0.86)",
    borderColor: "rgba(19,34,56,0.08)",
    borderRadius: 30,
    borderWidth: 1,
    padding: 24,
    gap: 16
  },
  inputGroup: {
    gap: 6
  },
  label: {
    color: "#132238",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4
  },
  input: {
    backgroundColor: "white",
    borderColor: "rgba(19,34,56,0.08)",
    borderRadius: 20,
    borderWidth: 1,
    color: "#132238",
    paddingHorizontal: 18,
    paddingVertical: 14
  },
  inputError: {
    borderColor: "#FF7A59"
  },
  errorHint: {
    color: "#FF7A59",
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 4
  },
  successHint: {
    color: "#17B89C",
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 4
  },
  errorBox: {
    backgroundColor: "rgba(255,122,89,0.12)",
    borderRadius: 18,
    padding: 14
  },
  errorText: {
    color: "#FF7A59",
    fontSize: 14,
    lineHeight: 21
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#FF7A59",
    borderRadius: 999,
    marginTop: 10,
    paddingVertical: 16
  },
  googleButton: {
    alignItems: "center",
    backgroundColor: "white",
    borderColor: "rgba(19,34,56,0.1)",
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 14
  },
  googleButtonText: {
    color: "#132238",
    fontSize: 15,
    fontWeight: "600"
  },
  buttonPressed: {
    opacity: 0.8
  },
  buttonDisabled: {
    opacity: 0.6
  },
  primaryButtonText: {
    color: "white",
    fontSize: 15,
    fontWeight: "700"
  },
  separatorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10
  },
  separator: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(19,34,56,0.1)"
  },
  separatorText: {
    marginHorizontal: 12,
    color: "#8D99AE",
    fontSize: 12,
    fontWeight: "700"
  },
  linkButton: {
    alignItems: "center",
    marginTop: 10
  },
  linkText: {
    color: "#5F6F86",
    fontSize: 14,
    fontWeight: "600"
  }
});
