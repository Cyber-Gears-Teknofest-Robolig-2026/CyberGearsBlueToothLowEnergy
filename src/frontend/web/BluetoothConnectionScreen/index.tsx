import { useState, useRef, useMemo } from "react";
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
import { makeStyles } from "./styles";
import { useThemeColors, useEffectiveTheme } from "../theme";
import { useNavigation } from "@react-navigation/native";
import {
  AppNavigationProp,
  useBluetoothStore,
} from "../constants";
import { useBluetooth } from "../BluetoothContext";

/**
 * Web Serial neden kullanılamıyor? Tek "desteklenmiyor" mesajı yerine kullanıcıya
 * çözülebilir bir sebep gösterir. ÖNEMLİ: Web Serial yalnızca GÜVENLİ BAĞLAMDA
 * (https veya http://localhost) çalışır; LAN IP'si (192.168.x.x) ile açılırsa
 * `navigator.serial` hiç var olmaz. Bu yüzden önce güvenli bağlamı kontrol ederiz.
 */
type SerialStatus =
  | { ok: true }
  | { ok: false; message: string };

const INSECURE_MSG =
  "Web Serial yalnızca güvenli bağlamda çalışır. Uygulamayı http://localhost:8081 adresinden açın — IP adresi (örn. 192.168.x.x) ile Bluetooth bağlantısı kurulamaz.";
const UNSUPPORTED_MSG =
  "Tarayıcınız Web Serial API desteklemiyor. Masaüstü Chrome veya Edge kullanın (Brave'de varsayılan olarak kapalıdır).";

function getSerialStatus(): SerialStatus {
  if (typeof window !== "undefined" && window.isSecureContext === false) {
    return { ok: false, message: INSECURE_MSG };
  }
  if (typeof navigator === "undefined" || !("serial" in navigator)) {
    return { ok: false, message: UNSUPPORTED_MSG };
  }
  return { ok: true };
}

export default function BluetoothConnectionScreen() {

  const connectedDevice = useBluetoothStore((state) => state.connectedDevice);
  const setConnectedDevice = useBluetoothStore((state) => state.setConnectedDevice);
  const setMessages = useBluetoothStore((state) => state.setMessages);
  const setManuallyDisconnected = useBluetoothStore((state) => state.setManuallyDisconnected);

  const navigation = useNavigation<AppNavigationProp>();
  const bluetooth = useBluetooth();
  const colors = useThemeColors();
  const effectiveTheme = useEffectiveTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [isConnecting, setIsConnecting] = useState(false);
  const connectionCancelledRef = useRef(false);
  // Web Serial durumu: bloklayan popup yerine ekran içinde sebep gösterilir.
  const [serialStatus] = useState<SerialStatus>(() => getSerialStatus());

  const selectAndConnect = async () => {
    if (!serialStatus.ok) {
      window.alert(serialStatus.message);
      return;
    }
    try {
      connectionCancelledRef.current = false;
      setIsConnecting(true);

      const device = await bluetooth.connect();
      if (connectionCancelledRef.current) {
        setManuallyDisconnected(true);
        await device.disconnect();
        return;
      }
      setManuallyDisconnected(false);
      setConnectedDevice(device);
      setMessages([]);
    } catch (e: any) {
      const cancelled = e?.name === "NotFoundError" || e?.name === "AbortError";
      if (!cancelled && !connectionCancelledRef.current) {
        window.alert(`Bağlantı kurulamadı: ${e?.message ?? "Bilinmeyen hata"}`);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const cancelConnection = () => {
    connectionCancelledRef.current = true;
    setIsConnecting(false);
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
      <StatusBar barStyle={effectiveTheme === "dark" ? "light-content" : "dark-content"} backgroundColor={colors.background} />

      <View style={styles.headerWithBack}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={26} color={colors.textPrimary} />
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
          <MaterialCommunityIcons name="home" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons
              name="bluetooth"
              size={32}
              color={isConnecting ? colors.warning : connectedDevice ? colors.success : colors.danger}
            />
            <View style={{ flex: 1 }}>
              <View style={styles.statusLabelRow}>
                <Text style={styles.label}>BAĞLANTI DURUMU</Text>
                {isConnecting ? (
                  <TouchableOpacity
                    style={styles.connectingBadge}
                    onPress={cancelConnection}
                    activeOpacity={0.7}
                  >
                    <ActivityIndicator size="small" color={colors.warning} style={styles.smallSpinner} />
                    <Text style={styles.connectingText}>Bağlanıyor...</Text>
                    <MaterialCommunityIcons name="close-circle" size={14} color="#D97706" />
                  </TouchableOpacity>
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
          {!serialStatus.ok && (
            <View style={styles.warningBanner}>
              <MaterialCommunityIcons name="alert-circle-outline" size={20} color={colors.warning} />
              <Text style={styles.warningBannerText}>{serialStatus.message}</Text>
            </View>
          )}
          <TouchableOpacity
            style={[
              styles.scanBtn,
              { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
              !serialStatus.ok && styles.scanBtnDisabled,
            ]}
            onPress={selectAndConnect}
            disabled={isConnecting || !serialStatus.ok}
          >
            {isConnecting && <ActivityIndicator size="small" color="#fff" />}
            <Text style={styles.scanBtnText}>
              {isConnecting ? "Bağlanıyor..." : "Cihaz Seç ve Bağlan"}
            </Text>
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
