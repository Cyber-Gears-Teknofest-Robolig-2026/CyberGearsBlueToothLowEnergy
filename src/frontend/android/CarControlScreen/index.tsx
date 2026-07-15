import { StatusBar } from 'expo-status-bar';
import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Alert,
  ScrollView,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useNavigation } from '@react-navigation/native';
// Sadece bu ekranda gesture kökü (zipline butonu için). App kökünü değiştirmiyoruz
// ki diğer ekranların safe area'sı etkilenmesin.
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { makeStyles } from './styles';
import { useThemeColors, useEffectiveTheme } from '../theme';
import RCCarTab from './RCCarTab';
import RobotArmTab from './RobotArmTab';
import CodesTab from './CodesTab';
import { AppNavigationProp, useBluetoothStore } from '../constants';


const TAB_ROUTES = [
  { key: 'car', title: 'Araç Kontrol', icon: 'directions-car' },
  { key: 'codes', title: 'Kodlar', icon: 'code' },
  { key: 'arm', title: 'Robot Kol', icon: 'precision-manufacturing' },
] as const;

// Aktif sekmenin kaydırmaya göre belirlenmesinde eşik: bir bölümün üstü, kaydırma
// tepesinin bu kadar altına indiğinde o bölüm "aktif" sayılır.
const ACTIVATION_OFFSET = 110;

