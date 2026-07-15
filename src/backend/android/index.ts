/**
 * ANDROID BACKEND — Bluetooth Low Energy (BLE)
 * --------------------------------------------------------------------------
 * `BluetoothApi` sözleşmesinin BLE (GATT) ile uygulanması. `react-native-ble-plx`
 * kütüphanesini kullanır. Frontend'e şeffaf olarak UTF-8 metin iletimi
 * sağlar: TX karakteristiğinden (NOTIFY) gelen base64 veriyi decode edip
 * frontend'e gönderir; yazma için RX karakteristiğine base64 ile gönderir.
 */
import { AppState, Linking, PermissionsAndroid, Platform } from "react-native";
import { BleManager } from "react-native-ble-plx";
import { Buffer } from "buffer";
import type {
  BluetoothApi,
  ConnectedDevice,
  ScanHandlers,
  ScannedDevice,
  Subscription,
} from "..";

// Kullanıcıdan sağlanan UUID'ler (PlatformIO'dan):
const SERVICE_UUID = "8C17A100-2B31-4F52-9A68-7B126A090001".toLowerCase();
const RX_UUID = "8C17A100-2B31-4F52-9A68-7B126A090002".toLowerCase();
const TX_UUID = "8C17A100-2B31-4F52-9A68-7B126A090003".toLowerCase();

const SCAN_TIMEOUT_MS = 12000;
const manager = new BleManager();
let scanTimeout: ReturnType<typeof setTimeout> | null = null;
let scanActive = false;

// Beklenmedik kopmalarda (güç kesildi / menzilden çıktı) frontend'i uyarmak için
// kayıtlı dinleyiciler. Manuel kesmede de tetiklenir; frontend manuallyDisconnected
// bayrağıyla uyarıyı bastırır (Bluetooth Low Energy backend ile aynı davranış).
const disconnectListeners = new Set<() => void>();
let activeDisconnectSub: { remove: () => void } | null = null;

const fireDisconnectListeners = () => {
  disconnectListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      /* dinleyici hatasını yoksay */
    }
  });
};

const waitForPoweredOn = (timeout = 5000) =>
  new Promise<boolean>((resolve) => {
    const sub = manager.onStateChange((state) => {
      if (state === "PoweredOn") {
        sub.remove();
        resolve(true);
      }
    }, true);
    setTimeout(() => {
      try { sub.remove(); } catch { }
      resolve(false);
    }, timeout);
  });

/**
 * Sistem "Bluetooth'u aç?" iletişim kutusunu (ACTION_REQUEST_ENABLE) gösterip
 * kullanıcının kararını döndürür. ble-plx bu diyalogu sunmadığından, RN'in
 * yerleşik Linking.sendIntent'i ile intent tetiklenir; sonuç doğrudan gelmediği
 * için adaptör durumundan (onStateChange) ve uygulamaya dönüşten (AppState)
 * çıkarılır.
 * - Kullanıcı onaylar → adaptör PoweredOn'a geçer → true
 * - Kullanıcı reddeder → diyalogdan dönülür, PoweredOn gelmez → false
 */
const requestBluetoothEnable = async (): Promise<boolean> => {
  try {
    await Linking.sendIntent("android.bluetooth.adapter.action.REQUEST_ENABLE");
  } catch (error) {
    console.log("Bluetooth enable intent başlatılamadı:", error);
    return false;
  }

  return new Promise<boolean>((resolve) => {
    let settled = false;
    let graceTimer: ReturnType<typeof setTimeout> | null = null;

    const finish = (value: boolean) => {
      if (settled) return;
      settled = true;
      try { stateSub.remove(); } catch { }
      try { appSub.remove(); } catch { }
      if (graceTimer) clearTimeout(graceTimer);
      clearTimeout(maxTimer);
      resolve(value);
    };

    // Adaptör açılırsa (kullanıcı onayladı) hemen başarı dön.
    const stateSub = manager.onStateChange((state) => {
      if (state === "PoweredOn") finish(true);
    }, true);

    // Kullanıcı diyalogdan uygulamaya dönerse: açılmanın tamamlanması için kısa
    // ek süre tanı; süre dolar ve hâlâ açık değilse reddedilmiş say.
    const appSub = AppState.addEventListener("change", (s) => {
      if (s === "active" && !graceTimer) {
        graceTimer = setTimeout(() => finish(false), 4000);
      }
    });

    // Güvenlik: kullanıcı diyaloğa hiç yanıt vermezse askıda kalma.
    const maxTimer = setTimeout(() => finish(false), 30000);
  });
};

