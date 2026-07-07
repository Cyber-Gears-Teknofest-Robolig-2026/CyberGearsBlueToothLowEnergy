import React from "react";
import { Platform } from "react-native";
import type { BluetoothApi } from "./backend";

/**
 * ENTEGRASYON KATMANI (frontend'in DIŞI)
 * --------------------------------------------------------------------------
 * Hem backend hem de aktif platformun frontend ağacı burada YALNIZCA çalışılan
 * platform için (koşullu require ile) yüklenir. Statik import kullansaydık web
 * build'i android ağacını da DEĞERLENDİRİRDİ; bu da:
 *   - android stillerini web'de StyleSheet.create ile çalıştırıp react-native-web'in
 *     "shadow* style props are deprecated" uyarısını tetikler,
 *   - react-native-bluetooth-classic native modülünü web'de yüklemeye çalışırdı.
 * Koşullu require ile karşı platformun modülü bundle'a girse bile ASLA çalışmaz.
 *
 * Backend defansif yüklenir: yüklenemezse (native modül yok / Expo Go / dosya
 * silinmiş) `null` döner; BluetoothProvider güvenli no-op'a düşer ve ARAYÜZ YİNE
 * AÇILIR.
 */
function loadBackend(): BluetoothApi | null {
  try {
    switch (Platform.OS) {
      case "web":
        return require("./backend/web").default as BluetoothApi;
      case "android":
        return require("./backend/android").default as BluetoothApi;
      case "ios":
        return require("./backend/ios").default as BluetoothApi;
      default:
        return null;
    }
  } catch {
    return null;
  }
}

type Frontend = {
  App: React.ComponentType<any>;
  BluetoothProvider: React.ComponentType<any>;
};

function loadFrontend(): Frontend {
  switch (Platform.OS) {
    case "web":
      return {
        App: require("./frontend/web/App").default,
        BluetoothProvider: require("./frontend/web/BluetoothContext")
          .BluetoothProvider,
      };
    case "android":
      return {
        App: require("./frontend/android/App").default,
        BluetoothProvider: require("./frontend/android/BluetoothContext")
          .BluetoothProvider,
      };
    case "ios":
      return {
        App: require("./frontend/ios/App").default,
        BluetoothProvider: require("./frontend/ios/BluetoothContext")
          .BluetoothProvider,
      };
    default:
      return {
        App: require("./frontend/android/App").default,
        BluetoothProvider: require("./frontend/android/BluetoothContext")
          .BluetoothProvider,
      };
  }
}

const backend = loadBackend();
const { App: PlatformApp, BluetoothProvider: PlatformBluetoothProvider } =
  loadFrontend();

export default function App() {
  return (
    <PlatformBluetoothProvider backend={backend as any}>
      <PlatformApp />
    </PlatformBluetoothProvider>
  );
}
