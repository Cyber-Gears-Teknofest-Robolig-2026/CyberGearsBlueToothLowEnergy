import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

<<<<<<< HEAD
=======
export const NUS_SERVICE = "8C17A100-2B31-4F52-9A68-7B126A090001"
export const NUS_RX = "8C17A100-2B31-4F52-9A68-7B126A090002"
export const NUS_TX = "8C17A100-2B31-4F52-9A68-7B126A090003"

>>>>>>> b7c79382051522eefe2057b8307c70171e55a967
export type RootStackParamList = {
  Home: undefined;
  BluetoothConnection: undefined;
  Communication: undefined;
  CarControl: undefined;
  Settings: undefined;
};

export type AppNavigationProp = NativeStackNavigationProp<RootStackParamList>;

// ----------------------------------------------------------------------------
<<<<<<< HEAD
// BlueTooth Low Energy (RFCOMM / SPP) — seri haberleşme. UUID/servis gerekmez;
=======
// Bluetooth Low Energy (RFCOMM / SPP) — seri haberleşme. UUID/servis gerekmez;
>>>>>>> b7c79382051522eefe2057b8307c70171e55a967
// satır temelli ('\n') düz metin çerçeveleme kullanılır (bkz. ./BTControlLib).
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// Taşımadan bağımsız Bluetooth yüzeyi (tipler) + durum (store). Taşıma katmanı
// (./BTControlLib) bu tipleri buradan import eder; ekranlar da. constants ise
// BTControlLib'i import ETMEZ (re-export yok). Böylece iki dosya birbirini import
// etmez ve require döngüsü oluşmaz. Ekranlar taşıma fonksiyonlarını (connect,
// startScan, ...) doğrudan "../BTControlLib"ten alır.
// ----------------------------------------------------------------------------
export type ScannedDevice = { id: string; name: string; bonded?: boolean };

export type Subscription = { remove: () => void };

export type BluetoothDevice = {
  id: string;
  address: string; // ekran uyumluluğu için id'nin takma adı
  name: string;
  write: (data: string) => Promise<void>;
  disconnect: () => Promise<void>;
  onDataReceived: (
    listener: (event: { data: string }) => void
  ) => Subscription;
};

export interface Message {
  id: number;
  text: string;
  mode: "sent" | "received";
  time: string;
}

type BluetoothStore = {
  connectedDevice: BluetoothDevice | null;
  setConnectedDevice: (device: BluetoothDevice | null) => void;
  messages: Message[];
  setMessages: (messages: Message[]) => void;
  manuallyDisconnected: boolean;
  setManuallyDisconnected: (manuallyDisconnected: boolean) => void;
};

export const useBluetoothStore = create<BluetoothStore>((set) => ({
  connectedDevice: null,
  setConnectedDevice: (device) => set({ connectedDevice: device }),
  messages: [],
  setMessages: (messages) => set({ messages }),
  manuallyDisconnected: false,
  setManuallyDisconnected: (manuallyDisconnected) =>
    set({ manuallyDisconnected }),
}));

// ----------------------------------------------------------------------------
// Ayarlar (Settings) — AsyncStorage'de kalıcı tutulur, uygulama açılışında çekilir
// ----------------------------------------------------------------------------

export type SendValuesHeaders = {
  motor: {
    right_motor: string;
    left_motor: string;
    all_motors: string;
  };
  robot_arm: {
    robot_arm_0: string;
    robot_arm_1: string;
    robot_arm_2: string;
    robot_arm_3: string;
    robot_arm_4: string;
    robot_arm_5: string;
    all_robot_arms: string;
  };
  zipline: {
    front_zipline: string;
    back_zipline: string;
    all_ziplines: string;
  };
};

export type AllSendsValues = {
  motors: boolean;
  robot_arms: boolean;
  ziplines: boolean;
};

export type ZiplineAngles = {
  front: { open: number; close: number };
  back: { open: number; close: number };
};

export type AppSettings = {
  sendValuesHeaders: SendValuesHeaders;
  allSendsValues: AllSendsValues;
  motorSpeedDefault: number;
  motorSpeedStepDefault: number;
  armsAre360Default: boolean[];
  armValuesDefault: number[];
  armValuesStepDefault: number;
  ziplineAnglesDefault: ZiplineAngles;
};

export const defaultSettings: AppSettings = {
  sendValuesHeaders: {
    motor: {
      right_motor: "MR",
      left_motor: "ML",
      all_motors: "M",
    },
    robot_arm: {
      robot_arm_0: "R0",
      robot_arm_1: "R1",
      robot_arm_2: "R2",
      robot_arm_3: "R3",
      robot_arm_4: "R4",
      robot_arm_5: "R5",
      all_robot_arms: "R",
    },
    zipline: {
      front_zipline: "ZF",
      back_zipline: "ZB",
      all_ziplines: "Z",
    },
  },
  allSendsValues: {
    motors: true,
    robot_arms: false,
    ziplines: true,
  },
  motorSpeedDefault: 255,
  motorSpeedStepDefault: 5,
  armsAre360Default: [true, false, false, false, true, false],
  armValuesDefault: [30, 90, 90, 90, 30, 90],
  armValuesStepDefault: 5,
  ziplineAnglesDefault: {
    front: { open: 90, close: 0 },
    back: { open: 90, close: 180 },
  },
};

type SettingsStore = AppSettings & {
  _hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  setSettings: (settings: Partial<AppSettings>) => void;
  resetSettings: () => void;
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...defaultSettings,
      _hasHydrated: false,
      setHasHydrated: (value) => set({ _hasHydrated: value }),
      setSettings: (settings) => set(settings),
      resetSettings: () => set({ ...defaultSettings }),
    }),
    {
      name: "app-settings",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({
        sendValuesHeaders,
        allSendsValues,
        motorSpeedDefault,
        motorSpeedStepDefault,
        armsAre360Default,
        armValuesDefault,
        armValuesStepDefault,
        ziplineAnglesDefault,
      }) => ({
        sendValuesHeaders,
        allSendsValues,
        motorSpeedDefault,
        motorSpeedStepDefault,
        armsAre360Default,
        armValuesDefault,
        armValuesStepDefault,
        ziplineAnglesDefault,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

// ----------------------------------------------------------------------------
// Bluetooth implementasyonu (Classic / react-native-bluetooth-classic) ayrı
// dosyadadır: ./BTControlLib. constants onu import ETMEZ; ekranlar taşıma
// fonksiyonlarını (connect, startScan, ...) doğrudan oradan alır. Böylece
// constants <-> BTControlLib karşılıklı importu (ve require döngüsü) olmaz. Başka
// bir Bluetooth çeşidine geçerken yalnızca o dosya değişir.
// ----------------------------------------------------------------------------
