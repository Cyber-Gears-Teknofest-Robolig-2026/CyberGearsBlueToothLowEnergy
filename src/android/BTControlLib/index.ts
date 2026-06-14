// ============================================================================
// BTControlLib (android) — Bluetooth Low Energy
// react-native-ble-plx taşıma katmanı
// ============================================================================

import {
  PermissionsAndroid,
  Platform,
} from "react-native";

import {
  BleManager,
  Device as BleDevice,
  State,
  Subscription as BlePlxSubscription,
} from "react-native-ble-plx";

import { Buffer } from "buffer";

import {
  BluetoothDevice,
  ScannedDevice,
  Subscription,
} from "../constants";

// ============================================================================
// BLE UUID değerleri
// ============================================================================

const SERVICE_UUID = "8C17A100-2B31-4F52-9A68-7B126A090001";
const RX_UUID = "8C17A100-2B31-4F52-9A68-7B126A090002";
const TX_UUID = "8C17A100-2B31-4F52-9A68-7B126A090003";

// Tek bir BleManager örneği kullanılmalıdır.
const bleManager = new BleManager();

// Aktif taramanın açık olup olmadığını tutar.
let scanning = false;

// ============================================================================
// Android izinleri
// ============================================================================

export const requestPermissions = async (): Promise<boolean> => {
  if (Platform.OS !== "android") {
    return true;
  }

  try {
    // Android 12 ve üzeri
    if (Platform.Version >= 31) {
      const result = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ]);

      return (
        result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] ===
        PermissionsAndroid.RESULTS.GRANTED &&
        result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] ===
        PermissionsAndroid.RESULTS.GRANTED
      );
    }

    // Android 11 ve altı: BLE taraması için konum izni gerekir.
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
    );

    return result === PermissionsAndroid.RESULTS.GRANTED;
  } catch (error) {
    console.error("BLE izin hatası:", error);
    return false;
  }
};

// ============================================================================
// Bluetooth açık mı?
// ============================================================================

const getCurrentState = (): Promise<State> =>
  new Promise((resolve) => {
    let subscription: BlePlxSubscription | null = null;

    subscription = bleManager.onStateChange((state) => {
      subscription?.remove();
      resolve(state);
    }, true);
  });

export const ensureEnabled = async (): Promise<boolean> => {
  try {
    const state = await getCurrentState();

    if (state === State.PoweredOn) {
      return true;
    }

    // Android'de Bluetooth açma penceresini gösterir.
    if (Platform.OS === "android") {
      await bleManager.enable();

      const newState = await getCurrentState();
      return newState === State.PoweredOn;
    }

    return false;
  } catch (error) {
    console.error("Bluetooth açılamadı:", error);
    return false;
  }
};

// ============================================================================
// BLE taraması
// ============================================================================

export const startScan = (
  onFound: (device: ScannedDevice) => void,
  onError: (error: unknown) => void
): void => {
  if (scanning) {
    bleManager.stopDeviceScan();
  }

  scanning = true;

  // Yalnızca kendi servis UUID'mizi yayınlayan cihazları tarar.
  bleManager.startDeviceScan(
    [SERVICE_UUID],
    {
      allowDuplicates: false,
    },
    (error, device) => {
      if (error) {
        scanning = false;
        bleManager.stopDeviceScan();
        onError(error);
        return;
      }

      if (!device) {
        return;
      }

      onFound({
        id: device.id,
        name:
          device.name ??
          device.localName ??
          `BLE Cihazı (${device.id})`,

        // BLE'de Classic Bluetooth'taki bonded/paired listesi yoktur.
        bonded: false,
      });
    }
  );
};

export const stopScan = (): void => {
  try {
    scanning = false;
    bleManager.stopDeviceScan();
  } catch (error) {
    console.warn("BLE taraması durdurulamadı:", error);
  }
};

// ============================================================================
// BLE bağlantısı
// ============================================================================

export const connect = async (
  deviceId: string
): Promise<BluetoothDevice> => {
  // Bağlantı kurulurken taramayı durdur.
  stopScan();

  let device = await bleManager.connectToDevice(deviceId, {
    autoConnect: false,
  });

  // Servisler ve karakteristikler keşfedilmeden
  // read/write/notify işlemleri yapılamaz.
  device = await device.discoverAllServicesAndCharacteristics();

  // Android'de daha geniş MTU istemeyi deneyebiliriz.
  // Başarısız olması bağlantıyı bozmasın.
  try {
    device = await device.requestMTU(247);
  } catch (error) {
    console.warn("MTU değiştirilemedi, varsayılan MTU kullanılacak.");
  }

  return wrapDevice(device);
};

