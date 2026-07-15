import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState, useMemo } from 'react';
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import CustomSlider from '../CustomComponents/CustomSlider';
import RangeSlider from '../CustomComponents/RangeSlider';
import ToggleSwitch from '../CustomComponents/ToggleSwitch';
import { makeStyles } from './styles';
import { useThemeColors, useEffectiveTheme } from '../theme';
import {
  ARM_360_SPEED_MAX,
  AppNavigationProp,
  AppSettings,
  SendValuesHeaders,
  clampPwmResolution,
  defaultSettings,
  pwmMaxFromResolution,
  useSettingsStore,
} from '../constants';

// Form için number alanları string olarak tutulur ki düzenlerken boş bırakılabilsin.
type DraftSettings = {
  sendValuesHeaders: SendValuesHeaders;
  allSendsValues: AppSettings['allSendsValues'];
  motorControlSeparateDefault: boolean;
  motorPwmResolutionDefault: string;
  motorSpeedDefault: string;
  motorSpeedStepDefault: string;
  motorSpeedLimitDefault: { min: string; max: string };
  rightMotorPwmResolutionDefault: string;
  rightMotorSpeedDefault: string;
  rightMotorSpeedStepDefault: string;
  rightMotorSpeedLimitDefault: { min: string; max: string };
  leftMotorPwmResolutionDefault: string;
  leftMotorSpeedDefault: string;
  leftMotorSpeedStepDefault: string;
  leftMotorSpeedLimitDefault: { min: string; max: string };
  armsAre360Default: boolean[];
  armDirectionReversedDefault: boolean[];
  armValuesDefault: { deg180: string; deg360: string }[];
  armAngleLimitsDefault: { min: string; max: string }[];
  armSpeedLimitsDefault: { min: string; max: string }[];
  armValuesStepDefault: string;
  ziplineAnglesDefault: {
    front: { open: string; close: string };
    back: { open: string; close: string };
  };
};

// Motor hız bölümlerinin (ortak / sağ / sol) draft alan anahtarları.
type ResKey = 'motorPwmResolutionDefault' | 'rightMotorPwmResolutionDefault' | 'leftMotorPwmResolutionDefault';
type SpeedKey = 'motorSpeedDefault' | 'rightMotorSpeedDefault' | 'leftMotorSpeedDefault';
type StepKey = 'motorSpeedStepDefault' | 'rightMotorSpeedStepDefault' | 'leftMotorSpeedStepDefault';
type SpeedLimitKey = 'motorSpeedLimitDefault' | 'rightMotorSpeedLimitDefault' | 'leftMotorSpeedLimitDefault';

const toDraft = (s: AppSettings): DraftSettings => ({
  sendValuesHeaders: {
    motor: { ...s.sendValuesHeaders.motor },
    robot_arm: { ...s.sendValuesHeaders.robot_arm },
    zipline: { ...s.sendValuesHeaders.zipline },
    code: { ...(s.sendValuesHeaders.code ?? defaultSettings.sendValuesHeaders.code) },
  },
  allSendsValues: { ...s.allSendsValues },
  motorControlSeparateDefault: s.motorControlSeparateDefault,
  motorPwmResolutionDefault: String(s.motorPwmResolutionDefault),
  motorSpeedDefault: String(s.motorSpeedDefault),
  motorSpeedStepDefault: String(s.motorSpeedStepDefault),
  motorSpeedLimitDefault: { min: String(s.motorSpeedLimitDefault.min), max: String(s.motorSpeedLimitDefault.max) },
  rightMotorPwmResolutionDefault: String(s.rightMotorPwmResolutionDefault),
  rightMotorSpeedDefault: String(s.rightMotorSpeedDefault),
  rightMotorSpeedStepDefault: String(s.rightMotorSpeedStepDefault),
  rightMotorSpeedLimitDefault: { min: String(s.rightMotorSpeedLimitDefault.min), max: String(s.rightMotorSpeedLimitDefault.max) },
  leftMotorPwmResolutionDefault: String(s.leftMotorPwmResolutionDefault),
  leftMotorSpeedDefault: String(s.leftMotorSpeedDefault),
  leftMotorSpeedStepDefault: String(s.leftMotorSpeedStepDefault),
  leftMotorSpeedLimitDefault: { min: String(s.leftMotorSpeedLimitDefault.min), max: String(s.leftMotorSpeedLimitDefault.max) },
  armsAre360Default: [...s.armsAre360Default],
  armDirectionReversedDefault: [...s.armDirectionReversedDefault],
  armValuesDefault: s.armValuesDefault.map((v) => ({ deg180: String(v.deg180), deg360: String(v.deg360) })),
  armAngleLimitsDefault: s.armAngleLimitsDefault.map((l) => ({ min: String(l.min), max: String(l.max) })),
  armSpeedLimitsDefault: s.armSpeedLimitsDefault.map((l) => ({ min: String(l.min), max: String(l.max) })),
  armValuesStepDefault: String(s.armValuesStepDefault),
  ziplineAnglesDefault: {
    front: {
      open: String(s.ziplineAnglesDefault.front.open),
      close: String(s.ziplineAnglesDefault.front.close),
    },
    back: {
      open: String(s.ziplineAnglesDefault.back.open),
      close: String(s.ziplineAnglesDefault.back.close),
    },
  },
});