// Sekmeye tıklayınca yumuşak kaydırma için easing (yavaş başla → hızlan → yavaşla).
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export default function CarControlScreen() {

  const navigation = useNavigation<AppNavigationProp>();
  const colors = useThemeColors();
  const effectiveTheme = useEffectiveTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const connectedDevice = useBluetoothStore((state) => state.connectedDevice);
  const setConnectedDevice = useBluetoothStore((state) => state.setConnectedDevice);
  const setMessages = useBluetoothStore((state) => state.setMessages);
  const setManuallyDisconnected = useBluetoothStore((state) => state.setManuallyDisconnected);

  const disconnectDevice = () => {
    console.log('[Header] Disconnect button pressed');
    if (!connectedDevice) return;
    Alert.alert(
      'Bağlantıyı Kes',
      'Bağlantı kesilecek. Emin misiniz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Kes',
          style: 'destructive',
          onPress: async () => {
            try {
              setManuallyDisconnected(true);
              await connectedDevice.disconnect();
              setConnectedDevice(null);
              setMessages([]);
              ToastAndroid.show('Bağlantı kesildi', ToastAndroid.SHORT);
            } catch (e) {
              ToastAndroid.show('Bağlantı kesilemedi', ToastAndroid.SHORT);
            }
          },
        },
      ],
    );
  };

  useEffect(() => {
    ScreenOrientation.lockAsync(
      ScreenOrientation.OrientationLock.LANDSCAPE
    );

    return () => {
      ScreenOrientation.unlockAsync();
    };
  }, []);

  // Tek sayfa scroll: bölüm ofsetleri (onLayout ile), kaydırmaya göre aktif sekme.
  const scrollRef = useRef<ScrollView>(null);
  const sectionOffsets = useRef<number[]>([0, 0, 0]);
  const activeTabRef = useRef(0);
  const [activeTab, setActiveTab] = useState(0);
  // Anlık kaydırma konumu + süren yumuşak kaydırma animasyonunun handle'ı.
  const scrollYRef = useRef(0);
  const scrollAnimRef = useRef<number | null>(null);

  const cancelScrollAnim = () => {
    if (scrollAnimRef.current != null) {
      cancelAnimationFrame(scrollAnimRef.current);
      scrollAnimRef.current = null;
    }
  };

  // Bileşen kaldırılırken süren animasyon takılı kalmasın.
  useEffect(() => cancelScrollAnim, []);

  const onSectionLayout = (i: number) => (e: LayoutChangeEvent) => {
    sectionOffsets.current[i] = e.nativeEvent.layout.y;
  };

  // Native smoothScrollTo sabit/kısa süreli olduğundan uzun atlamada sert hissettiriyor.
  // Bunun yerine mesafeyle orantılı süreli, easing'li kendi animasyonumuzu sürüyoruz.
  const scrollToSection = (i: number) => {
    console.log('[Tab] Scroll to section:', TAB_ROUTES[i]?.key);
    const target = Math.max(0, sectionOffsets.current[i] - 4);
    const start = scrollYRef.current;
    const distance = target - start;
    if (Math.abs(distance) < 1) return;
    // Süreyi mesafeyle orantılı ama [320, 650] ms ile sınırlı tut → hep yumuşak his.
    const duration = Math.min(650, Math.max(320, Math.abs(distance) * 0.7));
    const startTime = Date.now();
    cancelScrollAnim();
    const step = () => {
      const t = Math.min(1, (Date.now() - startTime) / duration);
      const y = start + distance * easeInOutCubic(t);
      scrollRef.current?.scrollTo({ y, animated: false });
      scrollAnimRef.current = t < 1 ? requestAnimationFrame(step) : null;
    };
    scrollAnimRef.current = requestAnimationFrame(step);
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
    scrollYRef.current = contentOffset.y;
    const line = contentOffset.y + ACTIVATION_OFFSET;
    let active = 0;
    for (let i = 0; i < sectionOffsets.current.length; i++) {
      if (sectionOffsets.current[i] <= line) active = i;
    }
    // Alta ulaşıldığında son bölüm aktif olsun (kısa son bölüm tepeye gelemeyebilir).
    if (contentOffset.y + layoutMeasurement.height >= contentSize.height - 4) {
      active = sectionOffsets.current.length - 1;
    }
    if (active !== activeTabRef.current) {
      activeTabRef.current = active;
      setActiveTab(active);
    }
  };

  const handleBackPress = () => {
    console.log('[Header] Back button pressed');
    navigation.goBack();
  };

  const handleHomePress = () => {
    console.log('[Header] Home button pressed');
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  };

  const handleSettingsPress = () => {
    console.log('[Header] Settings button pressed');
    navigation.navigate('BluetoothConnection');
  };

  const handleConnectPress = () => {
    console.log('[Header] Connect button pressed');
    navigation.navigate('BluetoothConnection');
  };

  const handleDefaultsPress = () => {
    console.log('[Header] Defaults (Settings) button pressed');
    navigation.navigate('Settings');
  };

  const renderTabBar = () => (
    <View style={styles.tabShell}>
      {TAB_ROUTES.map((route, i) => (
        <TouchableOpacity
          key={route.key}
          activeOpacity={0.85}
          style={[styles.tabButton, activeTab === i && styles.activeTab]}
          onPress={() => scrollToSection(i)}
        >
          <MaterialIcons
            name={route.icon}
            size={22}
            color={activeTab === i ? '#FFFFFF' : colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === i && styles.activeTabText]}>
            {route.title}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
        <StatusBar style={effectiveTheme === 'dark' ? 'light' : 'dark'} />

        <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.container}>
          <View style={styles.headerWithBack}>
            <TouchableOpacity onPress={handleBackPress} style={styles.backBtn}>
              <MaterialCommunityIcons name="arrow-left" size={22} color={colors.textPrimary} />
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              {connectedDevice && (
                <Text
                  style={[styles.headerTitle, { fontSize: 15 }]}
                  numberOfLines={1}
                >
                  {connectedDevice.name || 'Bilinmeyen Cihaz'}
                </Text>
              )}
            </View>

            <View style={styles.headerRight}>
              <View style={styles.connectionBox}>
                <View
                  style={[
                    styles.connectionDot,
                    { backgroundColor: connectedDevice ? '#22C55E' : '#EF4444' },
                  ]}
                />
                <Text style={styles.connectionText}>
                  {connectedDevice ? 'Çevrimiçi' : 'Çevrimdışı'}
                </Text>
              </View>

              <TouchableOpacity
                onPress={handleHomePress}
                style={styles.homeBtn}
              >
                <MaterialCommunityIcons name="home" size={22} color={colors.textPrimary} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSettingsPress}
                style={styles.homeBtn}
              >
                <MaterialCommunityIcons name="cog" size={22} color={colors.textPrimary} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleDefaultsPress}
                style={styles.homeBtn}
              >
                <MaterialCommunityIcons name="tune-variant" size={22} color={colors.textPrimary} />
              </TouchableOpacity>

              {connectedDevice ? (
                <TouchableOpacity onPress={disconnectDevice} style={styles.homeBtn}>
                  <MaterialCommunityIcons
                    name="bluetooth-off"
                    size={22}
                    color="#EF4444"
                  />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={handleConnectPress}
                  style={styles.homeBtn}
                >
                  <MaterialCommunityIcons
                    name="bluetooth-connect"
                    size={22}
                    color="#22C55E"
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {renderTabBar()}

          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={styles.singlePageContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            scrollEventThrottle={16}
            onScroll={onScroll}
            onScrollBeginDrag={cancelScrollAnim}
          >
            <View onLayout={onSectionLayout(0)}>
              <RCCarTab disableScroll />
            </View>
            <View onLayout={onSectionLayout(1)}>
              <CodesTab disableScroll />
            </View>
            <View onLayout={onSectionLayout(2)}>
              <RobotArmTab disableScroll />
            </View>
          </ScrollView>
        </View>
        </GestureHandlerRootView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
