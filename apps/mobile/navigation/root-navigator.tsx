import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, Text, View } from "react-native";

import { useAuth } from "../hooks/use-auth";
import { HomeScreen } from "../screens/home-screen";
import { LoginScreen } from "../screens/login-screen";
import { WorkoutDetailScreen } from "../screens/workout-detail-screen";
import { WorkoutsScreen } from "../screens/workouts-screen";
import { MembersScreen } from "../screens/members-screen";
import { PaywallScreen } from "../screens/PaywallScreen";
import { SettingsScreen } from "../screens/settings-screen";
import { RegisterScreen } from "../screens/register-screen";
import type { MainTabParamList, RootStackParamList } from "./types";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  const { session } = useAuth();
  const canManage = session?.member.role && session.member.role !== "member";

  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#132238",
        tabBarInactiveTintColor: "#718198",
        tabBarStyle: {
          backgroundColor: "rgba(255,255,255,0.95)",
          borderTopColor: "rgba(19,34,56,0.08)",
          height: 72,
          paddingBottom: 12,
          paddingTop: 10
        },
        tabBarIcon: ({ color, size }) => {
          let iconName: IoniconName = "sparkles-outline";
          if (route.name === "Dashboard") iconName = "sparkles-outline";
          else if (route.name === "Classes") iconName = "barbell-outline";
          else if (route.name === "Members") iconName = "people-outline";
          else if (route.name === "Settings") iconName = "settings-outline";

          return <Ionicons color={color} name={iconName} size={size} />;
        },
        tabBarLabel: ({ children }) => {
          const label =
            children === "Dashboard"
              ? "Inicio"
              : children === "Classes"
                ? "Clases"
                : children === "Members"
                  ? "Miembros"
                  : children === "Settings"
                    ? "Ajustes"
                    : children;
          return <Text style={{ fontSize: 10, fontWeight: "700", color: "#718198" }}>{label}</Text>;
        }
      })}
    >
      <Tabs.Screen component={HomeScreen} name="Dashboard" />
      <Tabs.Screen component={WorkoutsScreen} name="Classes" />
      {canManage ? <Tabs.Screen component={MembersScreen} name="Members" /> : null}
      <Tabs.Screen component={SettingsScreen} name="Settings" />
    </Tabs.Navigator>
  );
}

function LoadingState() {
  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: "#F7F3ED",
        flex: 1,
        gap: 12,
        justifyContent: "center"
      }}
    >
      <ActivityIndicator color="#FF7A59" size="large" />
      <Text style={{ color: "#5F6F86", fontSize: 14 }}>Syncing session...</Text>
    </View>
  );
}

export function RootNavigator() {
  const { isHydrated, session } = useAuth();

  if (!isHydrated) {
    return <LoadingState />;
  }

  return (
    <RootStack.Navigator>
      {session ? (
        <>
          <RootStack.Screen component={MainTabs} name="MainTabs" options={{ headerShown: false }} />
          <RootStack.Screen
            component={PaywallScreen}
            name="Paywall"
            options={{
              headerShadowVisible: false,
              title: "Premium"
            }}
          />
          <RootStack.Screen
            component={WorkoutDetailScreen}
            name="WorkoutDetail"
            options={{
              headerLargeTitle: true,
              headerShadowVisible: false,
              title: "Workout detail"
            }}
          />
        </>
      ) : (
        <>
          <RootStack.Screen component={LoginScreen} name="Login" options={{ headerShown: false }} />
          <RootStack.Screen
            component={RegisterScreen}
            name="Register"
            options={{ headerShown: false }}
          />
        </>
      )}
    </RootStack.Navigator>
  );
}
