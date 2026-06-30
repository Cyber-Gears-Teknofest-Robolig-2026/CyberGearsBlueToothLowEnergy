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
// Bluetooth motoru (tarama / bağlanma / izinler / olaylar) artık BACKEND'tedir
// (src/backend/android). Frontend ona yalnızca BluetoothContext'teki
// useBluetooth() üzerinden erişir. Tip sözleşmesi (ScannedDevice, ConnectedDevice,
// Subscription) BluetoothContext'te tanımlıdır; burada sadece yeniden export
// edilir. Aşağıdaki store yalnızca AKTİF bağlantı + mesaj durumunu tutar.
// ----------------------------------------------------------------------------
export type {
  Subscription,
  DeviceKind,
  ScannedDevice,
  ConnectedDevice,
} from "./BluetoothContext";
import type { ConnectedDevice } from "./BluetoothContext";

export interface Message {
  id: number;
  text: string;
  mode: "sent" | "received";
  time: string;
}

type BluetoothStore = {
  connectedDevice: ConnectedDevice | null;
  setConnectedDevice: (device: ConnectedDevice | null) => void;
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

/** Robot kol varsayılan açısı 180° ve 360° modları için ayrı tutulur. */
export type ArmDefaultAngle = { deg180: number; deg360: number };

/** 180° serbest modunda kolun açı sınırı (varsayılan açı ve araç kontrolü bununla kısıtlanır). */
export type ArmAngleLimit = { min: number; max: number };

/** 360° modunda kolun hız sınırı (varsayılan hız ve araç kontrolü bununla kısıtlanır; 0–90). */
export type ArmSpeedLimit = { min: number; max: number };

/** Motor hız sınırı (varsayılan hız ve araç kontrolü bununla kısıtlanır; 0–2^res-1). */
export type MotorSpeedLimit = { min: number; max: number };

/** 360° servo hız slider'ının üst sınırı (mutlak). */
export const ARM_360_SPEED_MAX = 90;

// ----------------------------------------------------------------------------
// PWM çözünürlüğü (bit) -> değer aralığı. ESP32 LEDC gibi kanallarda duty
// çözünürlüğü 8 bit olmak zorunda değil; res bit ise üst sınır 2^res - 1 olur
// (8 bit -> 255, 10 bit -> 1023, 12 bit -> 4095 ...). Alt sınır her zaman 0.
// res, taşma / mantıksız değerlere karşı PWM_RESOLUTION_MIN..MAX ile kıstırılır.
// ----------------------------------------------------------------------------
export const PWM_MIN_VALUE = 0;
export const PWM_RESOLUTION_MIN = 1;
export const PWM_RESOLUTION_MAX = 16;

export const clampPwmResolution = (res: number): number =>
  Math.max(PWM_RESOLUTION_MIN, Math.min(PWM_RESOLUTION_MAX, Math.floor(res || 0)));

export const pwmMaxFromResolution = (res: number): number =>
  2 ** clampPwmResolution(res) - 1;

export type AppSettings = {
  sendValuesHeaders: SendValuesHeaders;
  allSendsValues: AllSendsValues;
  /** Araç hız kontrolü varsayılan modu: false = ortak, true = ayrı ayrı (sağ/sol). */
  motorControlSeparateDefault: boolean;
  /** PWM kanal çözünürlüğü (bit) — her hız kontrolü için ayrı. Üst sınır = 2^res - 1 (8 bit -> 255). */
  motorPwmResolutionDefault: number;
  motorSpeedDefault: number;
  motorSpeedStepDefault: number;
  /** Ortak motor hız min/max sınırı (0–2^res-1). Slider izi ve varsayılan hız bununla kısıtlanır. */
  motorSpeedLimitDefault: MotorSpeedLimit;
  rightMotorPwmResolutionDefault: number;
  rightMotorSpeedDefault: number;
  rightMotorSpeedStepDefault: number;
  rightMotorSpeedLimitDefault: MotorSpeedLimit;
  leftMotorPwmResolutionDefault: number;
  leftMotorSpeedDefault: number;
  leftMotorSpeedStepDefault: number;
  leftMotorSpeedLimitDefault: MotorSpeedLimit;
  armsAre360Default: boolean[];
  /**
   * Her kolun açı yönü ters mi? (kol başına)
   * - 180° servo: ters ise gönderilen açı `180 - açı` olur.
   * - 360° servo: ters ise dönüş işareti tersine çevrilir (sağ negatif, sol pozitif).
   */
  armDirectionReversedDefault: boolean[];
  armValuesDefault: ArmDefaultAngle[];
  /** 180° modunda her kolun açı min/max sınırı (0–180). */
  armAngleLimitsDefault: ArmAngleLimit[];
  /** 360° modunda her kolun hız min/max sınırı (0–90). */
  armSpeedLimitsDefault: ArmSpeedLimit[];
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
  motorControlSeparateDefault: false,
  motorPwmResolutionDefault: 8,
  motorSpeedDefault: 255,
  motorSpeedStepDefault: 5,
  motorSpeedLimitDefault: { min: 0, max: 255 },
  rightMotorPwmResolutionDefault: 8,
  rightMotorSpeedDefault: 255,
  rightMotorSpeedStepDefault: 5,
  rightMotorSpeedLimitDefault: { min: 0, max: 255 },
  leftMotorPwmResolutionDefault: 8,
  leftMotorSpeedDefault: 255,
  leftMotorSpeedStepDefault: 5,
  leftMotorSpeedLimitDefault: { min: 0, max: 255 },
  armsAre360Default: [true, false, false, false, true, false],
  armDirectionReversedDefault: [true, true, false, false, false, false],
  armValuesDefault: [
    { deg180: 90, deg360: 30 },
    { deg180: 90, deg360: 30 },
    { deg180: 90, deg360: 30 },
    { deg180: 90, deg360: 30 },
    { deg180: 90, deg360: 30 },
    { deg180: 90, deg360: 30 },
  ],
  armAngleLimitsDefault: [
    { min: 0, max: 180 },
    { min: 0, max: 180 },
    { min: 0, max: 180 },
    { min: 0, max: 180 },
    { min: 0, max: 180 },
    { min: 0, max: 180 },
  ],
  armSpeedLimitsDefault: [
    { min: 0, max: 90 },
    { min: 0, max: 90 },
    { min: 0, max: 90 },
    { min: 0, max: 90 },
    { min: 0, max: 90 },
    { min: 0, max: 90 },
  ],
  armValuesStepDefault: 5,
  ziplineAnglesDefault: {
    front: { open: 90, close: 0 },
    back: { open: 90, close: 0 },
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
        motorControlSeparateDefault,
        motorPwmResolutionDefault,
        motorSpeedDefault,
        motorSpeedStepDefault,
        motorSpeedLimitDefault,
        rightMotorPwmResolutionDefault,
        rightMotorSpeedDefault,
        rightMotorSpeedStepDefault,
        rightMotorSpeedLimitDefault,
        leftMotorPwmResolutionDefault,
        leftMotorSpeedDefault,
        leftMotorSpeedStepDefault,
        leftMotorSpeedLimitDefault,
        armsAre360Default,
        armDirectionReversedDefault,
        armValuesDefault,
        armAngleLimitsDefault,
        armSpeedLimitsDefault,
        armValuesStepDefault,
        ziplineAnglesDefault,
      }) => ({
        sendValuesHeaders,
        allSendsValues,
        motorControlSeparateDefault,
        motorPwmResolutionDefault,
        motorSpeedDefault,
        motorSpeedStepDefault,
        motorSpeedLimitDefault,
        rightMotorPwmResolutionDefault,
        rightMotorSpeedDefault,
        rightMotorSpeedStepDefault,
        rightMotorSpeedLimitDefault,
        leftMotorPwmResolutionDefault,
        leftMotorSpeedDefault,
        leftMotorSpeedStepDefault,
        leftMotorSpeedLimitDefault,
        armsAre360Default,
        armDirectionReversedDefault,
        armValuesDefault,
        armAngleLimitsDefault,
        armSpeedLimitsDefault,
        armValuesStepDefault,
        ziplineAnglesDefault,
      }),
      version: 2,
      // v0 -> v1: armValuesDefault eskiden number[] idi, artık { deg180, deg360 }[].
      // Eski tekil değer kolun o anki moduna yazılır (360° -> deg360, 180° -> deg180).
      // v1 -> v2: hız min/max sınırları eklendi (360° servo + motor ortak/sağ/sol).
      // Eski kayıtta yoksa varsayılana çekilir; motor max'ı mevcut çözünürlükten türetilir.
      migrate: (persisted: any) => {
        if (
          persisted &&
          Array.isArray(persisted.armValuesDefault) &&
          typeof persisted.armValuesDefault[0] === 'number'
        ) {
          persisted.armValuesDefault = persisted.armValuesDefault.map((n: number, i: number) =>
            persisted.armsAre360Default?.[i]
              ? { deg180: 90, deg360: n }
              : { deg180: n, deg360: 30 },
          );
        }
        if (persisted) {
          if (!Array.isArray(persisted.armSpeedLimitsDefault)) {
            persisted.armSpeedLimitsDefault = defaultSettings.armSpeedLimitsDefault.map((l) => ({ ...l }));
          }
          const motorLimit = (resKey: string) =>
            ({ min: 0, max: pwmMaxFromResolution(Number(persisted[resKey]) || 0) });
          if (!persisted.motorSpeedLimitDefault) persisted.motorSpeedLimitDefault = motorLimit('motorPwmResolutionDefault');
          if (!persisted.rightMotorSpeedLimitDefault) persisted.rightMotorSpeedLimitDefault = motorLimit('rightMotorPwmResolutionDefault');
          if (!persisted.leftMotorSpeedLimitDefault) persisted.leftMotorSpeedLimitDefault = motorLimit('leftMotorPwmResolutionDefault');
        }
        return persisted;
      },
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

// ----------------------------------------------------------------------------
// Bluetooth motorunun gerçek implementasyonu backend'tedir (src/backend/android).
// Frontend onu yalnızca BluetoothContext üzerinden (App.tsx'te enjekte edilerek)
// tanır; doğrudan import etmez.
// ----------------------------------------------------------------------------
