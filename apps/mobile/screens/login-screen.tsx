import { useState, useEffect } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";

import { isApiResponseError } from "@gym/api-client";

import { ScreenShell } from "../components/screen-shell";
import { useLoginMutation, useGoogleLoginMutation } from "../hooks/use-workouts";

WebBrowser.maybeCompleteAuthSession();

export function LoginScreen({ navigation }: any) {
  const login = useLoginMutation();
  const googleLogin = useGoogleLoginMutation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<boolean>(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    scopes: ["openid", "email", "profile"]
  });

  useEffect(() => {
    if (
      response?.type === "success" &&
      response.params &&
      typeof response.params.id_token === "string"
    ) {
      setGoogleError(null);

      void googleLogin
        .mutateAsync({ id_token: response.params.id_token })
        .catch((err) => {
          if (isApiResponseError(err)) {
            setGoogleError("Error al iniciar sesión con Google. Verifique su cuenta e intente nuevamente.");
          } else {
            setGoogleError((err as Error)?.message ?? "Error al iniciar sesión con Google.");
          }
        });

      return;
    }

    if (response?.type === "error") {
      setGoogleError("No se pudo autenticar con Google. Intente de nuevo.");
    }
  }, [response, googleLogin]);

  useEffect(() => {
    if (email === "") {
        setEmailError(false);
        return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setEmailError(!emailRegex.test(email));
  }, [email]);

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
          onPress={() => {
            setGoogleError(null);
            if (!request) {
              setGoogleError("Configuración de Google login no disponible");
              return;
            }
            void promptAsync();
          }}
          style={({ pressed }) => [styles.googleButton, pressed && styles.buttonPressed]}
          disabled={googleLogin.isPending || !request}
        >
          <Text style={styles.googleButtonText}>Continuar con Google</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            (navigation as any)?.navigate("Register");
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
