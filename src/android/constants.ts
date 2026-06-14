import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { BleManager, Device } from "react-native-ble-plx";
import { Buffer } from "buffer";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ----------------------------------------------------------------------------
// Nordic UART Service (NUS) — BLE üzerinden seri haberleşme (UART köprüsü).
// RX: client -> cihaz (write), TX: cihaz -> client (notify).
// ----------------------------------------------------------------------------
export const NUS_SERVICE = "8c17a100-2b31-4f52-9a68-7b126a090001";
export const NUS_RX = "8c17a100-2b31-4f52-9a68-7b126a090002"; // write (client -> device)
export const NUS_TX = "8c17a100-2b31-4f52-9a68-7b126a090003"; // notify (device -> client)

// Tüm uygulamada tek bir BleManager örneği paylaşılır. Bu dosya yalnızca
// android App'i ile (src/App.tsx platforma göre tembel require ettiğinden)
// native'de değerlendirilir; web'de hiç çalışmaz.
export const bleManager = new BleManager();

export type RootStackParamList = {
  Home: undefined;
  BluetoothConnection: undefined;
  Communication: undefined;
  CarControl: undefined;
  Settings: undefined;
};

export type AppNavigationProp = NativeStackNavigationProp<RootStackParamList>;

// BLE cihazı, diğer ekranların (Communication, CarControl) bildiği yüzeye
// (name/write/disconnect/onDataReceived) sarılır. Böylece taşıma katmanı
// (Classic yerine Low Energy) değişse de ekran kodları aynı kalır.
// Veri akışı base64'tür: write düz metni base64'e çevirip RX'e yazar,
// onDataReceived ise TX bildirimlerinin base64 değerini olduğu gibi iletir.
export type BluetoothDevice = {
  id: string;
  address: string; // ekran uyumluluğu için id'nin takma adı
  name: string;
  write: (data: string) => Promise<void>;
  disconnect: () => Promise<void>;
  onDataReceived: (
    listener: (event: { data: string }) => void
  ) => { remove: () => void };
};

// Bağlı bir ble-plx Device'ını ortak BluetoothDevice yüzeyine sarar.
const wrapNusDevice = (device: Device): BluetoothDevice => ({
  id: device.id,
  address: device.id,
  name: device.name ?? device.localName ?? "Bilinmeyen Cihaz",
  write: async (data: string) => {
    const base64 = Buffer.from(data, "utf-8").toString("base64");
    await device.writeCharacteristicWithResponseForService(
      NUS_SERVICE,
      NUS_RX,
      base64
    );
  },
  onDataReceived: (listener) => {
    const subscription = device.monitorCharacteristicForService(
      NUS_SERVICE,
      NUS_TX,
      (error, characteristic) => {
        if (error || !characteristic?.value) return;
        // characteristic.value zaten base64'tür.
        listener({ data: characteristic.value });
      }
    );
    return { remove: () => subscription.remove() };
  },
  disconnect: async () => {
    await bleManager.cancelDeviceConnection(device.id);
  },
});

// Verilen cihaz id'sine bağlanır, NUS servis/karakteristiklerini keşfeder ve
// ortak yüzeye sarılmış cihazı döndürür.
export const connectToNusDevice = async (
  deviceId: string
): Promise<BluetoothDevice> => {
  const device = await bleManager.connectToDevice(deviceId, {
    requestMTU: 247,
  });
  await device.discoverAllServicesAndCharacteristics();
  return wrapNusDevice(device);
};

interface Message {
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
  setMessages: (messages: Message[]) => set({ messages }),
  manuallyDisconnected: false,
  setManuallyDisconnected: (manuallyDisconnected: boolean) => set({ manuallyDisconnected }),
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
    motors: false,
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
