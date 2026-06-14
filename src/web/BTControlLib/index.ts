// ============================================================================
// BTControlLib (web) — Web Bluetooth (GATT) taşıma katmanı
// ----------------------------------------------------------------------------
// Tarayıcılar BT Low Energy (GATT) üzerinden haberleşir. Bu dosya Web
// Bluetooth API'sini kullanır: kullanıcı cihaz seçimini yapar, ardından
// GATT servisi ve karakteristiklerine bağlanılır. Tipler/store sabitleri
// (NUS UUID) ../constants içinde tutulur.
// ============================================================================

import {
  BluetoothDevice,
  NUS_SERVICE,
  NUS_RX,
  NUS_TX,
  useBluetoothStore,
} from "../constants";

// Tarayıcı Web Bluetooth API'sini destekliyor mu?
export const isSupported = (): boolean =>
  typeof navigator !== "undefined" && "bluetooth" in navigator;

// Tarayıcının cihaz seçicisini açar, seçilen cihaza bağlanır ve ortak
// BluetoothDevice yüzeyine sarar. Kullanıcı seçimi iptal ederse null döner;
// bağlantı kurulamazsa hata fırlatır.
export const connect = async (): Promise<BluetoothDevice | null> => {
  if (!isSupported()) return null;

  let bleDevice: any;
  try {
    bleDevice = await (navigator as any).bluetooth.requestDevice({
      filters: [{ services: [NUS_SERVICE] }],
      optionalServices: [NUS_SERVICE],
    });
  } catch (error) {
    return null; // kullanıcı cihaz seçim penceresini iptal etti
  }

  const server = await bleDevice.gatt.connect();
  const service = await server.getPrimaryService(NUS_SERVICE);
  const rx = await service.getCharacteristic(NUS_RX);
  const tx = await service.getCharacteristic(NUS_TX);

  return wrapDevice(bleDevice, server, rx, tx);
};

// --- içsel yardımcı -----------------------------------------------------------

// Web Bluetooth (GATT) cihazını ortak BluetoothDevice yüzeyine sarar. write düz
// metni byte'a çevirip RX'e yazar; onDataReceived TX bildirimlerinin byte'larını
// düz metne çözer. Böylece kodlama detayı ekranlara sızmaz.
const wrapDevice = (
  bleDevice: any, // BluetoothDevice (Web Bluetooth)
  server: any, // BluetoothRemoteGATTServer
  rx: any, // RX karakteristiği (write)
  tx: any // TX karakteristiği (notify)
): BluetoothDevice => {
  const listeners = new Set<(event: { data: string }) => void>();

  // Web Bluetooth aynı anda yalnızca TEK bir GATT işlemine izin verir; eşzamanlı
  // çağrılar "GATT operation already in progress" hatası verir. Bu yüzden tüm
  // GATT işlemlerini tek bir kuyrukta seri çalıştırıyoruz.
  let gattQueue: Promise<unknown> = Promise.resolve();
  const enqueueGatt = <T,>(op: () => Promise<T>): Promise<T> => {
    const run = gattQueue.then(op, op);
    gattQueue = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  };

  const handleNotify = (event: any) => {
    const value: DataView = event.target.value;
    if (!value) return;
    const bytes = new Uint8Array(value.buffer);
    const data = new TextDecoder().decode(bytes);
    listeners.forEach((cb) => cb({ data }));
  };
  tx.addEventListener("characteristicvaluechanged", handleNotify);
  enqueueGatt(() => tx.startNotifications()).catch(() => {});

  // Bağlantı koparsa (güç/menzil) durumu temizle ve (manuel değilse) uyar.
  const handleDisconnect = () => {
    const { manuallyDisconnected, setConnectedDevice, setManuallyDisconnected } =
      useBluetoothStore.getState();
    setConnectedDevice(null);
    if (!manuallyDisconnected) {
      window.alert(
        "Bağlantı Koptu ⚠️\nCihazın gücü kesildi veya menzilden çıkıldı."
      );
    }
    setManuallyDisconnected(false);
  };
  bleDevice.addEventListener("gattserverdisconnected", handleDisconnect);

  return {
    name: bleDevice.name || "BLE Cihazı",
    write: (data: string) => {
      const bytes = new TextEncoder().encode(data);
      return enqueueGatt(() =>
        rx.writeValueWithoutResponse
          ? rx.writeValueWithoutResponse(bytes)
          : rx.writeValue(bytes)
      );
    },
    onDataReceived: (listener) => {
      listeners.add(listener);
      return {
        remove: () => {
          listeners.delete(listener);
        },
      };
    },
    disconnect: async () => {
      bleDevice.removeEventListener("gattserverdisconnected", handleDisconnect);
      try {
        tx.removeEventListener("characteristicvaluechanged", handleNotify);
      } catch (e) {}
      try {
        await enqueueGatt(() => tx.stopNotifications());
      } catch (e) {}
      try {
        if (server.connected) server.disconnect();
      } catch (e) {}
    },
  };
};
