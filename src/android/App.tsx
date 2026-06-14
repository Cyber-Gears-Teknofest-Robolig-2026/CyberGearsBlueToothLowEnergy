import React, { useEffect, useState } from "react";
import { Alert } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { KeyboardProvider } from "react-native-keyboard-controller";
import {
  NavigationContainer,
  useNavigation,
  DarkTheme,
  DefaultTheme,
} from "@react-navigation/native";
import {
  createNativeStackNavigator,
  NativeStackNavigationProp,
} from "@react-navigation/native-stack";
import { create } from "zustand";
import HomeScreen from "./HomeScreen";
import BluetoothConnectionScreen from "./BluetoothConnectionScreen";
import CommunicationScreen from "./CommunicationScreen";
import CarControlScreen from "./CarControlScreen";
import SettingsScreen from "./SettingsScreen";
import {
  RootStackParamList,
  AppNavigationProp,
  useBluetoothStore,
  useSettingsStore,
} from "./constants";
import { onAdapterPoweredOff, onDeviceDisconnected } from "./BTControlLib";

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => {


  const connectedDevice = useBluetoothStore((state) => state.connectedDevice);
  const setConnectedDevice = useBluetoothStore((state) => state.setConnectedDevice);
  const manuallyDisconnected = useBluetoothStore((state) => state.manuallyDisconnected);
  const setManuallyDisconnected = useBluetoothStore((state) => state.setManuallyDisconnected);

  // Ayarlar AsyncStorage'den çekilene kadar (hydration) bekle ki tüm ekranlar
  // kayıtlı değerlerle başlasın.
  const settingsHydrated = useSettingsStore((state) => state._hasHydrated);

  useEffect(() => {
    // Bluetooth kapatılırsa: kullanıcıyı uyar ve bağlantıyı temizle.
    const stateSubscription = onAdapterPoweredOff(() => {
      Alert.alert(
        "Hata",
        "Bluetooth kapalı!"
      );
      const { connectedDevice: device } = useBluetoothStore.getState();
      device?.disconnect().catch(() => { });
      setManuallyDisconnected(false);
      setConnectedDevice(null);
    });
    return () => {
      stateSubscription.remove();
    };
  }, []);

  useEffect(() => {
    // Bağlı cihaz menzilden çıkar / gücü kesilirse bağlantı koptu olarak işle.
    if (!connectedDevice) return;
    const disconnectSubscription = onDeviceDisconnected(
      connectedDevice.id,
      () => {
        const { manuallyDisconnected } = useBluetoothStore.getState();
        setConnectedDevice(null);
        if (!manuallyDisconnected) {
          Alert.alert(
            "Bağlantı Koptu ⚠️",
            "Cihazın gücü kesildi veya menzilden çıkıldı."
          );
        }
        setManuallyDisconnected(false);
      }
    );
    return () => disconnectSubscription.remove();
  }, [connectedDevice]);

  if (!settingsHydrated) {
    return null;
  }

  return (
    <NavigationContainer>
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
    <KeyboardProvider>
      <SafeAreaProvider>
        <AppNavigator />
      </SafeAreaProvider>
    </KeyboardProvider>
  );
}