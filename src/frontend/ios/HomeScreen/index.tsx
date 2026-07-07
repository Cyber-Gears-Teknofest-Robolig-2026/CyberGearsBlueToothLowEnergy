import {
  StatusBar,
  View,
  Text,
  ScrollView,
  TouchableOpacity
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import styles from "./styles";
import { useNavigation } from "@react-navigation/native";
import { AppNavigationProp } from "../constants";
import {
  ThemeMode,
  useEffectiveTheme,
  useThemeColors,
  useThemeStore,
} from "../theme";

type MenuButtonProps = {
  title: string;
  description: string;
  icon: string;
  iconColor: string;
  iconBg: string;
  route: "BluetoothConnection" | "Communication" | "CarControl" | "Settings";
};

const MenuButton = ({
  title,
  description,
  icon,
  iconColor,
  iconBg,
  route,
}: MenuButtonProps) => {
  const navigation = useNavigation<AppNavigationProp>();
  const colors = useThemeColors();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[
        styles.menuCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
      onPress={() => navigation.navigate(route)}
    >
      <View style={[styles.menuIconCircle, { backgroundColor: iconBg }]}>
        <MaterialCommunityIcons name={icon} size={30} color={iconColor} />
      </View>
      <View style={styles.menuTextContent}>
        <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>
          {title}
        </Text>
        <Text style={[styles.menuDesc, { color: colors.textSecondary }]}>
          {description}
        </Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textMuted} />
    </TouchableOpacity>
  );
};

type ThemeButtonProps = {
  mode: ThemeMode;
  icon: string;
  accessibilityLabel: string;
};

const ThemeButton = ({ mode, icon, accessibilityLabel }: ThemeButtonProps) => {
  const colors = useThemeColors();
  const selectedMode = useThemeStore((state) => state.mode);
  const isSelected = selectedMode === mode;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => useThemeStore.getState().setMode(mode)}
      style={[
        styles.themeButton,
        {
          backgroundColor: isSelected ? colors.primarySoft : colors.surface,
          borderColor: isSelected ? colors.primary : colors.border,
        },
      ]}
    >
      <MaterialCommunityIcons
        name={icon}
        size={19}
        color={isSelected ? colors.primary : colors.textSecondary}
      />
    </TouchableOpacity>
  );
};

export default function HomeScreen() {
  const colors = useThemeColors();
  const effectiveTheme = useEffectiveTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={[
      "top",
      "left",
      "right",
      "bottom"
    ]}>
      <StatusBar
        barStyle={effectiveTheme === "dark" ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      <View style={[styles.mainHeader, { paddingHorizontal: 25 }]}>
        <View style={styles.headerTopRow}>
          <View style={styles.themeButtonRow}>
            <ThemeButton
              mode="light"
              icon="white-balance-sunny"
              accessibilityLabel="Açık temayı seç"
            />
            <ThemeButton
              mode="dark"
              icon="weather-night"
              accessibilityLabel="Karanlık temayı seç"
            />
            <ThemeButton
              mode="system"
              icon="theme-light-dark"
              accessibilityLabel="Otomatik temayı seç"
            />
          </View>
          <View style={styles.headerTextBox}>
            <Text style={[styles.mainHeaderText, { color: colors.textPrimary }]}>
              Cyber Gears BlueTooth Low Energy
            </Text>
            <Text style={[styles.subHeaderText, { color: colors.textSecondary }]}>
              Lütfen bir işlem seçin
            </Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <MenuButton
          route="BluetoothConnection"
          title="Bluetooth Bağlantısı"
          description="Cihazları tara, eşleş ve yönet"
          icon="bluetooth"
          iconColor="#0284C7"
          iconBg="#E0F2FE"
        />
        <MenuButton
          route="CarControl"
          title="Araç Kontrol"
          description="Bağlı cihaz ile araç kontrolü yap"
          icon="car"
          iconColor="#854D0E"
          iconBg="#FDE68A"
        />
        <MenuButton
          route="Communication"
          title="Cihaz İletişimi"
          description="Bağlı cihaz ile veri alışverişi yap"
          icon="swap-horizontal"
          iconColor="#15803D"
          iconBg="#DCFCE7"
        />
        <MenuButton
          route="Settings"
          title="Ayarlar"
          description="Gönderim başlıkları ve varsayılan değerleri düzenle"
          icon="cog"
          iconColor="#6D28D9"
          iconBg="#EDE9FE"
        />
      </ScrollView>

    </SafeAreaView>
  );
};
