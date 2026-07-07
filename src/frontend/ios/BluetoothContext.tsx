/**
 * FRONTEND'İN BLUETOOTH SÖZLEŞMESİ + DİKİŞİ (PORT + SEAM)
 * --------------------------------------------------------------------------
 * Sözleşme (BluetoothApi) ARTIK FRONTEND'E aittir. Böylece `frontend/` klasörü
 * `backend/` klasörüne HİÇBİR bağımlılık taşımaz; backend olmasa bile arayüz
 * çökmez (güvenli no-op'a düşer).
 *
 * Backend, frontend'in DIŞINDA (src/App.tsx) enjekte edilir:
 *   <BluetoothProvider backend={backend}>...</BluetoothProvider>
 *
 * Enjekte edilmezse `useBluetooth()` `noopBackend` döner: tüm çağrılar güvenli
 * şekilde başarısız olur, uygulama açılır.
 *
 * TAŞINABİLİRLİK: Yalnızca `frontend/` klasörünü kopyala. İstersen bir backend
 * yazıp enjekte et; yazmazsan ekranlar yine açılır (Bluetooth pasif olur).
 */
import React, { createContext, useContext } from "react";

/* -------------------------------------------------------------------------- */
/* SÖZLEŞME (PORT)                                                            */
/* -------------------------------------------------------------------------- */

/** Abonelik tutamacı; dinleyici eklendiğinde döner, `remove()` ile temizlenir. */
export type Subscription = { remove: () => void };

/** Cihaz hangi alt teknolojiyle bulundu? */
export type DeviceKind = "classic" | "serial";

/** Tarama sırasında listelenen, henüz bağlanılmamış cihaz. */
export type ScannedDevice = {
  id: string;
  /** Ekranlarda anahtar olarak kullanılan benzersiz adres. */
  address: string;
  name: string;
  /** Daha önce eşleşmiş (bonded) klasik cihaz mı? */
  bonded?: boolean;
  kind?: DeviceKind;
};

/**
 * Aktif bağlantı. Frontend bu nesne üzerinden mesaj yazar/dinler.
 * `onDataReceived` her platformda ÇÖZÜLMÜŞ (decoded) UTF-8 metin yollar;
 * frontend tarafında base64 / TextDecoder çözümlemesi gerekmez.
 */
export type ConnectedDevice = {
  id: string;
  address: string;
  name: string;
  write: (data: string) => Promise<void>;
  disconnect: () => Promise<void>;
  onDataReceived: (
    listener: (event: { data: string }) => void
  ) => Subscription;
};

/** Tarama sırasında geri çağrılar. */
export type ScanHandlers = {
  onDevice: (device: ScannedDevice) => void;
  onError?: (error: unknown) => void;
  onComplete?: () => void;
};

/** Frontend'in bağımlı olduğu Bluetooth motoru arayüzü. Backend bunu uygular. */
export interface BluetoothApi {
  readonly supportsDeviceList: boolean;
  requestPermissions(): Promise<boolean>;
  isEnabled(): Promise<boolean>;
  ensureEnabled(): Promise<boolean>;
  startScan(handlers: ScanHandlers): Promise<void>;
  stopScan(): void;
  connect(device?: ScannedDevice): Promise<ConnectedDevice>;
  onBluetoothDisabled(listener: () => void): Subscription;
  onDeviceDisconnected(listener: () => void): Subscription;
}

/* -------------------------------------------------------------------------- */
/* GÜVENLİ YEDEK (NO-OP)                                                      */
/* -------------------------------------------------------------------------- */

const NOOP_SUBSCRIPTION: Subscription = { remove: () => {} };

/**
 * Backend enjekte edilmediğinde / yüklenemediğinde kullanılan güvenli motor.
 * Hiçbir çağrı uygulamayı çökertmez; bağlanma denemeleri kontrollü hata verir
 * (ekranlar bunu zaten try/catch ile yakalar).
 */
export const noopBackend: BluetoothApi = {
  supportsDeviceList: false,  
  async requestPermissions() {
    return false;
  },  
  async isEnabled() {
    return false;
  },  
  async ensureEnabled() {
    return false;
  },  
  async startScan({ onComplete }: ScanHandlers) {
    onComplete?.();
  },  
  stopScan() {},  
  async connect() {
    throw new Error("Bluetooth motoru (backend) bağlı değil.");
  },  
  onBluetoothDisabled() {
    return NOOP_SUBSCRIPTION;
  },  
  onDeviceDisconnected() {
    return NOOP_SUBSCRIPTION;
  },
};

/* -------------------------------------------------------------------------- */
/* CONTEXT (DİKİŞ)                                                            */
/* -------------------------------------------------------------------------- */

const BluetoothContext = createContext<BluetoothApi>(noopBackend);

type BluetoothProviderProps = {
  /** Enjekte edilen Bluetooth motoru. Verilmezse güvenli no-op kullanılır. */
  backend?: BluetoothApi | null;
  children: React.ReactNode;
};

export function BluetoothProvider({ backend, children }: BluetoothProviderProps) {
  return (
    <BluetoothContext.Provider value={backend ?? noopBackend}>
      {children}
    </BluetoothContext.Provider>
  );
}

/** Enjekte edilen Bluetooth motorunu döndürür. Backend yoksa no-op döner (çökmez). */
export function useBluetooth(): BluetoothApi {
  return useContext(BluetoothContext);
}