const num = (value: string): number => {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

// Robot kol kartlarındaki renklerle aynı (araç kontrol ekranıyla uyum için).
const ARM_COLORS = ['#6366F1', '#0EA5E9', '#14B8A6', '#22C55E', '#F59E0B', '#EF4444'];

// Aralık slider tutamakları: kolun renginin daha koyu tonu — aynı renk ailesinden
// ama dolu kısımdan belirgin şekilde farklı hissettirir.
const darkenHex = (hex: string, factor = 0.6): string => {
  const m = hex.replace('#', '');
  const ch = (i: number) =>
    Math.round(parseInt(m.slice(i, i + 2), 16) * factor).toString(16).padStart(2, '0');
  return `#${ch(0)}${ch(2)}${ch(4)}`;
};
const ARM_THUMB_COLORS = ARM_COLORS.map((c) => darkenHex(c));

// Zipline açık/kapalı slider renkleri (ön ve arka aynı renkleri paylaşır).
// ARM_COLORS paletiyle bilerek çakışmayan renkler seçildi.
const ZIPLINE_OPEN_COLOR = '#DB2777';
const ZIPLINE_CLOSE_COLOR = '#475569';

// min<max güvenceli, [0, ceil] aralığına kıstırılmış sınır üretir (eşitse 1 birim açar).
const normalizeLimit = (minStr: string, maxStr: string, ceil: number): { min: number; max: number } => {
  let mn = clamp(num(minStr), 0, ceil);
  let mx = clamp(num(maxStr), 0, ceil);
  if (mn > mx) { const t = mn; mn = mx; mx = t; }
  if (mn === mx) { if (mx < ceil) mx = mn + 1; else mn = Math.max(0, mx - 1); }
  return { min: mn, max: mx };
};

const fromDraft = (d: DraftSettings): AppSettings => {
  const motorRes = clampPwmResolution(num(d.motorPwmResolutionDefault));
  const rightRes = clampPwmResolution(num(d.rightMotorPwmResolutionDefault));
  const leftRes = clampPwmResolution(num(d.leftMotorPwmResolutionDefault));
  // Motor hız sınırları, kendi çözünürlüğünün üst sınırına (2^res-1) göre normalize edilir.
  const motorLimit = normalizeLimit(d.motorSpeedLimitDefault.min, d.motorSpeedLimitDefault.max, pwmMaxFromResolution(motorRes));
  const rightLimit = normalizeLimit(d.rightMotorSpeedLimitDefault.min, d.rightMotorSpeedLimitDefault.max, pwmMaxFromResolution(rightRes));
  const leftLimit = normalizeLimit(d.leftMotorSpeedLimitDefault.min, d.leftMotorSpeedLimitDefault.max, pwmMaxFromResolution(leftRes));
  return {
    sendValuesHeaders: d.sendValuesHeaders,
    allSendsValues: d.allSendsValues,
    motorControlSeparateDefault: d.motorControlSeparateDefault,
    motorPwmResolutionDefault: motorRes,
    // Varsayılan hızı kendi [min, max] aralığına kıstırarak kaydet.
    motorSpeedDefault: clamp(num(d.motorSpeedDefault), motorLimit.min, motorLimit.max),
    motorSpeedStepDefault: num(d.motorSpeedStepDefault),
    motorSpeedLimitDefault: motorLimit,
    rightMotorPwmResolutionDefault: rightRes,
    rightMotorSpeedDefault: clamp(num(d.rightMotorSpeedDefault), rightLimit.min, rightLimit.max),
    rightMotorSpeedStepDefault: num(d.rightMotorSpeedStepDefault),
    rightMotorSpeedLimitDefault: rightLimit,
    leftMotorPwmResolutionDefault: leftRes,
    leftMotorSpeedDefault: clamp(num(d.leftMotorSpeedDefault), leftLimit.min, leftLimit.max),
    leftMotorSpeedStepDefault: num(d.leftMotorSpeedStepDefault),
    leftMotorSpeedLimitDefault: leftLimit,
    armsAre360Default: d.armsAre360Default,
    armDirectionReversedDefault: d.armDirectionReversedDefault,
    // Varsayılan açıyı (deg180) açı sınırına, varsayılan hızı (deg360) hız sınırına kıstır.
    armValuesDefault: d.armValuesDefault.map((v, i) => {
      const aLo = Math.min(num(d.armAngleLimitsDefault[i].min), num(d.armAngleLimitsDefault[i].max));
      const aHi = Math.max(num(d.armAngleLimitsDefault[i].min), num(d.armAngleLimitsDefault[i].max));
      const sLo = Math.min(num(d.armSpeedLimitsDefault[i].min), num(d.armSpeedLimitsDefault[i].max));
      const sHi = Math.max(num(d.armSpeedLimitsDefault[i].min), num(d.armSpeedLimitsDefault[i].max));
      return { deg180: clamp(num(v.deg180), aLo, aHi), deg360: clamp(num(v.deg360), sLo, sHi) };
    }),
    armAngleLimitsDefault: d.armAngleLimitsDefault.map((l) => normalizeLimit(l.min, l.max, 180)),
    armSpeedLimitsDefault: d.armSpeedLimitsDefault.map((l) => normalizeLimit(l.min, l.max, ARM_360_SPEED_MAX)),
    armValuesStepDefault: num(d.armValuesStepDefault),
    ziplineAnglesDefault: {
      front: { open: num(d.ziplineAnglesDefault.front.open), close: num(d.ziplineAnglesDefault.front.close) },
      back: { open: num(d.ziplineAnglesDefault.back.open), close: num(d.ziplineAnglesDefault.back.close) },
    },
  };
};

type CardProps = {
  title: string;
  icon: string;
  iconColor: string;
  iconBg: string;
  children: React.ReactNode;
};

const Card = ({ title, icon, iconColor, iconBg, children }: CardProps) => {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <View style={[styles.cardIconBox, { backgroundColor: iconBg }]}>
        <MaterialCommunityIcons name={icon} size={20} color={iconColor} />
      </View>
      <Text style={styles.cardTitle}>{title}</Text>
    </View>
    {children}
  </View>
  );
};

const TextRow = ({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
}) => {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <TextInput
      style={styles.textInput}
      value={value}
      onChangeText={onChangeText}
      autoCapitalize="characters"
      autoCorrect={false}
      maxLength={8}
      selectTextOnFocus
    />
  </View>
  );
};

const NumberRow = ({
  label,
  value,
  onChangeText,
  maxLength = 4,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  maxLength?: number;
}) => {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <TextInput
      style={styles.numberInput}
      value={value}
      onChangeText={(text) => onChangeText(text.replace(/[^0-9]/g, ''))}
      keyboardType="numeric"
      maxLength={maxLength}
      selectTextOnFocus
    />
  </View>
  );
};

