import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type RootStackParamList = {
  Home: undefined;
  BluetoothConnection: undefined;
  Communication: undefined;
  CarControl: undefined;
  Settings: undefined;
};

export type AppNavigationProp = NativeStackNavigationProp<RootStackParamList>;

// ----------------------------------------------------------------------------
// BlueTooth Low Energy (RFCOMM / SPP) — web'de Web Serial API üzerinden. UUID/servis
// gerekmez; satır temelli ('\n') düz metin çerçeveleme kullanılır (bkz.
// ./BTControlLib).
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// Taşımadan bağımsız Bluetooth yüzeyi (tipler) + durum (store). Taşıma katmanı
// (./BTControlLib) bu tipleri/store'u buradan import eder; ekranlar da. constants
// ise BTControlLib'i import ETMEZ (re-export yok). Böylece iki dosya birbirini
// import etmez ve require döngüsü oluşmaz. Ekranlar taşıma fonksiyonlarını
// (connect, isSupported, ...) doğrudan "../BTControlLib"ten alır.
// ----------------------------------------------------------------------------
export type Subscription = { remove: () => void };

export type BluetoothDevice = {
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
// Bluetooth implementasyonu (Classic / Web Serial) ayrı dosyadadır: ./BTControlLib.
// constants onu import ETMEZ; ekranlar connect/isSupported'ı doğrudan oradan alır.
// Böylece constants <-> BTControlLib karşılıklı importu (ve require döngüsü) olmaz.
// ----------------------------------------------------------------------------