const base64FromUtf8 = (s: string) => Buffer.from(s, "utf-8").toString("base64");
const utf8FromBase64 = (b?: string) => (b ? Buffer.from(b, "base64").toString("utf-8") : "");

export const androidBackend: BluetoothApi = {
  supportsDeviceList: true,

  async requestPermissions() {
    if (Platform.OS !== "android") return true;
    const permissions = [
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    ];
    // Bazı Android sürümlerinde location gerekebilir; güvenli tarafta ekle.
    permissions.push(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);

    const result = await PermissionsAndroid.requestMultiple(permissions);
    return (
      result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === "granted" &&
      result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === "granted"
    );
  },

  async isEnabled() {
    // BleManager state kontrolüyle Bluetooth'un açık olup olmadığını denetle.
    try {
      const ok = await waitForPoweredOn(1000);
      return ok;
    } catch {
      return false;
    }
  },

  async ensureEnabled() {
    // Zaten açıksa hemen dön.
    try {
      if ((await manager.state()) === "PoweredOn") return true;
    } catch { }

    // Kapalıysa: uygulama içi "Bluetooth'u açın" uyarısı vermek yerine sistemin
    // kendi "Bluetooth'u aç?" iletişim kutusunu göster (react-native-bluetooth-
    // classic'teki requestBluetoothEnabled ile aynı). ble-plx bunu sunmadığından
    // RN'in Linking.sendIntent'i üzerinden ACTION_REQUEST_ENABLE tetiklenir.
    if (Platform.OS !== "android") return false;
    return await requestBluetoothEnable();
  },

  async startScan({ onDevice, onError, onComplete }: ScanHandlers) {
    scanActive = true;
    const seen = new Set<string>();

    const emit = (d: any) => {
      if (!d?.id || seen.has(d.id)) return;
      seen.add(d.id);
      const device: ScannedDevice = {
        id: d.id,
        address: d.id,
        name: d.name ?? "Bilinmeyen Cihaz",
      };
      onDevice(device);
    };

    const finish = () => {
      if (!scanActive) return;
      scanActive = false;
      if (scanTimeout) {
        clearTimeout(scanTimeout);
        scanTimeout = null;
      }
      manager.stopDeviceScan();
      onComplete?.();
    };

    try {
      // Kısa süreli tarama; sadece belirtilen servis UUID'sini filtrele
      scanTimeout = setTimeout(finish, SCAN_TIMEOUT_MS);
      manager.startDeviceScan([SERVICE_UUID], null, (error, device) => {
        if (error) {
          onError?.(error);
          finish();
          return;
        }
        if (device) emit(device);
      });
    } catch (error) {
      onError?.(error);
      finish();
    }
  },

  stopScan() {
    scanActive = false;
    if (scanTimeout) {
      clearTimeout(scanTimeout);
      scanTimeout = null;
    }
    try {
      manager.stopDeviceScan();
    } catch { }
  },

  async connect(device?: ScannedDevice) {
    if (!device?.id) throw new Error("Bağlanmak için bir cihaz id'si gerekli.");

    const dev = await manager.connectToDevice(device.id, { timeout: 10000 });
    await dev.discoverAllServicesAndCharacteristics();

    // İletişimi hızlandır (Classic SPP gecikmesine yaklaşmak için). Üçü de
    // Android'e özgü ve "best effort": desteklenmezse sessizce yoksayılır,
    // bağlantı yine de çalışır.
    //   1) Yüksek bağlantı önceliği → connection interval ~7.5–15 ms (varsayılan
    //      ~30–50 ms). En büyük gecikme kazancı budur.
    //   2) MTU artışı → daha uzun komutlar tek pakette gider; write-without-
    //      response'ta truncation'ı önler (varsayılan 23 → faydalı yük 20 bayt).
    let negotiatedMtu = 23;
    try {
      const m = await dev.requestMTU(247);
      negotiatedMtu = m.mtu ?? 23;
    } catch { }
    try {
      await dev.requestConnectionPriority(1 /* ConnectionPriority.High */);
    } catch { }

    // RX karakteristiği "write without response" destekliyorsa onu tercih et:
    // ACK beklemediği için bir bağlantı olayında birden fazla paket gider ve
    // throughput belirgin artar. Desteklenmiyorsa (veya komut MTU'ya sığmıyorsa)
    // güvenli yola — onaylı yazma — düşülür.
    let rxSupportsNoResponse = false;
    try {
      const chars = await dev.characteristicsForService(SERVICE_UUID);
      const rx = chars.find((c) => c.uuid.toLowerCase() === RX_UUID);
      rxSupportsNoResponse = rx?.isWritableWithoutResponse ?? false;
    } catch { }

    // Cihaz beklenmedik şekilde koparsa kayıtlı dinleyicileri tetikle. Önceki
    // bağlantıdan kalan aboneliği temizleyerek mükerrer bildirimi önle.
    try {
      activeDisconnectSub?.remove();
    } catch { }
    activeDisconnectSub = manager.onDeviceDisconnected(dev.id, () => {
      activeDisconnectSub = null;
      fireDisconnectListeners();
    });

    // Monitor TX characteristic (notify)
    const subscription = manager.monitorCharacteristicForDevice(
      dev.id,
      SERVICE_UUID,
      TX_UUID,
      (error, characteristic) => {
        // handled below by ConnectedDevice wrapper via onDataReceived subscriptions
      }
    );
    // subscription.remove() çağrısı gerektiğinde yapılacak (disconnect wrapper)

    const write = async (data: string) => {
      const base64 = base64FromUtf8(data);
      // Hızlı yol: karakteristik destekliyorsa ve komut MTU'ya sığıyorsa onay
      // beklemeden gönder. Sığmıyorsa onaylı yazma uzun veriyi otomatik parçalar.
      const fitsInMtu = Buffer.byteLength(data, "utf-8") <= negotiatedMtu - 3;
      if (rxSupportsNoResponse && fitsInMtu) {
        await manager.writeCharacteristicWithoutResponseForDevice(
          dev.id,
          SERVICE_UUID,
          RX_UUID,
          base64
        );
      } else {
        // Güvenli yol; hata durumunda fırlatır.
        await manager.writeCharacteristicWithResponseForDevice(
          dev.id,
          SERVICE_UUID,
          RX_UUID,
          base64
        );
      }
    };

    const disconnect = async () => {
      try {
        activeDisconnectSub?.remove();
        activeDisconnectSub = null;
      } catch { }
      try {
        subscription.remove();
      } catch { }
      try {
        await manager.cancelDeviceConnection(dev.id);
      } catch { }
    };

    const onDataReceived = (listener: (event: { data: string }) => void) => {
      // Her çağrıda yeni bir monitor oluşturmak yerine merkezi monitor kullanmak
      // daha verimlidir; fakat basitlik için burada doğrudan manager.monitor... kullanıyoruz.
      const sub = manager.monitorCharacteristicForDevice(
        dev.id,
        SERVICE_UUID,
        TX_UUID,
        (error, characteristic) => {
          if (error) return;
          const text = utf8FromBase64(characteristic?.value ?? undefined);
          if (text) listener({ data: text });
        }
      );
      return { remove: () => sub.remove() };
    };

    const connectedDevice: ConnectedDevice = {
      id: dev.id,
      address: dev.id,
      name: dev.name ?? "BLE Cihazı",
      write,
      disconnect,
      onDataReceived,
    };

    return connectedDevice;
  },

  onBluetoothDisabled(_listener: () => void): Subscription {
    // BleManager kendi state subscription'ını sağlar; burada basit NOOP döndürülür.
    return { remove: () => { } };
  },

  onDeviceDisconnected(listener: () => void): Subscription {
    // Aktif cihaz koptuğunda connect() içinde bağlanan monitor bu dinleyicileri
    // tetikler. Frontend (App.tsx) bunu yakalayıp "Bağlantı Koptu" uyarısı verir.
    disconnectListeners.add(listener);
    return { remove: () => { disconnectListeners.delete(listener); } };
  },
};

export default androidBackend;