const SwitchRow = ({
  label,
  value,
  onValueChange,
  onText,
  offText,
  compact = false,
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  // Switch'in o anki değerine göre yazılacak durum etiketi (örn. Açık/Kapalı, Düz/Ters).
  onText?: string;
  offText?: string;
  // compact: etiket + durum + toggle'ı yan yana sıkı grupla (iki anahtarı bir satırda yan
  // yana göstermek için). Aksi halde tam genişlik (etiket solda, durum+toggle sağda).
  compact?: boolean;
}) => {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  // Başlık (koyu/textPrimary) ile değer ayrı renklerde olsun: açık → primary,
  // kapalı → textSecondary (başlıktan belirgin biçimde açık ama soluk değil).
  const stateText =
    onText != null || offText != null ? (
      <Text style={[styles.switchStateText, { color: value ? colors.primary : colors.textSecondary }]}>
        {value ? onText : offText}
      </Text>
    ) : null;

  if (compact) {
    return (
      <View style={styles.switchCompact}>
        <Text style={[styles.switchCompactLabel, { color: colors.textPrimary }]}>{label}</Text>
        {stateText}
        <ToggleSwitch value={value} onValueChange={onValueChange} />
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{label}</Text>
      <View style={styles.switchRight}>
        {stateText}
        <ToggleSwitch value={value} onValueChange={onValueChange} />
      </View>
    </View>
  );
};

// Araç kontrol ekranındaki "Ortak / Ayrı ayrı" anahtarının ayarlardaki eşi:
// duruma göre renklenen etiket + özel toggle.
const MotorModeRow = ({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) => {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
  <View style={styles.row}>
    <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{label}</Text>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Text style={{ fontSize: 13, fontWeight: '700', color: value ? colors.primary : colors.textSecondary }}>
        {value ? 'Ayrı ayrı' : 'Ortak'}
      </Text>
      <ToggleSwitch value={value} onValueChange={onValueChange} />
    </View>
  </View>
  );
};

// Araç kontrol ekranındaki slider mantığı: −/+ butonu + slider + senkron sayı girişi.
// Değer string tutulur (alan düzenlenirken boş bırakılabilsin); slider için sayıya çevrilir.
const SliderField = ({
  label,
  value,
  min,
  max,
  step = 5,
  color = '#0A84FF',
  maxLength = 3,
  onChange,
}: {
  label: string;
  value: string;
  min: number;
  max: number;
  step?: number;
  color?: string;
  maxLength?: number;
  onChange: (text: string) => void;
}) => {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const numeric = clamp(num(value), min, max);

  return (
    <View style={styles.sliderField}>
      <View style={styles.sliderTopRow}>
        <Text style={styles.rowLabel}>{label}</Text>
        <TextInput
          style={styles.numberInput}
          value={value}
          onChangeText={(text) => onChange(text.replace(/[^0-9]/g, ''))}
          keyboardType="numeric"
          maxLength={maxLength}
          selectTextOnFocus
        />
      </View>

      <View style={styles.sliderControlRow}>
        <TouchableOpacity
          style={[styles.sliderStepBtn, { backgroundColor: color }]}
          activeOpacity={0.8}
          onPress={() => onChange(String(clamp(numeric - step, min, max)))}
        >
          <MaterialCommunityIcons name="minus" size={18} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.sliderBox}>
          <CustomSlider
            value={numeric}
            minimumValue={min}
            maximumValue={max}
            step={1}
            onValueChange={(v) => onChange(String(v))}
            trackThickness={7}
            thumbSize={20}
            trackColor="#E2E8F0"
            fillColor={color}
            thumbColor={color}
          />
        </View>

        <TouchableOpacity
          style={[styles.sliderStepBtn, { backgroundColor: color }]}
          activeOpacity={0.8}
          onPress={() => onChange(String(clamp(numeric + step, min, max)))}
        >
          <MaterialCommunityIcons name="plus" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function SettingsScreen() {
  const navigation = useNavigation<AppNavigationProp>();
  const colors = useThemeColors();
  const effectiveTheme = useEffectiveTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const setSettings = useSettingsStore((state) => state.setSettings);
  const resetSettings = useSettingsStore((state) => state.resetSettings);

  // Store hydrate edilmiş halde (App.tsx gate'liyor) → mevcut kayıtlı değerlerle başla.
  const [draft, setDraft] = useState<DraftSettings>(() => toDraft(useSettingsStore.getState()));

  const setMotorHeader = (key: keyof SendValuesHeaders['motor'], value: string) =>
    setDraft((d) => ({
      ...d,
      sendValuesHeaders: { ...d.sendValuesHeaders, motor: { ...d.sendValuesHeaders.motor, [key]: value } },
    }));

  const setArmHeader = (key: keyof SendValuesHeaders['robot_arm'], value: string) =>
    setDraft((d) => ({
      ...d,
      sendValuesHeaders: { ...d.sendValuesHeaders, robot_arm: { ...d.sendValuesHeaders.robot_arm, [key]: value } },
    }));

  const setZiplineHeader = (key: keyof SendValuesHeaders['zipline'], value: string) =>
    setDraft((d) => ({
      ...d,
      sendValuesHeaders: { ...d.sendValuesHeaders, zipline: { ...d.sendValuesHeaders.zipline, [key]: value } },
    }));

  const setCodeHeader = (key: keyof SendValuesHeaders['code'], value: string) =>
    setDraft((d) => ({
      ...d,
      sendValuesHeaders: { ...d.sendValuesHeaders, code: { ...d.sendValuesHeaders.code, [key]: value } },
    }));

  const setAllSends = (key: keyof DraftSettings['allSendsValues'], value: boolean) =>
    setDraft((d) => ({ ...d, allSendsValues: { ...d.allSendsValues, [key]: value } }));

  const setArm360 = (index: number, value: boolean) =>
    setDraft((d) => ({
      ...d,
      armsAre360Default: d.armsAre360Default.map((v, i) => (i === index ? value : v)),
    }));

  const setArmReversed = (index: number, value: boolean) =>
    setDraft((d) => ({
      ...d,
      armDirectionReversedDefault: d.armDirectionReversedDefault.map((v, i) => (i === index ? value : v)),
    }));

  // Slider, kolun o anki moduna (180°/360°) ait varsayılanı düzenler; diğer mod korunur.
  // Değer, o modun [min, max] aralığına kıstırılır (180° açı sınırı / 360° hız sınırı).
  const setArmDefault = (index: number, value: string) =>
    setDraft((d) => {
      const is360 = d.armsAre360Default[index];
      let next = value;
      if (value !== '') {
        const lim = is360 ? d.armSpeedLimitsDefault[index] : d.armAngleLimitsDefault[index];
        const lo = Math.min(num(lim.min), num(lim.max));
        const hi = Math.max(num(lim.min), num(lim.max));
        next = String(clamp(num(value), lo, hi));
      }
      const key = is360 ? 'deg360' : 'deg180';
      return {
        ...d,
        armValuesDefault: d.armValuesDefault.map((v, i) => (i === index ? { ...v, [key]: next } : v)),
      };
    });

  // 180° modunda kolun açı aralığını (iki tutamaklı slider) düzenler ve varsayılan
  // açıyı (deg180) otomatik olarak yeni aralığın tam sayı orta noktasına ayarlar.
  // RangeSlider min < max'ı garanti eder (minGap).
  const setArmAngleRange = (index: number, min: number, max: number) =>
    setDraft((d) => {
      const lo = Math.min(min, max);
      const hi = Math.max(min, max);
      const midpoint = Math.round((lo + hi) / 2);
      return {
        ...d,
        armAngleLimitsDefault: d.armAngleLimitsDefault.map((l, i) =>
          i === index ? { min: String(lo), max: String(hi) } : l,
        ),
        armValuesDefault: d.armValuesDefault.map((v, i) =>
          i === index ? { ...v, deg180: String(midpoint) } : v,
        ),
      };
    });

  // Aralık text input'ları: yazarken serbest (boş bırakılabilir). Yazarken varsayılan
  // açı slider'ı + text input'u da canlı güncellenir (güncel aralığın orta noktasına
  // çekilir). Tam normalize/kıstırma (0–180, min<max) blur'da yapılır.
  const setArmLimitText = (index: number, edge: 'min' | 'max', value: string) =>
    setDraft((d) => {
      const cleaned = value.replace(/[^0-9]/g, '');
      const limits = d.armAngleLimitsDefault.map((l, i) =>
        i === index ? { ...l, [edge]: cleaned } : l,
      );
      const lo = Math.min(num(limits[index].min), num(limits[index].max));
      const hi = Math.max(num(limits[index].min), num(limits[index].max));
      const midpoint = Math.round((lo + hi) / 2);
      return {
        ...d,
        armAngleLimitsDefault: limits,
        armValuesDefault: d.armValuesDefault.map((v, i) =>
          i === index ? { ...v, deg180: String(midpoint) } : v,
        ),
      };
    });

  // Text input'tan çıkınca normalize: 0–180'e kıstır, min < max güvencesi (düzenlenen
  // alanı diğerine göre), varsayılan açıyı yeni aralığın orta noktasına çek.
  const normalizeArmLimit = (index: number, edge: 'min' | 'max') =>
    setDraft((d) => {
      const lim = d.armAngleLimitsDefault[index];
      let mn = clamp(num(lim.min), 0, 180);
      let mx = clamp(num(lim.max), 0, 180);
      if (mn >= mx) {
        if (edge === 'min') {
          mn = mx - 1;
          if (mn < 0) { mn = 0; mx = 1; }
        } else {
          mx = mn + 1;
          if (mx > 180) { mx = 180; mn = 179; }
        }
      }
      const midpoint = Math.round((mn + mx) / 2);
      return {
        ...d,
        armAngleLimitsDefault: d.armAngleLimitsDefault.map((l, i) =>
          i === index ? { min: String(mn), max: String(mx) } : l,
        ),
        armValuesDefault: d.armValuesDefault.map((v, i) =>
          i === index ? { ...v, deg180: String(midpoint) } : v,
        ),
      };
    });

  // --- 360° servo hız aralığı (açı aralığının hız karşılığı; iz 0–90) ----------
  // Aralık değişince varsayılan hızı (deg360) yeni aralığın orta noktasına çeker.
  const setArmSpeedRange = (index: number, min: number, max: number) =>
    setDraft((d) => {
      const lo = Math.min(min, max);
      const hi = Math.max(min, max);
      const midpoint = Math.round((lo + hi) / 2);
      return {
        ...d,
        armSpeedLimitsDefault: d.armSpeedLimitsDefault.map((l, i) =>
          i === index ? { min: String(lo), max: String(hi) } : l,
        ),
        armValuesDefault: d.armValuesDefault.map((v, i) =>
          i === index ? { ...v, deg360: String(midpoint) } : v,
        ),
      };
    });

  const setArmSpeedLimitText = (index: number, edge: 'min' | 'max', value: string) =>
    setDraft((d) => {
      const cleaned = value.replace(/[^0-9]/g, '');
      const limits = d.armSpeedLimitsDefault.map((l, i) =>
        i === index ? { ...l, [edge]: cleaned } : l,
      );
      const lo = Math.min(num(limits[index].min), num(limits[index].max));
      const hi = Math.max(num(limits[index].min), num(limits[index].max));
      const midpoint = Math.round((lo + hi) / 2);
      return {
        ...d,
        armSpeedLimitsDefault: limits,
        armValuesDefault: d.armValuesDefault.map((v, i) =>
          i === index ? { ...v, deg360: String(midpoint) } : v,
        ),
      };
    });

  const normalizeArmSpeedLimit = (index: number, edge: 'min' | 'max') =>
    setDraft((d) => {
      const lim = d.armSpeedLimitsDefault[index];
      let mn = clamp(num(lim.min), 0, ARM_360_SPEED_MAX);
      let mx = clamp(num(lim.max), 0, ARM_360_SPEED_MAX);
      if (mn >= mx) {
        if (edge === 'min') {
          mn = mx - 1;
          if (mn < 0) { mn = 0; mx = 1; }
        } else {
          mx = mn + 1;
          if (mx > ARM_360_SPEED_MAX) { mx = ARM_360_SPEED_MAX; mn = ARM_360_SPEED_MAX - 1; }
        }
      }
      const midpoint = Math.round((mn + mx) / 2);
      return {
        ...d,
        armSpeedLimitsDefault: d.armSpeedLimitsDefault.map((l, i) =>
          i === index ? { min: String(mn), max: String(mx) } : l,
        ),
        armValuesDefault: d.armValuesDefault.map((v, i) =>
          i === index ? { ...v, deg360: String(midpoint) } : v,
        ),
      };
    });

  // --- Motor hız aralığı (ortak/sağ/sol). İz 0–(2^res-1); varsayılan hız orta nokta. ----
  const setMotorSpeedRange = (limitKey: SpeedLimitKey, speedKey: SpeedKey, min: number, max: number) =>
    setDraft((d) => {
      const lo = Math.min(min, max);
      const hi = Math.max(min, max);
      const midpoint = Math.round((lo + hi) / 2);
      return { ...d, [limitKey]: { min: String(lo), max: String(hi) }, [speedKey]: String(midpoint) };
    });

  const setMotorSpeedLimitText = (limitKey: SpeedLimitKey, speedKey: SpeedKey, edge: 'min' | 'max', value: string) =>
    setDraft((d) => {
      const cleaned = value.replace(/[^0-9]/g, '');
      const lim = { ...d[limitKey], [edge]: cleaned };
      const lo = Math.min(num(lim.min), num(lim.max));
      const hi = Math.max(num(lim.min), num(lim.max));
      const midpoint = Math.round((lo + hi) / 2);
      return { ...d, [limitKey]: lim, [speedKey]: String(midpoint) };
    });

  const normalizeMotorSpeedLimit = (limitKey: SpeedLimitKey, speedKey: SpeedKey, resKey: ResKey, edge: 'min' | 'max') =>
    setDraft((d) => {
      const ceil = pwmMaxFromResolution(num(d[resKey]));
      const lim = d[limitKey];
      let mn = clamp(num(lim.min), 0, ceil);
      let mx = clamp(num(lim.max), 0, ceil);
      if (mn >= mx) {
        if (edge === 'min') {
          mn = mx - 1;
          if (mn < 0) { mn = 0; mx = Math.min(1, ceil); }
        } else {
          mx = mn + 1;
          if (mx > ceil) { mx = ceil; mn = Math.max(0, ceil - 1); }
        }
      }
      const midpoint = Math.round((mn + mx) / 2);
      return { ...d, [limitKey]: { min: String(mn), max: String(mx) }, [speedKey]: String(midpoint) };
    });

  // Motorun "Varsayılan Hız" slider'ı: değeri kendi [min, max] aralığına kıstırır (180° açı eşi).
  const setMotorSpeedDefault = (speedKey: SpeedKey, limitKey: SpeedLimitKey, value: string) =>
    setDraft((d) => {
      let next = value;
      if (value !== '') {
        const lo = Math.min(num(d[limitKey].min), num(d[limitKey].max));
        const hi = Math.max(num(d[limitKey].min), num(d[limitKey].max));
        next = String(clamp(num(value), lo, hi));
      }
      return { ...d, [speedKey]: next };
    });

  const setZiplineAngle = (side: 'front' | 'back', edge: 'open' | 'close', value: string) =>
    setDraft((d) => ({
      ...d,
      ziplineAnglesDefault: {
        ...d.ziplineAnglesDefault,
        [side]: { ...d.ziplineAnglesDefault[side], [edge]: value },
      },
    }));

  // Her hız kontrolünün kendi PWM çözünürlüğü var. Çözünürlük değişince üst sınır
  // 2^res-1 olur; hız aralığı (min/max) yeni üst sınıra kıstırılır ve 180° açı
  // mantığıyla aynı şekilde varsayılan hız yeni aralığın orta noktasına çekilir.
  const makeResolutionSetter =
    (resKey: ResKey, speedKey: SpeedKey, limitKey: SpeedLimitKey) => (text: string) => {
      const cleaned = text.replace(/[^0-9]/g, '');
      setDraft((d) => {
        const next: DraftSettings = { ...d, [resKey]: cleaned };
        if (cleaned !== '') {
          const ceil = pwmMaxFromResolution(num(cleaned));
          let mn = clamp(num(d[limitKey].min), 0, ceil);
          let mx = clamp(num(d[limitKey].max), 0, ceil);
          if (mn > mx) { const t = mn; mn = mx; mx = t; }
          if (mn === mx) { if (mx < ceil) mx = mn + 1; else mn = Math.max(0, mx - 1); }
          next[limitKey] = { min: String(mn), max: String(mx) };
          next[speedKey] = String(Math.round((mn + mx) / 2));
        }
        return next;
      });
    };

  // Tek bir motor hız bölümü: çözünürlük + aralık bilgisi + hız aralığı (min/max) + hız slider'ı + adım.
  // Hız slider'ı kullanıcının seçtiği [min, max] aralığıyla, RangeSlider izi 0–(2^res-1) ile sınırlıdır.
  const renderMotorSection = (opts: {
    title: string;
    color: string;
    resKey: ResKey;
    speedKey: SpeedKey;
    stepKey: StepKey;
    limitKey: SpeedLimitKey;
  }) => {
    const max = pwmMaxFromResolution(num(draft[opts.resKey]));
    const lim = draft[opts.limitKey];
    const lo = Math.min(num(lim.min), num(lim.max));
    const hi = Math.max(num(lim.min), num(lim.max));
    const limitMaxLen = String(max).length;
    return (
      <>
        <Text style={styles.subGroupTitle}>{opts.title}</Text>
        <NumberRow
          label="PWM Çözünürlüğü (bit)"
          value={draft[opts.resKey]}
          onChangeText={makeResolutionSetter(opts.resKey, opts.speedKey, opts.limitKey)}
          maxLength={2}
        />
        <Text style={{ fontSize: 12, color: '#94A3B8', fontWeight: '700', marginTop: -2, marginBottom: 6 }}>
          PWM aralığı: 0 – {max}
        </Text>
        <View style={styles.sliderField}>
          <View style={styles.sliderTopRow}>
            <Text style={styles.rowLabel}>Hız Aralığı</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <TextInput
                style={[styles.numberInput, { width: 64 }]}
                value={lim.min}
                onChangeText={(t) => setMotorSpeedLimitText(opts.limitKey, opts.speedKey, 'min', t)}
                onBlur={() => normalizeMotorSpeedLimit(opts.limitKey, opts.speedKey, opts.resKey, 'min')}
                keyboardType="numeric"
                maxLength={limitMaxLen}
                selectTextOnFocus
              />
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#94A3B8' }}>–</Text>
              <TextInput
                style={[styles.numberInput, { width: 64 }]}
                value={lim.max}
                onChangeText={(t) => setMotorSpeedLimitText(opts.limitKey, opts.speedKey, 'max', t)}
                onBlur={() => normalizeMotorSpeedLimit(opts.limitKey, opts.speedKey, opts.resKey, 'max')}
                keyboardType="numeric"
                maxLength={limitMaxLen}
                selectTextOnFocus
              />
            </View>
          </View>
          <RangeSlider
            minValue={lo}
            maxValue={hi}
            minimumValue={0}
            maximumValue={max}
            step={1}
            minGap={1}
            trackThickness={7}
            thumbSize={20}
            trackColor="#E2E8F0"
            fillColor={opts.color}
            thumbColor={darkenHex(opts.color)}
            onChange={(mn, mx) => setMotorSpeedRange(opts.limitKey, opts.speedKey, mn, mx)}
          />
        </View>
        <SliderField
          label="Varsayılan Hız"
          value={draft[opts.speedKey]}
          min={lo}
          max={hi}
          maxLength={limitMaxLen}
          color={opts.color}
          onChange={(t) => setMotorSpeedDefault(opts.speedKey, opts.limitKey, t)}
        />
        <NumberRow
          label="Hız Adımı"
          value={draft[opts.stepKey]}
          onChangeText={(t) => setDraft((d) => ({ ...d, [opts.stepKey]: t }))}
        />
      </>
    );
  };

  const handleSave = () => {
    setSettings(fromDraft(draft));
    window.alert('Ayarlar kaydedildi');
  };

  const handleReset = () => {
    if (window.confirm('Tüm ayarlar varsayılan değerlere dönecek ve kaydedilecek. Emin misiniz?')) {
      resetSettings();
      setDraft(toDraft(defaultSettings));
      window.alert('Varsayılana sıfırlandı');
    }
  };

  // --- Kaydedilmemiş değişiklik koruması ------------------------------------
  // beforeRemove'dan sonra eylemi tekrar dispatch ederken döngüye girmemek için.
  const allowLeaveRef = useRef(false);

  // draft, kayıtlı ayarlardan farklı mı? (normalize edilmiş değerler kıyaslanır)
  const isDirty = (): boolean => {
    const s = useSettingsStore.getState();
    const saved: AppSettings = {
      sendValuesHeaders: s.sendValuesHeaders,
      allSendsValues: s.allSendsValues,
      motorControlSeparateDefault: s.motorControlSeparateDefault,
      motorPwmResolutionDefault: s.motorPwmResolutionDefault,
      motorSpeedDefault: s.motorSpeedDefault,
      motorSpeedStepDefault: s.motorSpeedStepDefault,
      motorSpeedLimitDefault: s.motorSpeedLimitDefault,
      rightMotorPwmResolutionDefault: s.rightMotorPwmResolutionDefault,
      rightMotorSpeedDefault: s.rightMotorSpeedDefault,
      rightMotorSpeedStepDefault: s.rightMotorSpeedStepDefault,
      rightMotorSpeedLimitDefault: s.rightMotorSpeedLimitDefault,
      leftMotorPwmResolutionDefault: s.leftMotorPwmResolutionDefault,
      leftMotorSpeedDefault: s.leftMotorSpeedDefault,
      leftMotorSpeedStepDefault: s.leftMotorSpeedStepDefault,
      leftMotorSpeedLimitDefault: s.leftMotorSpeedLimitDefault,
      armsAre360Default: s.armsAre360Default,
      armDirectionReversedDefault: s.armDirectionReversedDefault,
      armValuesDefault: s.armValuesDefault,
      armAngleLimitsDefault: s.armAngleLimitsDefault,
      armSpeedLimitsDefault: s.armSpeedLimitsDefault,
      armValuesStepDefault: s.armValuesStepDefault,
      ziplineAnglesDefault: s.ziplineAnglesDefault,
    };
    return JSON.stringify(fromDraft(draft)) !== JSON.stringify(saved);
  };

  // Ekrandan ayrılırken (geri oku/goBack, ev, tarayıcı geri tuşu) kaydedilmemiş
  // değişiklik varsa önce kaydetmek isteyip istemediğini sor. (Araç butonu push
  // olduğundan bu ekranı kaldırmaz; draft korunur, sorulmaz.)
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (allowLeaveRef.current || !isDirty()) return;
      // Ayrılmayı durdur; onay modalı async olduğundan karar verilince dispatch et.
      e.preventDefault();
      const save = window.confirm('Çıkmadan önce değişiklikleri kaydetmek istiyor musunuz?');
      if (save) setSettings(fromDraft(draft));
      allowLeaveRef.current = true;
      navigation.dispatch(e.data.action);
    });
    return unsubscribe;
  }, [navigation, draft]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar style={effectiveTheme === 'dark' ? 'light' : 'dark'} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTextBox}>
          <Text style={styles.headerTitle}>Ayarlar</Text>
          <Text style={styles.headerSubtitle}>Gönderim başlıkları ve varsayılan değerler</Text>
        </View>

        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            const idx = navigation.getState()?.index ?? 0;
            if (idx > 0 && typeof window !== 'undefined') {
              window.history.go(-idx);
            } else {
              navigation.navigate('Home');
            }
          }}
        >
          <MaterialCommunityIcons name="home" size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('CarControl')}>
          <MaterialCommunityIcons name="car" size={22} color="#0A84FF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Card title="Gönderim Başlıkları" icon="code-tags" iconColor="#6D28D9" iconBg="#EDE9FE">
          <Text style={styles.subGroupTitle}>Motor</Text>
          <TextRow label="Sağ Motor" value={draft.sendValuesHeaders.motor.right_motor} onChangeText={(t) => setMotorHeader('right_motor', t)} />
          <TextRow label="Sol Motor" value={draft.sendValuesHeaders.motor.left_motor} onChangeText={(t) => setMotorHeader('left_motor', t)} />
          <TextRow label="Tüm Motorlar" value={draft.sendValuesHeaders.motor.all_motors} onChangeText={(t) => setMotorHeader('all_motors', t)} />

          <View style={styles.divider} />
          <Text style={styles.subGroupTitle}>Robot Kol</Text>
          <TextRow label="Kol 0" value={draft.sendValuesHeaders.robot_arm.robot_arm_0} onChangeText={(t) => setArmHeader('robot_arm_0', t)} />
          <TextRow label="Kol 1" value={draft.sendValuesHeaders.robot_arm.robot_arm_1} onChangeText={(t) => setArmHeader('robot_arm_1', t)} />
          <TextRow label="Kol 2" value={draft.sendValuesHeaders.robot_arm.robot_arm_2} onChangeText={(t) => setArmHeader('robot_arm_2', t)} />
          <TextRow label="Kol 3" value={draft.sendValuesHeaders.robot_arm.robot_arm_3} onChangeText={(t) => setArmHeader('robot_arm_3', t)} />
          <TextRow label="Kol 4" value={draft.sendValuesHeaders.robot_arm.robot_arm_4} onChangeText={(t) => setArmHeader('robot_arm_4', t)} />
          <TextRow label="Kol 5" value={draft.sendValuesHeaders.robot_arm.robot_arm_5} onChangeText={(t) => setArmHeader('robot_arm_5', t)} />
          <TextRow label="Tüm Kollar" value={draft.sendValuesHeaders.robot_arm.all_robot_arms} onChangeText={(t) => setArmHeader('all_robot_arms', t)} />

          <View style={styles.divider} />
          <Text style={styles.subGroupTitle}>Zipline</Text>
          <TextRow label="Ön Zipline" value={draft.sendValuesHeaders.zipline.front_zipline} onChangeText={(t) => setZiplineHeader('front_zipline', t)} />
          <TextRow label="Arka Zipline" value={draft.sendValuesHeaders.zipline.back_zipline} onChangeText={(t) => setZiplineHeader('back_zipline', t)} />
          <TextRow label="Tüm Ziplineler" value={draft.sendValuesHeaders.zipline.all_ziplines} onChangeText={(t) => setZiplineHeader('all_ziplines', t)} />

          <View style={styles.divider} />
          <Text style={styles.subGroupTitle}>Kodlar</Text>
          <TextRow label="Kod Komutu" value={draft.sendValuesHeaders.code.command} onChangeText={(t) => setCodeHeader('command', t)} />
        </Card>

        <Card title="Toplu Gönderim" icon="checkbox-multiple-marked-outline" iconColor="#0284C7" iconBg="#E0F2FE">
          <SwitchRow label="Motorlar (tek komut)" value={draft.allSendsValues.motors} onValueChange={(v) => setAllSends('motors', v)} onText="Açık" offText="Kapalı" />
          <SwitchRow label="Robot Kollar (tek komut)" value={draft.allSendsValues.robot_arms} onValueChange={(v) => setAllSends('robot_arms', v)} onText="Açık" offText="Kapalı" />
          <SwitchRow label="Ziplineler (tek komut)" value={draft.allSendsValues.ziplines} onValueChange={(v) => setAllSends('ziplines', v)} onText="Açık" offText="Kapalı" />
        </Card>

        <Card title="Motor" icon="speedometer" iconColor="#15803D" iconBg="#DCFCE7">
          <MotorModeRow
            label="Hız kontrolü"
            value={draft.motorControlSeparateDefault}
            onValueChange={(v) => setDraft((d) => ({ ...d, motorControlSeparateDefault: v }))}
          />

          <View style={styles.divider} />
          {renderMotorSection({ title: 'Ortak', color: '#0A84FF', resKey: 'motorPwmResolutionDefault', speedKey: 'motorSpeedDefault', stepKey: 'motorSpeedStepDefault', limitKey: 'motorSpeedLimitDefault' })}

          <View style={styles.divider} />
          {renderMotorSection({ title: 'Sağ Motor', color: '#F59E0B', resKey: 'rightMotorPwmResolutionDefault', speedKey: 'rightMotorSpeedDefault', stepKey: 'rightMotorSpeedStepDefault', limitKey: 'rightMotorSpeedLimitDefault' })}

          <View style={styles.divider} />
          {renderMotorSection({ title: 'Sol Motor', color: '#22C55E', resKey: 'leftMotorPwmResolutionDefault', speedKey: 'leftMotorSpeedDefault', stepKey: 'leftMotorSpeedStepDefault', limitKey: 'leftMotorSpeedLimitDefault' })}
        </Card>

        <Card title="Robot Kol" icon="robot-industrial" iconColor="#B45309" iconBg="#FEF3C7">
          {draft.armValuesDefault.map((val, i) => {
            const is360 = draft.armsAre360Default[i];
            const lim = draft.armAngleLimitsDefault[i];
            const lo = Math.min(num(lim.min), num(lim.max));
            const hi = Math.max(num(lim.min), num(lim.max));
            const slim = draft.armSpeedLimitsDefault[i];
            const slo = Math.min(num(slim.min), num(slim.max));
            const shi = Math.max(num(slim.min), num(slim.max));
            return (
              <View key={`arm-${i}`}>
                {i > 0 && <View style={styles.divider} />}
                <Text style={styles.subGroupTitle}>{`Kol ${i}`}</Text>
                <View style={styles.switchPairRow}>
                  <SwitchRow
                    compact
                    label="Servo Çeşidi"
                    value={is360}
                    onValueChange={(v) => setArm360(i, v)}
                    onText="360°"
                    offText="180°"
                  />
                  <SwitchRow
                    compact
                    label="Açı Yönü"
                    value={draft.armDirectionReversedDefault[i]}
                    onValueChange={(v) => setArmReversed(i, v)}
                    onText="Ters"
                    offText="Düz"
                  />
                </View>
                {is360 ? (
                  <View style={styles.sliderField}>
                    <View style={styles.sliderTopRow}>
                      <Text style={styles.rowLabel}>Hız Aralığı</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <TextInput
                          style={[styles.numberInput, { width: 58 }]}
                          value={slim.min}
                          onChangeText={(t) => setArmSpeedLimitText(i, 'min', t)}
                          onBlur={() => normalizeArmSpeedLimit(i, 'min')}
                          keyboardType="numeric"
                          maxLength={2}
                          selectTextOnFocus
                        />
                        <Text style={{ fontSize: 14, fontWeight: '800', color: '#94A3B8' }}>–</Text>
                        <TextInput
                          style={[styles.numberInput, { width: 58 }]}
                          value={slim.max}
                          onChangeText={(t) => setArmSpeedLimitText(i, 'max', t)}
                          onBlur={() => normalizeArmSpeedLimit(i, 'max')}
                          keyboardType="numeric"
                          maxLength={2}
                          selectTextOnFocus
                        />
                      </View>
                    </View>
                    <RangeSlider
                      minValue={slo}
                      maxValue={shi}
                      minimumValue={0}
                      maximumValue={ARM_360_SPEED_MAX}
                      step={1}
                      minGap={1}
                      trackThickness={7}
                      thumbSize={20}
                      trackColor="#E2E8F0"
                      fillColor={ARM_COLORS[i]}
                      thumbColor={ARM_THUMB_COLORS[i]}
                      onChange={(mn, mx) => setArmSpeedRange(i, mn, mx)}
                    />
                  </View>
                ) : (
                  <View style={styles.sliderField}>
                    <View style={styles.sliderTopRow}>
                      <Text style={styles.rowLabel}>Açı Aralığı</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <TextInput
                          style={[styles.numberInput, { width: 58 }]}
                          value={lim.min}
                          onChangeText={(t) => setArmLimitText(i, 'min', t)}
                          onBlur={() => normalizeArmLimit(i, 'min')}
                          keyboardType="numeric"
                          maxLength={3}
                          selectTextOnFocus
                        />
                        <Text style={{ fontSize: 14, fontWeight: '800', color: '#94A3B8' }}>–</Text>
                        <TextInput
                          style={[styles.numberInput, { width: 58 }]}
                          value={lim.max}
                          onChangeText={(t) => setArmLimitText(i, 'max', t)}
                          onBlur={() => normalizeArmLimit(i, 'max')}
                          keyboardType="numeric"
                          maxLength={3}
                          selectTextOnFocus
                        />
                      </View>
                    </View>
                    <RangeSlider
                      minValue={lo}
                      maxValue={hi}
                      minimumValue={0}
                      maximumValue={180}
                      step={1}
                      minGap={1}
                      trackThickness={7}
                      thumbSize={20}
                      trackColor="#E2E8F0"
                      fillColor={ARM_COLORS[i]}
                      thumbColor={ARM_THUMB_COLORS[i]}
                      onChange={(mn, mx) => setArmAngleRange(i, mn, mx)}
                    />
                  </View>
                )}
                <SliderField
                  label={is360 ? 'Varsayılan Hız' : 'Varsayılan Açı'}
                  value={is360 ? val.deg360 : val.deg180}
                  min={is360 ? slo : lo}
                  max={is360 ? shi : hi}
                  color={ARM_COLORS[i]}
                  onChange={(t) => setArmDefault(i, t)}
                />
              </View>
            );
          })}

          <View style={styles.divider} />
          <NumberRow label="Açı Adımı" value={draft.armValuesStepDefault} onChangeText={(t) => setDraft((d) => ({ ...d, armValuesStepDefault: t }))} />
        </Card>

        <Card title="Zipline Açıları" icon="transmission-tower" iconColor="#BE185D" iconBg="#FCE7F3">
          <Text style={styles.subGroupTitle}>Ön</Text>
          <SliderField label="Açık" value={draft.ziplineAnglesDefault.front.open} min={0} max={180} color={ZIPLINE_OPEN_COLOR} onChange={(t) => setZiplineAngle('front', 'open', t)} />
          <SliderField label="Kapalı" value={draft.ziplineAnglesDefault.front.close} min={0} max={180} color={ZIPLINE_CLOSE_COLOR} onChange={(t) => setZiplineAngle('front', 'close', t)} />

          <View style={styles.divider} />
          <Text style={styles.subGroupTitle}>Arka</Text>
          <SliderField label="Açık" value={draft.ziplineAnglesDefault.back.open} min={0} max={180} color={ZIPLINE_OPEN_COLOR} onChange={(t) => setZiplineAngle('back', 'open', t)} />
          <SliderField label="Kapalı" value={draft.ziplineAnglesDefault.back.close} min={0} max={180} color={ZIPLINE_CLOSE_COLOR} onChange={(t) => setZiplineAngle('back', 'close', t)} />
        </Card>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.resetBtn} activeOpacity={0.85} onPress={handleReset}>
          <MaterialCommunityIcons name="restore" size={20} color="#EF4444" />
          <Text style={styles.resetBtnText}>Sıfırla</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.saveBtn} activeOpacity={0.9} onPress={handleSave}>
          <MaterialCommunityIcons name="content-save" size={20} color="#FFFFFF" />
          <Text style={styles.saveBtnText}>Kaydet</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
