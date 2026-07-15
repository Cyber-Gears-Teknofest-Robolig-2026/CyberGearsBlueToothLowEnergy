import React, { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "./HomeScreen";
import BluetoothConnectionScreen from "./BluetoothConnectionScreen";
import CommunicationScreen from "./CommunicationScreen";
import CarControlScreen from "./CarControlScreen";
import SettingsScreen from "./SettingsScreen";
import {
  RootStackParamList,
  useBluetoothStore,
} from "./constants";
import { useBluetooth } from "./BluetoothContext";
import { useEffectiveTheme } from "./theme";

// Shim for react-native-web deprecation: move any props.pointerEvents -> style.pointerEvents
// This runs only in web (window defined) and ensures third-party or forwarded props
// that still use the old prop form are normalized to style form before element creation.
if (typeof window !== "undefined") {
  try {
    const R = require("react");
    const origCreate = R.createElement;
    if (origCreate && !(R as any).__pointerEventsPatched) {
      (R as any).createElement = function (type: any, props: any, ...children: any[]) {
        if (props && props.pointerEvents !== undefined) {
          const { pointerEvents, style, ...rest } = props;
          const newStyle = Array.isArray(style) ? [...style, { pointerEvents }] : { ...(style || {}), pointerEvents };
          return origCreate.apply(this, [type, { ...rest, style: newStyle }, ...children]);
        }
        return origCreate.apply(this, [type, props, ...children]);
      };
      (R as any).__pointerEventsPatched = true;
    }
  } catch (e) {
    // ignore if patching fails
  }
}

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  const effectiveTheme = useEffectiveTheme();
  const bluetooth = useBluetooth();
  const connectedDevice = useBluetoothStore((state) => state.connectedDevice);
  const setConnectedDevice = useBluetoothStore((state) => state.setConnectedDevice);
  const setManuallyDisconnected = useBluetoothStore((state) => state.setManuallyDisconnected);

  useEffect(() => {
    // COM port koparsa (cihaz çıkarıldı / güç kesildi / akış koptu) backend
    // onDeviceDisconnected'i tetikler. Bağlantıyı temizle ve kullanıcıyı uyar.
    // Manuel kesmede backend bu olayı tetiklemez; yine de bayrağı kontrol ederiz.
    if (!connectedDevice) return;
    const subscription = bluetooth.onDeviceDisconnected(() => {
      const { manuallyDisconnected } = useBluetoothStore.getState();
      setConnectedDevice(null);
      if (!manuallyDisconnected) {
        window.alert(
          "Bağlantı koptu: COM port kapandı (cihaz çıkarıldı, gücü kesildi veya menzilden çıktı)."
        );
      }
      setManuallyDisconnected(false);
    });
    return () => subscription.remove();
  }, [connectedDevice, bluetooth]);

  return (
    <NavigationContainer
      theme={effectiveTheme === "dark" ? DarkTheme : DefaultTheme}
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
