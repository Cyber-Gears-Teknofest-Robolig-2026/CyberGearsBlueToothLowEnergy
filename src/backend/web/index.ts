/**
 * WEB BACKEND — Web Bluetooth (GATT)
 * --------------------------------------------------------------------------
 * `BluetoothApi` sözleşmesinin Web Bluetooth API ile uygulanması. Burada
 * connect() tarayıcı cihaz seçici penceresini açar; servis/karakteristikleri
 * provided UUID'lerle (SERVICE, RX=write, TX=notify) kullanır.
 */
import type {
  BluetoothApi,
  ConnectedDevice,
  ScanHandlers,
  ScannedDevice,
  Subscription,
} from "..";

const SERVICE_UUID = "8C17A100-2B31-4F52-9A68-7B126A090001".toLowerCase();
const RX_UUID = "8C17A100-2B31-4F52-9A68-7B126A090002".toLowerCase();
const TX_UUID = "8C17A100-2B31-4F52-9A68-7B126A090003".toLowerCase();

const NOOP_SUBSCRIPTION: Subscription = { remove: () => {} };

const hasWebBluetooth = () =>
  typeof navigator !== "undefined" && !!(navigator as any).bluetooth;

/* --------------------------------------------------------------------------
 * KOPMA TAKİBİ (tek seferde tek bağlantı)
 * Beklenmedik kopmada (cihaz çıkarıldı / güç kesildi / menzilden çıktı) frontend'i
 * uyarmak için dinleyicileri tetikleriz. Manuel kesmede tetiklemeyiz (Web Serial
 * backend ile aynı davranış); frontend yine de manuallyDisconnected bayrağını
 * kontrol eder.
 * ------------------------------------------------------------------------ */
const disconnectListeners = new Set<() => void>();
let activeServer: any = null;
let manualDisconnect = false;

const fireDisconnectListeners = () => {
  disconnectListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      /* dinleyici hatasını yoksay */
    }
  });
};

export const webBackend: BluetoothApi = {
  supportsDeviceList: false,

  async requestPermissions() {
    // Web Bluetooth izinleri connect() sırasında kullanıcı tarafından verilir.
    return hasWebBluetooth();
  },

  async isEnabled() {
    return hasWebBluetooth();
  },

  async ensureEnabled() {
    return hasWebBluetooth();
  },

  async startScan({ onComplete }: ScanHandlers) {
    // Web Bluetooth tarama için kullanıcı etkileşimi gerektirir; burada hemen tamamla.
    onComplete?.();
  },

  stopScan() {},

  async connect(_device?: ScannedDevice) {
    if (!hasWebBluetooth()) {
      throw new Error("Tarayıcınız Web Bluetooth API desteklemiyor. Chrome/Edge deneyin.");
    }
    // Cihaz seçici: servis filtresi kullan (kullanıcı cihazı seçer)
    const device = await (navigator as any).bluetooth.requestDevice({
      filters: [{ services: [SERVICE_UUID] }],
      optionalServices: [SERVICE_UUID],
    });
    const server = await device.gatt.connect();
    // Aktif bağlantıyı kaydet; kopma olayını yalnızca bu sunucu için işleriz.
    activeServer = server;
    manualDisconnect = false;
    const service = await server.getPrimaryService(SERVICE_UUID);
    const rxChar = await service.getCharacteristic(RX_UUID);
    const txChar = await service.getCharacteristic(TX_UUID);

    // Web Bluetooth aynı anda YALNIZCA tek bir GATT işlemine izin verir; aksi
    // halde "GATT operation already in progress" hatası alınır. Bu yüzden tüm
    // GATT işlemlerini (write / startNotifications / stopNotifications) tek bir
    // promise zinciri üzerinden seri olarak çalıştırıyoruz. Bir işlem reddedilse
    // bile zincir kırılmaz; sıradaki işlem yine de çalışır.
    let gattChain: Promise<unknown> = Promise.resolve();
    const enqueueGatt = <T>(op: () => Promise<T>): Promise<T> => {
      const run = gattChain.then(op, op);
      gattChain = run.then(
        () => undefined,
        () => undefined
      );
      return run;
    };

    // Yazma helper (text -> bytes) — GATT kuyruğu üzerinden seri çalışır.
    // Web'de mutlaka "with response" (writeValue) kullan: peş peşe gönderilen
    // ayrı komutların (örn. ön + arka zipline) güvenle iletilmesi için her
    // yazmanın gerçekten tamamlanmasını beklemek gerekir. writeValueWithoutResponse
    // tarayıcıda akış kontrolü olmadığından ikinci yazmayı düşürebiliyor.
    // Slider'ın akıcılığı zaten frontend'deki coalescing ile çözülüyor, bu yüzden
    // burada hıza değil güvenilirliğe öncelik veriyoruz.
    const write = async (data: string) => {
      const encoder = new TextEncoder();
      const bytes = encoder.encode(data);
      await enqueueGatt(() => rxChar.writeValue(bytes));
    };

    const disconnect = async () => {
      // Manuel kesme: gattserverdisconnected olayında kopma bildirimi tetiklenmesin.
      manualDisconnect = true;
      try {
        await server.disconnect();
      } catch {}
    };

    const onDataReceived = (listener: (event: { data: string }) => void) => {
      const decoder = new TextDecoder();
      const handler = (ev: any) => {
        try {
          const value = ev.target.value; // DataView
          const arr = new Uint8Array(value.buffer);
          const text = decoder.decode(arr).trim();
          if (text) listener({ data: text });
        } catch {
          /* ignore */
        }
      };
      txChar.addEventListener("characteristicvaluechanged", handler);
      enqueueGatt(() => txChar.startNotifications()).catch(() => {});
      return {
        remove: () => {
          try {
            txChar.removeEventListener("characteristicvaluechanged", handler);
            enqueueGatt(() => txChar.stopNotifications()).catch(() => {});
          } catch {}
        },
      };
    };

    const connectedDevice: ConnectedDevice = {
      id: device.id,
      address: device.id,
      name: device.name ?? "BLE Cihazı",
      write,
      disconnect,
      onDataReceived,
    };

    device.addEventListener?.("gattserverdisconnected", () => {
      // Yalnızca hâlâ aktif bağlantı buysa ele al (eski cihaz olaylarını yoksay).
      if (activeServer !== server) return;
      activeServer = null;
      const wasManual = manualDisconnect;
      manualDisconnect = false;
      // Manuel kesmede uyarı verme; yalnızca beklenmedik kopmada dinleyicileri tetikle.
      if (!wasManual) fireDisconnectListeners();
    });

    return connectedDevice;
  },

  onBluetoothDisabled(_listener: () => void): Subscription {
    return NOOP_SUBSCRIPTION;
  },

  onDeviceDisconnected(listener: () => void): Subscription {
    // GATT sunucusu beklenmedik şekilde koptuğunda (gattserverdisconnected) bu
    // dinleyiciler tetiklenir. Frontend (App.tsx) "Bağlantı koptu" uyarısı verir.
    disconnectListeners.add(listener);
    return { remove: () => disconnectListeners.delete(listener) };
  },
};

export default webBackend;
