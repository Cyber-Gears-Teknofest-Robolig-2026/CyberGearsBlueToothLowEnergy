// ============================================================================
// BTControlLib (android) — BLE (react-native-ble-plx) taşıma katmanı
// ----------------------------------------------------------------------------
// Bu projede Low Energy (BLE) kullanımı için react-native-ble-plx tercih edildi.
// Tipler, store ve sabitler (NUS UUID) ../constants içinde tutulur.
// Bu dosya yalnızca native (android) tarafında değerlendirilir; web tarafı kendi
// BTControlLib implementasyonunu kullanır.
// ============================================================================

import { PermissionsAndroid } from "react-native";
import { BleManager, Device } from "react-native-ble-plx";
import { Buffer } from "buffer";
import {
  BluetoothDevice,
  ScannedDevice,
  Subscription,
  NUS_SERVICE,
  NUS_RX,
  NUS_TX,
} from "../constants";

// Tüm uygulamada tek bir BleManager örneği paylaşılır.
const manager = new BleManager();

// Tarama/bağlanma izinlerini ister (Android 12+).
export const requestPermissions = async (): Promise<boolean> => {
  const result = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
  ]);
  return (
    result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === "granted" &&
    result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === "granted"
  );
};

// Bluetooth açık değilse açmayı dener; sonuçta açık olup olmadığını döner.
export const ensureEnabled = async (): Promise<boolean> => {
  const state = await manager.state();
  if (state === "PoweredOn") return true;
  try {
    await manager.enable();
    return true;
  } catch (error) {
    return false;
  }
};

// Yalnızca NUS servisini yayınlayan cihazları tarar. Her bulunan cihaz için
// onFound çağrılır (tekilleştirme çağırana bırakılmıştır).
export const startScan = (
  onFound: (device: ScannedDevice) => void,
  onError: (error: unknown) => void
): void => {
  manager.startDeviceScan([NUS_SERVICE], null, (error, device) => {
    if (error) {
      onError(error);
      return;
    }
    if (device) {
      onFound({
        id: device.id,
        name: device.name ?? device.localName ?? "Bilinmeyen Cihaz",
      });
    }
  });
};

export const stopScan = (): void => {
  try {
    manager.stopDeviceScan();
  } catch (e) {}
};

// Verilen id'ye bağlanır, NUS servis/karakteristiklerini keşfeder ve ortak
// BluetoothDevice yüzeyine sarılmış cihazı döndürür.
export const connect = async (deviceId: string): Promise<BluetoothDevice> => {
  const device = await manager.connectToDevice(deviceId, { requestMTU: 247 });
  await device.discoverAllServicesAndCharacteristics();
  return wrapDevice(device);
};

// Bluetooth adaptörü kapandığında listener'ı çağırır (açılışta zaten kapalıysa
// da bir kez çağrılır).
export const onAdapterPoweredOff = (listener: () => void): Subscription => {
  const subscription = manager.onStateChange((state) => {
    if (state === "PoweredOff") listener();
  }, true);
  return { remove: () => subscription.remove() };
};

// Bağlı cihazın bağlantısı koptuğunda (menzil/güç) listener'ı çağırır.
export const onDeviceDisconnected = (
  deviceId: string,
  listener: () => void
): Subscription => {
  const subscription = manager.onDeviceDisconnected(deviceId, () => listener());
  return { remove: () => subscription.remove() };
};

// --- içsel yardımcı -----------------------------------------------------------

// Bağlı bir ble-plx Device'ını ortak BluetoothDevice yüzeyine sarar. write düz
// metni base64'e çevirir; onDataReceived gelen base64'ü düz metne çözer. Böylece
// base64 detayı ekranlara sızmaz.
const wrapDevice = (device: Device): BluetoothDevice => ({
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
        const data = Buffer.from(characteristic.value, "base64").toString(
          "utf-8"
        );
        listener({ data });
      }
    );
    return { remove: () => subscription.remove() };
  },
  disconnect: async () => {
    await manager.cancelDeviceConnection(device.id);
  },
});
