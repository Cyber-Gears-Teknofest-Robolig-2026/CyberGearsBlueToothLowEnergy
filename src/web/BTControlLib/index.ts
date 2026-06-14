// ============================================================================
// BTControlLib (web) — Bluetooth Low Energy / Web Bluetooth API
// ============================================================================

import {
  BluetoothDevice,
  useBluetoothStore,
} from "../constants";

const SERVICE_UUID = "8c17a100-2b31-4f52-9a68-7b126a090001";
const RX_UUID = "8c17a100-2b31-4f52-9a68-7b126a090002";
const TX_UUID = "8c17a100-2b31-4f52-9a68-7b126a090003";

const BLE_CHUNK_SIZE = 20;

// ============================================================================
// Tarayıcı desteği
// ============================================================================

export const isSupported = (): boolean => {
  return (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    "bluetooth" in navigator
  );
};

// ============================================================================
// BLE cihaz seç ve bağlan
// ============================================================================

export const connect = async (): Promise<BluetoothDevice | null> => {
  if (typeof window === "undefined") {
    throw new Error("Bu işlem yalnızca tarayıcıda kullanılabilir.");
  }

  if (!window.isSecureContext) {
    throw new Error(
      "Web Bluetooth yalnızca HTTPS veya localhost üzerinde çalışır."
    );
  }

  if (!isSupported()) {
    throw new Error(
      "Bu tarayıcı Web Bluetooth özelliğini desteklemiyor. " +
      "Google Chrome veya Microsoft Edge kullanın."
    );
  }

  const bluetooth = (navigator as any).bluetooth;

  let nativeDevice: any;

  try {
    /*
     * Android tarafındaki startDeviceScan([SERVICE_UUID]) ile aynı mantık:
     *
     * Yalnızca SERVICE_UUID değerini advertising paketinde yayınlayan
     * yakındaki BLE cihazları gösterilir.
     */
    nativeDevice = await bluetooth.requestDevice({
      filters: [
        {
          services: [SERVICE_UUID],
        },
      ],

      /*
       * Seçilen cihazdaki özel servise bağlantıdan sonra erişebilmek için.
       * Bu bir tarama filtresi değildir.
       */
      optionalServices: [SERVICE_UUID],
    });
  } catch (error: unknown) {
    const errorName =
      typeof error === "object" &&
        error !== null &&
        "name" in error
        ? String((error as { name: unknown }).name)
        : "";

    /*
     * NotFoundError iki durumda oluşabilir:
     * 1. Kullanıcı pencereyi iptal etti.
     * 2. SERVICE_UUID yayınlayan cihaz bulunamadı.
     */
    if (errorName === "NotFoundError") {
      return null;
    }

    throw new Error(
      `BLE cihaz seçim ekranı açılamadı: ${getErrorMessage(error)}`
    );
  }

  if (!nativeDevice?.gatt) {
    throw new Error(
      "Seçilen cihaz BLE GATT bağlantısını desteklemiyor."
    );
  }

  try {
    const server = await nativeDevice.gatt.connect();

    const service = await server.getPrimaryService(
      SERVICE_UUID
    );

    const rxCharacteristic =
      await service.getCharacteristic(RX_UUID);

    const txCharacteristic =
      await service.getCharacteristic(TX_UUID);

    return await wrapDevice(
      nativeDevice,
      rxCharacteristic,
      txCharacteristic
    );
  } catch (error) {
    try {
      if (nativeDevice.gatt?.connected) {
        nativeDevice.gatt.disconnect();
      }
    } catch (_) { }

    throw new Error(
      "BLE cihazına bağlanıldı fakat servis veya karakteristikler bulunamadı.\n\n" +
      `Ayrıntı: ${getErrorMessage(error)}`
    );
  }
};

// ============================================================================
// BLE cihazını mevcut BluetoothDevice arayüzüne dönüştür
// ============================================================================

