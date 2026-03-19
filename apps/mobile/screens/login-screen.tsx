import { useState, useEffect, useCallback } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import type { AuthSessionResult, AuthSessionRedirectUriOptions } from "expo-auth-session";

import { isApiResponseError } from "@gym/api-client";

import { ScreenShell } from "../components/screen-shell";
import { useLoginMutation, useGoogleLoginMutation } from "../hooks/use-workouts";
import type { RootStackParamList } from "../navigation/types";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  getGoogleClientId,
  getGoogleAndroidClientId,
  getGoogleIosClientId
} from "../app/env";

WebBrowser.maybeCompleteAuthSession();

type LoginScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, "Login">;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

interface GoogleAuthConfig {
  clientId: string;
  androidClientId?: string;
  iosClientId?: string;
  scopes: string[];
}

function buildGoogleAuthConfig(): GoogleAuthConfig {
  const clientId = getGoogleClientId();
  const androidClientId = getGoogleAndroidClientId();
  const iosClientId = getGoogleIosClientId();
  const config: GoogleAuthConfig = {
    clientId,
    scopes: ["openid", "email", "profile"]
  };
  if (androidClientId !== undefined) {
    config.androidClientId = androidClientId;
  }
  if (iosClientId !== undefined) {
    config.iosClientId = iosClientId;
  }
  return config;
}

function buildRedirectUriOptions(): Partial<AuthSessionRedirectUriOptions> {
  return {};
}

export function LoginScreen({ navigation }: { navigation: LoginScreenNavigationProp }) {
  const login = useLoginMutation();
  const googleLogin = useGoogleLoginMutation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [googleError, setGoogleError] = useState<string | null>(null);

  const googleAuthConfig = buildGoogleAuthConfig();
  const googleRedirectOptions = buildRedirectUriOptions();
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest(googleAuthConfig, googleRedirectOptions);

  const processGoogleResponse = useCallback((authResponse: AuthSessionResult | null) => {
    if (!authResponse) return;

    if (authResponse.type === "success" && authResponse.params && typeof authResponse.params.id_token === "string") {
      setGoogleError(null);
      googleLogin.mutateAsync({ id_token: authResponse.params.id_token }).catch((err: unknown) => {
        if (isApiResponseError(err)) {
          setGoogleError("Error al iniciar sesión con Google. Verifique su cuenta e intente nuevamente.");
        } else {
          const error = err as Error;
          setGoogleError(error?.message ?? "Error al iniciar sesión con Google.");
        }
      });
    } else if (authResponse.type === "error") {
      setGoogleError("No se pudo autenticar con Google. Intente de nuevo.");
    }
  }, [googleLogin]);

  useEffect(() => {
    if (response) {
      queueMicrotask(() => processGoogleResponse(response));
    }
  }, [response, processGoogleResponse]);

  const emailError = email.length > 0 && !isValidEmail(email);

  const handlePromptGoogle = () => {
    setGoogleError(null);
    if (!request) {
      setGoogleError("Configuración de Google login no disponible");
      return;
    }
    void promptAsync();
  };

  return (
    <ScreenShell>
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Tu Gimnasio</Text>
        <Text style={styles.heroTitle}>Gestioná tu entrenamiento de forma inteligente</Text>
        <Text style={styles.heroCopy}>
          Reservá clases, administrá tus créditos y seguí tu progreso en un solo lugar.
        </Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Bienvenido</Text>

        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="hoyentreno@gym.ok"
          placeholderTextColor="#8D99AE"
          style={[styles.input, emailError ? styles.inputError : null]}
          value={email}
        />
        {emailError ? <Text style={styles.errorHint}>Formato de email incorrecto</Text> : null}
        <TextInput
          onChangeText={setPassword}
          placeholder="Contraseña"
          placeholderTextColor="#8D99AE"
          secureTextEntry
          style={styles.input}
          value={password}
        />

        {login.error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>
              {isApiResponseError(login.error)
                ? "Error al iniciar sesión. Por favor, verifica tus credenciales."
                : login.error.message}
            </Text>
          </View>
        ) : null}
        {googleError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{googleError}</Text>
          </View>
        ) : null}

        <Pressable
          onPress={() => {
            login.mutate({ email, password });
          }}
          style={({ pressed }) => [styles.primaryButton, (pressed || login.isPending || emailError) && styles.buttonDisabled]}
          disabled={login.isPending || emailError}
        >
          <Text style={styles.primaryButtonText}>{login.isPending ? "Iniciando sesión..." : "Iniciar sesión"}</Text>
        </Pressable>

        <View style={styles.separatorContainer}>
          <View style={styles.separator} />
          <Text style={styles.separatorText}>O</Text>
          <View style={styles.separator} />
        </View>

        <Pressable
          onPress={handlePromptGoogle}
          style={({ pressed }) => [styles.googleButton, pressed && styles.buttonPressed]}
          disabled={googleLogin.isPending || !request}
        >
          <Text style={styles.googleButtonText}>Continuar con Google</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            navigation.navigate("Register");
          }}
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
        >
          <Text style={styles.secondaryButtonText}>¿No tienes cuenta? Creá una</Text>
        </Pressable>
      </View>

    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: "#132238",
    borderRadius: 32,
    gap: 16,
    padding: 28
  },
  eyebrow: {
    color: "#FFB7A4",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.6,
    textTransform: "uppercase"
  },
  heroTitle: {
    color: "white",
    fontSize: 36,
    fontWeight: "700",
    lineHeight: 42
  },
  heroCopy: {
    color: "rgba(255,255,255,0.74)",
    fontSize: 15,
    lineHeight: 24
  },
  formCard: {
    backgroundColor: "rgba(255,255,255,0.86)",
    borderColor: "rgba(19,34,56,0.08)",
    borderRadius: 30,
    borderWidth: 1,
    gap: 14,
    padding: 24
  },
  formTitle: {
    color: "#132238",
    fontSize: 32,
    fontWeight: "700"
  },
  formCopy: {
    color: "#5F6F86",
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 8
  },
  input: {
    backgroundColor: "white",
    borderColor: "rgba(19,34,56,0.08)",
    borderRadius: 20,
    borderWidth: 1,
    color: "#132238",
    paddingHorizontal: 18,
    paddingVertical: 16
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
    marginTop: 8,
    paddingVertical: 16
  },
  secondaryButton: {
    alignItems: "center",
    marginTop: 12,
    paddingVertical: 8
  },
  secondaryButtonText: {
    color: "#5F6F86",
    fontSize: 14,
    fontWeight: "600"
  },
  buttonPressed: {
    opacity: 0.92
  },
  primaryButtonText: {
    color: "white",
    fontSize: 15,
    fontWeight: "700"
  },
  inputError: {
    borderColor: "#FF7A59"
  },
  errorHint: {
    color: "#FF7A59",
    fontSize: 11,
    fontWeight: "600",
    marginTop: -8,
    marginLeft: 4
  },
  buttonDisabled: {
    opacity: 0.6
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
  }
});
