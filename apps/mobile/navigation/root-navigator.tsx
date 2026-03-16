import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, Text, View } from "react-native";

import { useAuth } from "../hooks/use-auth";
import { HomeScreen } from "../screens/home-screen";
import { LoginScreen } from "../screens/login-screen";
import { WorkoutDetailScreen } from "../screens/workout-detail-screen";
import { WorkoutsScreen } from "../screens/workouts-screen";
import type { MainTabParamList, RootStackParamList } from "./types";

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
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
        tabBarIcon: ({ color, size }) => (
          <Ionicons
            color={color}
            name={route.name === "Home" ? "sparkles-outline" : "barbell-outline"}
            size={size}
          />
        )
      })}
    >
      <Tabs.Screen component={HomeScreen} name="Home" />
      <Tabs.Screen component={WorkoutsScreen} name="Workouts" />
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
        <RootStack.Screen component={LoginScreen} name="Login" options={{ headerShown: false }} />
      )}
    </RootStack.Navigator>
  );
}
