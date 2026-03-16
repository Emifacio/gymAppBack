import { LinearGradient } from "expo-linear-gradient";
import type { PropsWithChildren } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function ScreenShell({ children }: PropsWithChildren) {
  return (
    <LinearGradient colors={["#FFF8F0", "#F5F7FB", "#EDF7F2"]} style={styles.gradient}>
      <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>{children}</View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1
  },
  safeArea: {
    flex: 1
  },
  content: {
    padding: 16
  },
  card: {
    gap: 16
  }
});
