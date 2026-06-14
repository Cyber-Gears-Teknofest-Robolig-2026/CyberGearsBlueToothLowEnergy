import {
  Animated,
  PanResponder,
  View,
  useWindowDimensions,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
  Text,
  ScrollView,
  Modal,
  StatusBar,
  ToastAndroid,
  Pressable,
} from "react-native";
import { useState, useRef, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  useSafeAreaInsets,
  SafeAreaView,
  SafeAreaProvider
} from "react-native-safe-area-context";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import styles from './styles';
import { useNavigation } from "@react-navigation/native";
import {
  AppNavigationProp,
  useBluetoothStore,
  ScannedDevice,
} from "../constants";
import {
  requestPermissions,
  ensureEnabled,
  startScan as bleStartScan,
  stopScan as bleStopScan,
  connect,
} from "../BTControlLib";

export default function BluetoothConnectionScreen() {

  const connectedDevice = useBluetoothStore((state) => state.connectedDevice);
  const setConnectedDevice = useBluetoothStore((state) => state.setConnectedDevice);
  const messages = useBluetoothStore((state) => state.messages);
  const setMessages = useBluetoothStore((state) => state.setMessages);
  const manuallyDisconnected = useBluetoothStore((state) => state.manuallyDisconnected);
  const setManuallyDisconnected = useBluetoothStore((state) => state.setManuallyDisconnected);

  const navigation = useNavigation<AppNavigationProp>();

  const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = useWindowDimensions();
  const isLandscape = SCREEN_WIDTH > SCREEN_HEIGHT;
  const insets = useSafeAreaInsets();

  const SNAP_FULL = 0;
  const SNAP_PARTIAL = SCREEN_HEIGHT * 0.35;
  const SNAP_CLOSED = SCREEN_HEIGHT;

  const [devices, setDevices] = useState<ScannedDevice[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastConnectedDevice, setLastConnectedDevice] = useState<ScannedDevice | null>(null);

  const panY = useRef(new Animated.Value(SNAP_CLOSED)).current;
  const currentSnapPoint = useRef(SNAP_CLOSED);
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadLastConnectedDevice();
    return () => stopScan();
  }, []);

  const loadLastConnectedDevice = async () => {
    try {
      const lastDeviceJson = await AsyncStorage.getItem('lastConnectedDevice');
      if (lastDeviceJson) {
        const lastDevice = JSON.parse(lastDeviceJson);
        setLastConnectedDevice(lastDevice);
      }
    } catch (error) {
    }
  };

  const saveLastConnectedDevice = async (device: ScannedDevice) => {
    try {
      await AsyncStorage.setItem('lastConnectedDevice', JSON.stringify(device));
      setLastConnectedDevice(device);
    } catch (error) {
    }
  };

  const stopScan = () => {
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
    bleStopScan();
    setScanning(false);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        const nextValue = currentSnapPoint.current + gestureState.dy;
        if (nextValue >= -20) panY.setValue(nextValue);
      },
      onPanResponderRelease: (_, gestureState) => {
        const movedY = currentSnapPoint.current + gestureState.dy;
        const velocity = gestureState.vy;

        if (velocity > 0.5 || movedY > SCREEN_HEIGHT * 0.3) closeModal();
        else animateToPoint(SNAP_FULL);
      }
    })
  ).current;

  const animateToPoint = (point: number) => {
    Animated.spring(panY, {
      toValue: point,
      useNativeDriver: true,
      tension: 50,
      friction: 10
    }).start(() => currentSnapPoint.current = point);
  };

  const closeModal = () => {
    Animated.timing(panY, {
      toValue: SNAP_CLOSED,
      duration: 250,
      useNativeDriver: true
    }).start(() => {
      setModalVisible(false);
      currentSnapPoint.current = SNAP_CLOSED;
    });
    stopScan();
  };

  const openBluetoothModal = async () => {

    const permitted = await requestPermissions();
    if (!permitted) {
      Alert.alert('Permissions Required', 'Bluetooth permissions are required to scan and connect to devices.');
      return;
    }

    if (!(await ensureEnabled())) {
      Alert.alert('Hata', 'Bu ayara girilebilmesi için Bluetooth açık olmalıdır!');
      return;
    }

    setModalVisible(true);
    animateToPoint(SNAP_FULL);

    setDevices([]);
    setScanning(true);

    // Cihazları tara (eşleşmiş + keşfedilen). Tekilleştirme burada yapılır.
    const found = new Map<string, ScannedDevice>();
    bleStartScan(
      (device) => {
        if (!found.has(device.id)) {
          found.set(device.id, device);
          setDevices(Array.from(found.values()));
        }
      },
      () => {
        stopScan();
        Alert.alert('Hata', 'Cihazlar taranamadı.');
      }
    );

    // 10 sn sonra taramayı durdur.
    scanTimeoutRef.current = setTimeout(stopScan, 10000);
  };

  const connectToDevice = async (device: { id: string }) => {
    if (!(await ensureEnabled())) {
      Alert.alert('Hata', 'Bu cihaza bağlanabilmesi için Bluetooth açık olmalıdır!');
      return;
    }
    try {
      closeModal();
      setIsConnecting(true);
      const connected = await connect(device.id);
      setConnectedDevice(connected);
      setMessages([]);
      saveLastConnectedDevice({ id: device.id, name: connected.name });
      setIsConnecting(false);
    }
    catch (e) {
      setIsConnecting(false);
      Alert.alert("Hata", "Bağlantı kurulamadı.");
    }
  };

  const disconnectDevice = async () => {
    if (connectedDevice) {
      Alert.alert(
        "Bağlantıyı Kes",
        "Bağlantı kesilecek. Emin misiniz?",
        [
          {
            text: "Vazgeç",
            style: "cancel",
          },
          {
            text: "Kes",
            style: "destructive",
            onPress: async () => {
              setManuallyDisconnected(true);
              await connectedDevice.disconnect();
              setConnectedDevice(null);
              setMessages([]);
              ToastAndroid.show("Bağlantı kesildi", ToastAndroid.SHORT);
            },
          },
        ]
      );
    }
  };

  const renderDevice = ({ item }: { item: ScannedDevice }) => {

    const isConnected = connectedDevice?.address === item.id;
    const isPaired = item.bonded;
    const cardStyle = isConnected ? styles.connectedCard : isPaired ? styles.pairedCard : styles.newCard;
    const iconColor = isConnected ? "#fff" : isPaired ? "#0284C7" : "#64748B";

    return (
      <Pressable
        style={({ pressed }) => [
          styles.deviceListItem,
          cardStyle,
          pressed && styles.deviceListItemPressed
        ]}
        onPress={() => isConnected ? disconnectDevice() : connectToDevice(item)}
      >
        <View style={[styles.listIconCircle, isConnected && styles.connectedIconCircle]}>
          <MaterialCommunityIcons name={isConnected ? "bluetooth-connect" : "bluetooth"} size={22} color={iconColor} />
        </View>
        <View style={styles.listTextSection}>
          <Text style={styles.deviceName} numberOfLines={1}>{item.name || "Bilinmeyen Cihaz"}</Text>
          <Text style={styles.deviceAddress}>{item.id}</Text>
          <View style={styles.badgeRow}>
            <View style={[styles.statusBadge, isConnected ? styles.connectedBadge : isPaired ? styles.pairedBadge : styles.newBadge]}>
              <Text style={[styles.statusBadgeText, isConnected ? styles.connectedBadgeText : isPaired ? styles.pairedBadgeText : styles.newBadgeText]}>
                {isConnected ? "BAĞLI" : isPaired ? "EŞLEŞMİŞ" : "YENİ CİHAZ"}
              </Text>
            </View>
          </View>
        </View>
        <MaterialCommunityIcons name={isConnected ? "link-off" : "chevron-right"} size={24} color={isConnected ? "#EF4444" : isPaired ? "#7DD3FC" : "#CBD5E1"} />
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      <View style={styles.headerWithBack}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={26} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bluetooth Yönetimi</Text>
        <TouchableOpacity onPress={() => navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        })} style={styles.homeBtn}>
          <MaterialCommunityIcons name="home" size={24} color="#1E293B" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="bluetooth" size={32} color={isConnecting ? "#F59E0B" : connectedDevice ? "#10B981" : "#EF4444"} />
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
              <Text style={styles.infoText}>{isConnecting ? "Lütfen bekleyin..." : connectedDevice ? connectedDevice.name : "Cihaz seçilmedi"}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.scanBtn} onPress={openBluetoothModal} disabled={isConnecting}>
            <Text style={styles.scanBtnText}>Cihaz Ara ve Bağlan</Text>
          </TouchableOpacity>
          {connectedDevice && !isConnecting && (
            <TouchableOpacity style={styles.disconnectBtn} onPress={disconnectDevice}>
              <Text style={styles.disconnectBtnText}>Bağlantıyı Kes</Text>
            </TouchableOpacity>
          )}
        </View>

        {connectedDevice && !isConnecting && (
          <TouchableOpacity style={styles.carControlBtn} onPress={() => navigation.navigate('CarControl')}>
            <View style={styles.carControlBtnContent}>
              <MaterialCommunityIcons name="car" size={28} color="#854D0E" />
              <Text style={styles.carControlBtnText}>Araç Kontrol Ekranına Git</Text>
            </View>
          </TouchableOpacity>
        )}

        {connectedDevice && !isConnecting && (
          <TouchableOpacity style={styles.communicationBtn} onPress={() => navigation.navigate('Communication')}>
            <View style={styles.communicationBtnContent}>
              <MaterialCommunityIcons name="swap-horizontal" size={28} color="#fff" />
              <Text style={styles.communicationBtnText}>İletişim Ekranına Git</Text>
            </View>
          </TouchableOpacity>
        )}

        {lastConnectedDevice && !connectedDevice && !isConnecting && (
          <TouchableOpacity
            style={styles.lastDeviceCard}
            onPress={() => connectToDevice(lastConnectedDevice)}
            disabled={isConnecting}
          >
            <View style={styles.lastDeviceIconCircle}>
              <MaterialCommunityIcons name="history" size={24} color="#0284C7" />
            </View>
            <View style={styles.lastDeviceTextSection}>
              <Text style={styles.lastDeviceLabel}>Son Bağlanan Cihaz</Text>
              <Text style={styles.lastDeviceName}>{lastConnectedDevice.name || "Bilinmeyen Cihaz"}</Text>
              <Text style={styles.lastDeviceAddress}>{lastConnectedDevice.id}</Text>
            </View>
            {isConnecting ? (
              <ActivityIndicator size="small" color="#0284C7" />
            ) : (
              <MaterialCommunityIcons name="flash" size={24} color="#0284C7" />
            )}
          </TouchableOpacity>
        )}
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="none" statusBarTranslucent onRequestClose={closeModal}>
        {/* Modal ayrı bir pencere olduğundan kök SafeAreaProvider'ın insets'i burada GEÇERLİ DEĞİL
            (left/right 0 gelir). Modal'ın kendi safe area'sını (yatay modda kamera çentiği /
            gesture nav alanı) ölçebilmek için Modal'ın içine yeni bir SafeAreaProvider koyuyoruz. */}
        <SafeAreaProvider>
          <View style={styles.modalOverlay}>
            <Animated.View style={[styles.modalBox, { height: SCREEN_HEIGHT, transform: [{ translateY: panY }] }]}>
              <SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
              <View {...panResponder.panHandlers} style={styles.interactiveHeader}>
                <View style={styles.dragHandle} />
                <View style={styles.modalHeaderContent}>
                  <View style={styles.titleWrapper}>
                    <View style={styles.titleIconCircle}>
                      <MaterialCommunityIcons name="bluetooth" size={20} color="#0984e3" />
                    </View>
                    <Text style={styles.modalTitle}>Bluetooth Cihazları</Text>
                  </View>
                  <TouchableOpacity onPress={closeModal} style={styles.closeCircle}>
                    <MaterialCommunityIcons name="close" size={20} color="#64748B" />
                  </TouchableOpacity>
                </View>
              </View>

              {scanning && (
                <View style={styles.scanningIndicator}>
                  <ActivityIndicator size="small" color="#0984e3" />
                  <Text style={styles.scanningIndicatorText}>Yakındaki cihazlar taranıyor...</Text>
                </View>
              )}

              <FlatList
                data={devices}
                keyExtractor={(item) => item.id}
                renderItem={renderDevice}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.listContentStyle, { paddingBottom: insets.bottom + 35, paddingTop: insets.top - 35 }]}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                ListEmptyComponent={!scanning ? <Text style={styles.emptyStateText}>Cihaz bulunamadı</Text> : null}
              />
              </SafeAreaView>
            </Animated.View>
          </View>
        </SafeAreaProvider>
      </Modal>
    </SafeAreaView>
  );
};