const wrapDevice = async (
  nativeDevice: any,
  rxCharacteristic: any,
  txCharacteristic: any
): Promise<BluetoothDevice> => {
  const listeners = new Set<
    (event: { data: string }) => void
  >();

  const encoder = new TextEncoder();
  const decoder = new TextDecoder("utf-8");

  let receiveBuffer = "";
  let closed = false;
  let manuallyDisconnected = false;

  let writeQueue: Promise<void> = Promise.resolve();

  const clearStore = (): void => {
    try {
      const store = useBluetoothStore.getState();
      store.setConnectedDevice(null);
      store.setManuallyDisconnected(false);
    } catch (_) { }
  };

  const handleDisconnected = (): void => {
    if (closed) {
      return;
    }

    closed = true;
    listeners.clear();
    receiveBuffer = "";

    let storeManualDisconnect = false;

    try {
      const store = useBluetoothStore.getState();

      storeManualDisconnect =
        store.manuallyDisconnected === true;

      store.setConnectedDevice(null);
      store.setManuallyDisconnected(false);
    } catch (_) { }

    if (
      !manuallyDisconnected &&
      !storeManualDisconnect
    ) {
      window.alert(
        "Bağlantı Koptu ⚠️\n" +
        "Cihaz kapandı, menzil dışına çıktı veya bağlantı kesildi."
      );
    }
  };

  const handleValueChanged = (event: any): void => {
    const value = event?.target?.value;

    if (!value) {
      return;
    }

    try {
      const bytes = new Uint8Array(
        value.buffer,
        value.byteOffset,
        value.byteLength
      );

      receiveBuffer += decoder.decode(bytes, {
        stream: true,
      });

      let newlineIndex: number;

      while (
        (newlineIndex = receiveBuffer.indexOf("\n")) >= 0
      ) {
        let line = receiveBuffer.slice(0, newlineIndex);

        receiveBuffer = receiveBuffer.slice(
          newlineIndex + 1
        );

        if (line.endsWith("\r")) {
          line = line.slice(0, -1);
        }

        listeners.forEach((listener) => {
          listener({ data: line });
        });
      }
    } catch (error) {
      console.error(
        "BLE verisi çözümlenemedi:",
        error
      );
    }
  };

  nativeDevice.addEventListener(
    "gattserverdisconnected",
    handleDisconnected
  );

  txCharacteristic.addEventListener(
    "characteristicvaluechanged",
    handleValueChanged
  );

  try {
    await txCharacteristic.startNotifications();
  } catch (error) {
    try {
      txCharacteristic.removeEventListener(
        "characteristicvaluechanged",
        handleValueChanged
      );

      nativeDevice.removeEventListener(
        "gattserverdisconnected",
        handleDisconnected
      );

      if (nativeDevice.gatt?.connected) {
        nativeDevice.gatt.disconnect();
      }
    } catch (_) { }

    throw new Error(
      `TX notification başlatılamadı: ${getErrorMessage(error)}`
    );
  }

  const writeChunk = async (
    chunk: Uint8Array
  ): Promise<void> => {
    const properties = rxCharacteristic.properties;

    if (
      properties?.write &&
      typeof rxCharacteristic.writeValueWithResponse ===
      "function"
    ) {
      await rxCharacteristic.writeValueWithResponse(
        chunk
      );
      return;
    }

    if (
      properties?.writeWithoutResponse &&
      typeof rxCharacteristic.writeValueWithoutResponse ===
      "function"
    ) {
      await rxCharacteristic.writeValueWithoutResponse(
        chunk
      );
      return;
    }

    if (
      typeof rxCharacteristic.writeValue === "function"
    ) {
      await rxCharacteristic.writeValue(chunk);
      return;
    }

    if (
      typeof rxCharacteristic.writeValueWithResponse ===
      "function"
    ) {
      await rxCharacteristic.writeValueWithResponse(
        chunk
      );
      return;
    }

    if (
      typeof rxCharacteristic.writeValueWithoutResponse ===
      "function"
    ) {
      await rxCharacteristic.writeValueWithoutResponse(
        chunk
      );
      return;
    }

    throw new Error(
      "RX karakteristiği yazmayı desteklemiyor."
    );
  };

  const wrappedDevice: BluetoothDevice = {
    name:
      nativeDevice.name ??
      "Bluetooth LE Cihazı",

    write: async (data: string): Promise<void> => {
      if (
        closed ||
        !nativeDevice.gatt?.connected
      ) {
        throw new Error(
          "Bluetooth LE bağlantısı kapalı."
        );
      }

      const bytes = encoder.encode(data);

      const operation = async (): Promise<void> => {
        for (
          let offset = 0;
          offset < bytes.length;
          offset += BLE_CHUNK_SIZE
        ) {
          const chunk = bytes.slice(
            offset,
            offset + BLE_CHUNK_SIZE
          );

          await writeChunk(chunk);
        }
      };

      const currentWrite =
        writeQueue.then(operation);

      writeQueue = currentWrite.catch(() => { });

      await currentWrite;
    },

    onDataReceived: (listener) => {
      listeners.add(listener);

      return {
        remove: () => {
          listeners.delete(listener);
        },
      };
    },

    disconnect: async (): Promise<void> => {
      if (closed) {
        return;
      }

      manuallyDisconnected = true;

      try {
        const store = useBluetoothStore.getState();
        store.setManuallyDisconnected(true);
      } catch (_) { }

      try {
        await txCharacteristic.stopNotifications();
      } catch (_) { }

      try {
        txCharacteristic.removeEventListener(
          "characteristicvaluechanged",
          handleValueChanged
        );
      } catch (_) { }

      try {
        nativeDevice.removeEventListener(
          "gattserverdisconnected",
          handleDisconnected
        );
      } catch (_) { }

      listeners.clear();
      receiveBuffer = "";

      try {
        if (nativeDevice.gatt?.connected) {
          nativeDevice.gatt.disconnect();
        }
      } finally {
        closed = true;
        clearStore();
      }
    },
  };

  return wrappedDevice;
};

const getErrorMessage = (
  error: unknown
): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};