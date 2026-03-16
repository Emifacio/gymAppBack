import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { isApiResponseError } from "@gym/api-client";

import { ScreenShell } from "../components/screen-shell";
import { useLoginMutation } from "../hooks/use-workouts";

export function LoginScreen() {
  const login = useLoginMutation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <ScreenShell>
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Gym Platform</Text>
        <Text style={styles.heroTitle}>One backend contract. Two polished clients.</Text>
        <Text style={styles.heroCopy}>
          Sign in with your FastAPI account. Mobile stores the JWT in SecureStore while sharing the same
          generated API client and query hooks as the web app.
        </Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Sign in</Text>
        <Text style={styles.formCopy}>SecureStore persists the token on device and the shared session adapter handles hydration.</Text>

        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="coach@gymplatform.dev"
          placeholderTextColor="#8D99AE"
          style={styles.input}
          value={email}
        />
        <TextInput
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor="#8D99AE"
          secureTextEntry
          style={styles.input}
          value={password}
        />

        {login.error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>
              {isApiResponseError(login.error)
                ? "Login failed. Check the FastAPI credentials or backend availability."
                : login.error.message}
            </Text>
          </View>
        ) : null}

        <Pressable
          onPress={() => {
            login.mutate({ email, password });
          }}
          style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
        >
          <Text style={styles.primaryButtonText}>{login.isPending ? "Signing in..." : "Sign in"}</Text>
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
  buttonPressed: {
    opacity: 0.92
  },
  primaryButtonText: {
    color: "white",
    fontSize: 15,
    fontWeight: "700"
  }
});
