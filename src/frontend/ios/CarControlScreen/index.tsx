import { StatusBar } from 'expo-status-bar';
import { useState, useEffect, useMemo } from 'react';
import {
  Alert,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useNavigation } from '@react-navigation/native';
import { TabView, SceneMap } from 'react-native-tab-view';
// Sadece bu ekranda gesture kökü (zipline butonu için). App kökünü değiştirmiyoruz
// ki diğer ekranların safe area'sı etkilenmesin.
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { makeStyles } from './styles';
import { useThemeColors, useEffectiveTheme } from '../theme';
import RCCarTab from './RCCarTab';
import RobotArmTab from './RobotArmTab';
import { AppNavigationProp, useBluetoothStore } from '../constants';


const TAB_ROUTES = [
  { key: 'car', title: 'Araç Kontrol' },
  { key: 'arm', title: 'Robot Kol' },
];

const renderScene = SceneMap({
  car: RCCarTab,
  arm: RobotArmTab,
});

export default function CarControlScreen() {

  const navigation = useNavigation<AppNavigationProp>();
  const layout = useWindowDimensions();
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
              Alert.alert("Bilgi", "Bağlantı kesildi");
            } catch (e) {
              Alert.alert("Hata", "Bağlantı kesilemedi");
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

  const [index, setIndex] = useState(0);

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

  const handleTabChange = (newIndex: number) => {
    console.log('[Tab] Changed to:', TAB_ROUTES[newIndex]?.key, '(index:', newIndex + ')');
    setIndex(newIndex);
  };

  const renderTabBar = () => (
    <View style={styles.tabShell}>
      <TouchableOpacity
        activeOpacity={0.85}
        style={[styles.tabButton, index === 0 && styles.activeTab]}
        onPress={() => handleTabChange(0)}
      >
        <MaterialIcons
          name="directions-car"
          size={22}
          color={index === 0 ? '#FFFFFF' : colors.textSecondary}
        />
        <Text style={[styles.tabText, index === 0 && styles.activeTabText]}>
          {TAB_ROUTES[0].title}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.85}
        style={[styles.tabButton, index === 1 && styles.activeTab]}
        onPress={() => handleTabChange(1)}
      >
        <MaterialIcons
          name="precision-manufacturing"
          size={22}
          color={index === 1 ? '#FFFFFF' : colors.textSecondary}
        />
        <Text style={[styles.tabText, index === 1 && styles.activeTabText]}>
          {TAB_ROUTES[1].title}
        </Text>
      </TouchableOpacity>
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

          <TabView
            navigationState={{ index, routes: TAB_ROUTES }}
            renderScene={renderScene}
            onIndexChange={handleTabChange}
            initialLayout={{ width: layout.width }}
            renderTabBar={renderTabBar}
            swipeEnabled={false}
          />
        </View>
        </GestureHandlerRootView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