// ============================================================================
// Bluetooth adaptörü kapatılma dinleyicisi
// ============================================================================

export const onAdapterPoweredOff = (
  listener: () => void
): Subscription => {
  let previouslyPoweredOn = false;

  const subscription = bleManager.onStateChange((state) => {
    if (state === State.PoweredOn) {
      previouslyPoweredOn = true;
      return;
    }

    if (
      previouslyPoweredOn &&
      (state === State.PoweredOff ||
        state === State.Unauthorized ||
        state === State.Unsupported)
    ) {
      listener();
    }
  }, true);

  return {
    remove: () => subscription.remove(),
  };
};

// ============================================================================
// Cihaz bağlantısı koptu dinleyicisi
// ============================================================================

export const onDeviceDisconnected = (
  deviceId: string,
  listener: () => void
): Subscription => {
  const subscription = bleManager.onDeviceDisconnected(
    deviceId,
    () => {
      listener();
    }
  );

  return {
    remove: () => subscription.remove(),
  };
};

// ============================================================================
// BLE cihazını ortak BluetoothDevice arayüzüne sarar
// ============================================================================

const wrapDevice = (device: BleDevice): BluetoothDevice => {
  const listeners = new Set<(event: { data: string }) => void>();

  let notificationSubscription: BlePlxSubscription | null = null;

  // BLE bildirimleri parça parça gelebilir.
  // Tam satır oluşana kadar burada biriktirilir.
  let receiveBuffer = "";

  const startNotifications = (): void => {
    if (notificationSubscription) {
      return;
    }

    notificationSubscription =
      device.monitorCharacteristicForService(
        SERVICE_UUID,
        TX_UUID,
        (error, characteristic) => {
          if (error) {
            // Manuel bağlantı kesmede monitor hatası oluşabilir.
            if (error.errorCode !== 2) {
              console.warn("BLE bildirim hatası:", error);
            }
            return;
          }

          if (!characteristic?.value) {
            return;
          }

          try {
            const incomingText = Buffer.from(
              characteristic.value,
              "base64"
            ).toString("utf8");

            receiveBuffer += incomingText;

            // Hem \n hem de \r\n desteklenir.
            let lineEndIndex: number;

            while ((lineEndIndex = receiveBuffer.indexOf("\n")) >= 0) {
              let line = receiveBuffer.slice(0, lineEndIndex);

              receiveBuffer = receiveBuffer.slice(lineEndIndex + 1);

              // \r\n kullanılmışsa sondaki \r kaldırılır.
              if (line.endsWith("\r")) {
                line = line.slice(0, -1);
              }

              listeners.forEach((listener) => {
                listener({ data: line });
              });
            }
          } catch (decodeError) {
            console.error(
              "BLE verisi çözümlenemedi:",
              decodeError
            );
          }
        }
      );
  };

  // Cihaz bağlanır bağlanmaz TX notifications açılır.
  startNotifications();

  return {
    id: device.id,
    address: device.id,
    name:
      device.name ??
      device.localName ??
      device.id,

    write: async (data: string): Promise<void> => {
      const bytes = Buffer.from(data, "utf8");

      /*
       * MTU 23 olduğunda kullanılabilir payload genellikle 20 byte'tır.
       * MTU büyütülemese bile güvenli çalışması için veriyi 20 byte'lık
       * parçalar hâlinde gönderiyoruz.
       */
      const chunkSize = 20;

      for (
        let offset = 0;
        offset < bytes.length;
        offset += chunkSize
      ) {
        const chunk = bytes.subarray(
          offset,
          offset + chunkSize
        );

        const base64Value = chunk.toString("base64");

        await device.writeCharacteristicWithResponseForService(
          SERVICE_UUID,
          RX_UUID,
          base64Value
        );
      }
    },

    onDataReceived: (listener) => {
      listeners.add(listener);
      startNotifications();

      return {
        remove: () => {
          listeners.delete(listener);
        },
      };
    },

    disconnect: async (): Promise<void> => {
      try {
        notificationSubscription?.remove();
        notificationSubscription = null;
      } catch (error) {
        console.warn(
          "BLE notification aboneliği kapatılamadı:",
          error
        );
      }

      listeners.clear();
      receiveBuffer = "";

      try {
        const connected = await device.isConnected();

        if (connected) {
          await device.cancelConnection();
        }
      } catch (error) {
        console.warn("BLE bağlantısı kapatılamadı:", error);
      }
    },
  };
};