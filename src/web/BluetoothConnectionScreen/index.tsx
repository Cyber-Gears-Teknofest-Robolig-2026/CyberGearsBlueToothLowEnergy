import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import styles from "./styles";
import { useNavigation } from "@react-navigation/native";
import {
  AppNavigationProp,
  useBluetoothStore,
  BluetoothDevice,
} from "../constants";
import { connect, isSupported } from "../BTControlLib";

const BAUD_RATE = 9600;

// Tarayıcı seri portunu (Web Serial API) Android'deki BluetoothDevice yüzeyine
// saran adapter. Böylece diğer ekranlar (Communication, CarControl) cihazı
// android ile bire bir aynı şekilde (write/disconnect/onDataReceived) kullanır.
const createSerialDevice = (port: any, name: string): BluetoothDevice => {
  const listeners = new Set<(event: { data: string }) => void>();
  let reading = true;
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

  const startReadLoop = async () => {
    let textBuffer = "";
    const decoder = new TextDecoder();

    while (reading && port.readable) {
      try {
        const activeReader = port.readable.getReader();
        reader = activeReader;
        while (reading) {
          const { value, done } = await activeReader.read();
          if (done) break;
          if (value && value.length) {
            textBuffer += decoder.decode(value, { stream: true });
            // android'deki delimiter "\n" davranışı: satır satır yayınla
            let nlIndex: number;
            while ((nlIndex = textBuffer.indexOf("\n")) >= 0) {
              const line = textBuffer.slice(0, nlIndex).replace(/\r$/, "");
              textBuffer = textBuffer.slice(nlIndex + 1);
              const data = Buffer.from(line, "utf-8").toString("base64");
              listeners.forEach((cb) => cb({ data }));
            }
          }
        }
      } catch (e) {
        // okuma hatası (ör. cihaz çıkarıldığında) — döngü sonlanır
      } finally {
        try {
          reader?.releaseLock();
        } catch (e) { }
        reader = null;
      }
      if (!reading) break;
    }
  };

  startReadLoop();

  return {
    name,
    write: async (data: string) => {
      // Some browsers throw if the writable stream is temporarily locked by
      // another writer (rapid writes from sliders). Retry a few times with a
      // short backoff instead of crashing.
      const encoded = new TextEncoder().encode(data);
      const maxAttempts = 6;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          const writer = port.writable.getWriter();
          try {
            await writer.write(encoded);
            return;
          } finally {
            try { writer.releaseLock(); } catch (e) { }
          }
        } catch (e) {
          // If locked, wait a bit and retry
          if (attempt === maxAttempts - 1) throw e;
          await new Promise((res) => setTimeout(res, 8 * (attempt + 1)));
        }
      }
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
      reading = false;
      try {
        await reader?.cancel();
      } catch (e) { }
      try {
        await port.close();
      } catch (e) { }
    },
  };
};

export default function BluetoothConnectionScreen() {

  const connectedDevice = useBluetoothStore((state) => state.connectedDevice);
  const setConnectedDevice = useBluetoothStore((state) => state.setConnectedDevice);
  const setMessages = useBluetoothStore((state) => state.setMessages);
  const setManuallyDisconnected = useBluetoothStore((state) => state.setManuallyDisconnected);

  const navigation = useNavigation<AppNavigationProp>();

  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    if (!isSupported()) {
      window.alert(
        "Hata: Tarayıcınız Web Serial API desteklemiyor. Masaüstü Chrome veya Edge kullanın."
      );
    }
  }, []);

  const selectAndConnect = async () => {
    if (!isSupported()) return;

    try {
      setIsConnecting(true);

      const device = await connect();
      if (!device) return; // kullanıcı cihaz seçimini iptal etti

      setManuallyDisconnected(false);
      setConnectedDevice(device);
      setMessages([]);
    } catch (e) {
      window.alert("Hata: Bağlantı kurulamadı.");
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectDevice = async () => {
    if (!connectedDevice) return;
    if (!window.confirm("Bağlantı kesilecek. Emin misiniz?")) return;
    try {
      setManuallyDisconnected(true);
      await connectedDevice.disconnect();
      setConnectedDevice(null);
      setMessages([]);
    } catch (e) {
      setConnectedDevice(null);
      setMessages([]);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      <View style={styles.headerWithBack}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={26} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bağlantı Yönetimi</Text>
        <TouchableOpacity
          onPress={() => {
            const idx = navigation.getState()?.index ?? 0;
            if (idx > 0 && typeof window !== 'undefined') {
              window.history.go(-idx);
            } else {
              navigation.navigate('Home');
            }
          }}
          style={styles.homeBtn}
        >
          <MaterialCommunityIcons name="home" size={24} color="#1E293B" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons
              name="bluetooth"
              size={32}
              color={isConnecting ? "#F59E0B" : connectedDevice ? "#10B981" : "#EF4444"}
            />
            <View style={{ flex: 1 }}>
              <View style={styles.statusLabelRow}>
                <Text style={styles.label}>BAĞLANTI DURUMU</Text>
                {isConnecting ? (
                  <View style={styles.connectingBadge}>
                    <ActivityIndicator size="small" color="#F59E0B" style={styles.smallSpinner} />
                    <Text style={styles.connectingText}>Bağlanıyor...</Text>
                  </View>
                ) : connectedDevice ? (
                  <View style={styles.onlineBadge}>
                    <View style={styles.onlineDot} />
                    <Text style={styles.onlineText}>Bağlandı</Text>
                  </View>
                ) : (
                  <View style={styles.offlineBadge}>
                    <View style={styles.offlineDot} />
                    <Text style={styles.offlineText}>Bağlı Değil</Text>
                  </View>
                )}
              </View>
              <Text style={styles.infoText}>
                {isConnecting
                  ? "Lütfen bekleyin..."
                  : connectedDevice
                    ? connectedDevice.name
                    : "Cihaz seçilmedi"}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.scanBtn} onPress={selectAndConnect} disabled={isConnecting}>
            <Text style={styles.scanBtnText}>Cihaz Seç ve Bağlan</Text>
          </TouchableOpacity>
          {connectedDevice && !isConnecting && (
            <TouchableOpacity style={styles.disconnectBtn} onPress={disconnectDevice}>
              <Text style={styles.disconnectBtnText}>Bağlantıyı Kes</Text>
            </TouchableOpacity>
          )}
        </View>

        {connectedDevice && !isConnecting && (
          <TouchableOpacity style={styles.carControlBtn} onPress={() => navigation.navigate("CarControl")}>
            <View style={styles.carControlBtnContent}>
              <MaterialCommunityIcons name="car" size={28} color="#854D0E" />
              <Text style={styles.carControlBtnText}>Araç Kontrol Ekranına Git</Text>
            </View>
          </TouchableOpacity>
        )}

        {connectedDevice && !isConnecting && (
          <TouchableOpacity style={styles.communicationBtn} onPress={() => navigation.navigate("Communication")}>
            <View style={styles.communicationBtnContent}>
              <MaterialCommunityIcons name="swap-horizontal" size={28} color="#fff" />
              <Text style={styles.communicationBtnText}>İletişim Ekranına Git</Text>
            </View>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
