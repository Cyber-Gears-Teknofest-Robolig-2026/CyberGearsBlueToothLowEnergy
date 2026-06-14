import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "./HomeScreen";
import BluetoothConnectionScreen from "./BluetoothConnectionScreen";
import CommunicationScreen from "./CommunicationScreen";
import CarControlScreen from "./CarControlScreen";
import SettingsScreen from "./SettingsScreen";
import {
  RootStackParamList,
  useSettingsStore,
} from "./constants";

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => {

  return (
    <NavigationContainer
      documentTitle={{
        formatter: (_, route) => {
          const titles: Record<string, string> = {
            Home: "Ana Sayfa",
            BluetoothConnection: "Bağlantı Yönetimi",
            Communication: "Cihaz İletişimi",
            CarControl: "Araç Kontrol",
            Settings: "Ayarlar",
          };
          return titles[route?.name ?? ""] ?? "Cyber Gears BlueTooth Low Energy";
        },
      }}
      linking={{
        prefixes: [],
        config: {
          screens: {
            Home: "",
            BluetoothConnection: "BluetoothConnection",
            Communication: "Communication",
            CarControl: "CarControl",
            Settings: "Settings",
          },
        },
      }}
    >
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Home">
          {() => (
            <HomeScreen />
          )}
        </Stack.Screen>
        <Stack.Screen name="BluetoothConnection">
          {() => (
            <BluetoothConnectionScreen />
          )}
        </Stack.Screen>
        <Stack.Screen name="Communication">
          {() => (
            <CommunicationScreen />
          )}
        </Stack.Screen>
        <Stack.Screen name="CarControl">
          {() => (
            <CarControlScreen />
          )}
        </Stack.Screen>
        <Stack.Screen name="Settings">
          {() => (
            <SettingsScreen />
          )}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AppNavigator />
    </SafeAreaProvider>
  );
}
