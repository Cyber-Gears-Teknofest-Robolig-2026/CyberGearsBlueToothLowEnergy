import React, { useState, useRef, useEffect, useMemo } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  useWindowDimensions,
  TextInput,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Entypo } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { makeStyles } from './styles';
import { useThemeColors, useEffectiveTheme } from '../theme';
import CustomSlider from '../CustomComponents/CustomSlider';
import HoldButton from '../CustomComponents/HoldButton';
import ToggleSwitch from '../CustomComponents/ToggleSwitch';
import CodesCard from './CodesCard';
import { AppNavigationProp, useBluetoothStore, useSettingsStore } from '../constants';

// --- RCCarTab component (migrated) ---
const getSliderValue = (value: number | number[]) => {
  return Array.isArray(value) ? value[0] : value;
};

const clamp = (value: number, min: number, max: number) => {
  return Math.max(min, Math.min(max, Math.round(value)));
};

function RCCarTab({ disableScroll = false }: { disableScroll?: boolean }) {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const connectedDevice = useBluetoothStore((state) => state.connectedDevice);
  const sendValuesHeaders = useSettingsStore((state) => state.sendValuesHeaders);
  const allSendsValues = useSettingsStore((state) => state.allSendsValues);
  const ziplineAnglesDefault = useSettingsStore((state) => state.ziplineAnglesDefault);
  const SEPARATE_DEFAULT = useSettingsStore((state) => state.motorControlSeparateDefault);
  const SPEED_DEFAULT = useSettingsStore((state) => state.motorSpeedDefault);
  const PWM_STEP = useSettingsStore((state) => state.motorSpeedStepDefault);
  const RIGHT_SPEED_DEFAULT = useSettingsStore((state) => state.rightMotorSpeedDefault);
  const RIGHT_PWM_STEP = useSettingsStore((state) => state.rightMotorSpeedStepDefault);
  const LEFT_SPEED_DEFAULT = useSettingsStore((state) => state.leftMotorSpeedDefault);
  const LEFT_PWM_STEP = useSettingsStore((state) => state.leftMotorSpeedStepDefault);

  // Her hız kontrolünün PWM üst sınırı kendi çözünürlüğünden türetilir: 2^res - 1 (8 bit -> 255).
  // Kullanıcı hız sınırı (min/max): slider izi ve değer bununla kısıtlanır. Üst sınır,
  // ayarlarda kaydedilirken zaten kanalın PWM çözünürlüğüne (2^res-1) göre kıstırılmıştır.
  const COMMON_SPEED_LIMIT = useSettingsStore((state) => state.motorSpeedLimitDefault);
  const RIGHT_SPEED_LIMIT = useSettingsStore((state) => state.rightMotorSpeedLimitDefault);
  const LEFT_SPEED_LIMIT = useSettingsStore((state) => state.leftMotorSpeedLimitDefault);

  const [ziplineOpen, setZiplineOpen] = useState(false);
  const [vehicleScrollHeight, setVehicleScrollHeight] = useState(0);

  // Ortak (false) veya ayrı ayrı (true) hız kontrolü. Varsayılan ayarlardan gelir.
  const [separateMode, setSeparateMode] = useState(SEPARATE_DEFAULT);

  // Başlangıç değerini kendi [min, max] hız aralığına kıstır.
  const initCommon = clamp(SPEED_DEFAULT, COMMON_SPEED_LIMIT.min, COMMON_SPEED_LIMIT.max);
  const initRight = clamp(RIGHT_SPEED_DEFAULT, RIGHT_SPEED_LIMIT.min, RIGHT_SPEED_LIMIT.max);
  const initLeft = clamp(LEFT_SPEED_DEFAULT, LEFT_SPEED_LIMIT.min, LEFT_SPEED_LIMIT.max);

  const [speed, setSpeed] = useState(initCommon);
  const [speedInput, setSpeedInput] = useState(initCommon.toString());
  const [rightSpeed, setRightSpeed] = useState(initRight);
  const [rightSpeedInput, setRightSpeedInput] = useState(initRight.toString());
  const [leftSpeed, setLeftSpeed] = useState(initLeft);
  const [leftSpeedInput, setLeftSpeedInput] = useState(initLeft.toString());

  const handleDirection = async (direction: string) => {
    // Moda göre her motorun hızı: ortakta ikisi de `speed`, ayrıda sağ/sol bağımsız.
    const rBase = separateMode ? rightSpeed : speed;
    const lBase = separateMode ? leftSpeed : speed;
    // Yön işaretleri (tank dönüşü): [sağ, sol]
    let r = 0;
    let l = 0;
    switch (direction) {
      case 'forward': r = rBase; l = lBase; break;
      case 'backward': r = -rBase; l = -lBase; break;
      case 'right': r = -rBase; l = lBase; break;
      case 'left': r = rBase; l = -lBase; break;
    }
    console.log('Direction:', direction, '| R:', r, '| L:', l);
    if (!allSendsValues.motors) {
      await connectedDevice?.write(`${sendValuesHeaders.motor.right_motor}:${r}\r\n`);
      await connectedDevice?.write(`${sendValuesHeaders.motor.left_motor}:${l}\r\n`);
    } else {
      await connectedDevice?.write(`${sendValuesHeaders.motor.all_motors}:${r},${l}\r\n`);
    }
  };

  const handleDirectionStop = async () => {
    console.log('Direction: stop');
    if (!allSendsValues.motors) {
      await connectedDevice?.write(`${sendValuesHeaders.motor.right_motor}:0\r\n`);
      await connectedDevice?.write(`${sendValuesHeaders.motor.left_motor}:0\r\n`);
    } else {
      await connectedDevice?.write(`${sendValuesHeaders.motor.all_motors}:0,0\r\n`);
    }
  };

  const toggleZipline = async () => {
    const nextValue = !ziplineOpen;
    console.log('Zipline:', nextValue ? 'Open' : 'Close');
    setZiplineOpen(nextValue);
    if (!allSendsValues.ziplines) {
      if (nextValue) {
        await connectedDevice?.write(`${sendValuesHeaders.zipline.front_zipline}:${ziplineAnglesDefault.front.open}\r\n`);
        await connectedDevice?.write(`${sendValuesHeaders.zipline.back_zipline}:${ziplineAnglesDefault.back.open}\r\n`);
      } else {
        await connectedDevice?.write(`${sendValuesHeaders.zipline.front_zipline}:${ziplineAnglesDefault.front.close}\r\n`);
        await connectedDevice?.write(`${sendValuesHeaders.zipline.back_zipline}:${ziplineAnglesDefault.back.close}\r\n`);
      }
    } else {
      if (nextValue) {
        await connectedDevice?.write(`${sendValuesHeaders.zipline.all_ziplines}:${ziplineAnglesDefault.front.open},${ziplineAnglesDefault.back.open}\r\n`);
      } else {
        await connectedDevice?.write(`${sendValuesHeaders.zipline.all_ziplines}:${ziplineAnglesDefault.front.close},${ziplineAnglesDefault.back.close}\r\n`);
      }
    }
  };

  // Tek bir hız kontrolünün (slider + −/+ + sayı girişi) tüm davranışlarını üretir.
  // Değer kullanıcı ayarındaki [min, max] hız aralığına kıstırılır.
  const makeSpeedControl = (
    value: number,
    input: string,
    setValue: (n: number) => void,
    setInput: (s: string) => void,
    step: number,
    min: number,
    max: number,
  ) => {
    const apply = (rawValue: number | number[]) => {
      const pwmValue = clamp(getSliderValue(rawValue), min, max);
      setValue(pwmValue);
      setInput(pwmValue.toString());
    };
    return {
      value,
      input,
      min,
      max,
      apply,
      increment: () => apply(value + step),
      decrement: () => apply(value - step),
      onInput: (text: string) => {
        const onlyNumbers = text.replace(/[^0-9]/g, '');
        setInput(onlyNumbers);
        if (onlyNumbers === '') return;
        const numValue = Number(onlyNumbers);
        if (!Number.isNaN(numValue)) setValue(clamp(numValue, min, max));
      },
      normalize: () => apply(input === '' ? value : Number(input)),
    };
  };

  const commonSpeed = makeSpeedControl(speed, speedInput, setSpeed, setSpeedInput, PWM_STEP, COMMON_SPEED_LIMIT.min, COMMON_SPEED_LIMIT.max);
  const rightSpeedCtrl = makeSpeedControl(rightSpeed, rightSpeedInput, setRightSpeed, setRightSpeedInput, RIGHT_PWM_STEP, RIGHT_SPEED_LIMIT.min, RIGHT_SPEED_LIMIT.max);
  const leftSpeedCtrl = makeSpeedControl(leftSpeed, leftSpeedInput, setLeftSpeed, setLeftSpeedInput, LEFT_PWM_STEP, LEFT_SPEED_LIMIT.min, LEFT_SPEED_LIMIT.max);

  const renderSpeedRow = (ctrl: ReturnType<typeof makeSpeedControl>, fillColor: string) => {
    const inputMaxLen = String(ctrl.max).length;
    // Giriş kutusu 3 basamağa göre ayarlı; 4+ basamakta sıkışmasın diye genişlet.
    const inputBoxWidth = 74 + Math.max(0, inputMaxLen - 3) * 12;
    return (
      <View style={styles.speedControlRow}>
        <HoldButton style={[styles.roundControlButton, { backgroundColor: fillColor }]} onPressIn={ctrl.decrement}><Entypo name="minus" size={20} color="#FFFFFF" /></HoldButton>
        <View style={styles.speedSliderBox}>
          <CustomSlider value={ctrl.value} minimumValue={ctrl.min} maximumValue={ctrl.max} step={1} onValueChange={ctrl.apply} trackThickness={8} thumbSize={22} trackColor="#D7E0EA" fillColor={fillColor} thumbColor={fillColor} />
        </View>
        <HoldButton style={[styles.roundControlButton, { backgroundColor: fillColor }]} onPressIn={ctrl.increment}><Entypo name="plus" size={20} color="#FFFFFF" /></HoldButton>
        <View style={[styles.speedInputBox, { width: inputBoxWidth }]}><TextInput style={styles.speedInput} value={ctrl.input} onChangeText={ctrl.onInput} onBlur={ctrl.normalize} keyboardType="numeric" maxLength={inputMaxLen} selectTextOnFocus /></View>
      </View>
    );
  };

  const content = (
    <>
      <View
        style={[
          styles.vehicleTopRow,
          vehicleScrollHeight > 0 ? { height: Math.min(vehicleScrollHeight - 10, 380) } : null,
        ]}
      >
        <View style={styles.cardLarge}>
          <View style={styles.cardHeader}>
            <View style={styles.headerIconBox}>
              <MaterialIcons name="directions-car" size={19.2} color="#0A84FF" />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Araç Hareketi</Text>
            </View>
          </View>

          <View style={styles.directionPad}>
            <TouchableOpacity style={styles.directionButton} activeOpacity={0.78} onPressIn={() => handleDirection('forward')} onPressOut={handleDirectionStop}>
              <Entypo name="arrow-up" size={36} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.directionRow}>
              <TouchableOpacity style={styles.directionButton} activeOpacity={0.78} onPressIn={() => handleDirection('left')} onPressOut={handleDirectionStop}>
                <Entypo name="arrow-left" size={36} color="#FFFFFF" />
              </TouchableOpacity>

              <View style={styles.directionCenter}>
                <MaterialIcons name="directions-car" size={32} color="#0A84FF" />
              </View>

              <TouchableOpacity style={styles.directionButton} activeOpacity={0.78} onPressIn={() => handleDirection('right')} onPressOut={handleDirectionStop}>
                <Entypo name="arrow-right" size={36} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.directionButton} activeOpacity={0.78} onPressIn={() => handleDirection('backward')} onPressOut={handleDirectionStop}>
              <Entypo name="arrow-down" size={36} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.cardSmall}>
          <View style={styles.cardHeader}>
            <View style={[styles.headerIconBox, ziplineOpen ? styles.headerIconBoxGreen : styles.headerIconBoxRed]}>
              <MaterialIcons name={ziplineOpen ? 'lock-open' : 'lock'} size={19.2} color={ziplineOpen ? '#22C55E' : '#EF4444'} />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Zipline Mekanizması</Text>
            </View>
          </View>

          <View style={styles.ziplineStatusRow}>
            <Text style={styles.ziplineStatusLabel}>Durum</Text>
            <View style={[styles.ziplineStatusPill, ziplineOpen ? styles.ziplineStatusOpen : styles.ziplineStatusClosed]}>
              <Text style={styles.ziplineStatusText}>{ziplineOpen ? 'AÇIK' : 'KAPALI'}</Text>
            </View>
          </View>

          <TouchableOpacity activeOpacity={0.86} style={[styles.ziplineButton, ziplineOpen ? styles.ziplineOpen : styles.ziplineClosed]} onPress={toggleZipline}>
            <View style={styles.ziplineIconCircle}>
              <MaterialIcons name={ziplineOpen ? 'lock-open' : 'lock'} size={26} color="#FFFFFF" />
            </View>
            <Text style={styles.ziplineButtonText}>{ziplineOpen ? 'AÇIK' : 'KAPALI'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.speedCard}>
        <View style={[styles.speedHeaderRow, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
          <View style={styles.cardHeader}>
            <View style={styles.headerIconBox}>
              <MaterialIcons name="speed" size={19.2} color="#0A84FF" />
            </View>
            <View>
              <Text style={styles.sectionTitle}>PWM Hız Kontrolü</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: separateMode ? '#0A84FF' : '#64748B' }}>
              {separateMode ? 'Ayrı ayrı' : 'Ortak'}
            </Text>
            <ToggleSwitch value={separateMode} onValueChange={setSeparateMode} />
          </View>
        </View>

        {separateMode ? (
          <>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginTop: 10, marginBottom: 6 }}>Sağ Motor</Text>
            {renderSpeedRow(rightSpeedCtrl, '#F59E0B')}
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginTop: 14, marginBottom: 6 }}>Sol Motor</Text>
            {renderSpeedRow(leftSpeedCtrl, '#22C55E')}
          </>
        ) : (
          renderSpeedRow(commonSpeed, '#0A84FF')
        )}
      </View>
    </>
  );

  if (disableScroll) {
    return (
      <View style={styles.screenBody} onLayout={(e: any) => setVehicleScrollHeight(e.nativeEvent.layout.height)}>{content}</View>
    );
  }

  return (
    <ScrollView style={styles.screenBody} contentContainerStyle={styles.vehicleScrollContent} showsVerticalScrollIndicator={false} onLayout={(e) => setVehicleScrollHeight(e.nativeEvent.layout.height)}>{content}</ScrollView>
  );
}

// --- RobotArmTab component (migrated) ---
const ARM_MIN = 0;
const ARM_MAX = 180;
const HOLD_REPEAT_MS = 50;
const ARM_COLORS = ['#6366F1','#0EA5E9','#14B8A6','#22C55E','#F59E0B','#EF4444'];

function RobotArmTab({ disableScroll = false }: { disableScroll?: boolean }) {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const connectedDevice = useBluetoothStore((state) => state.connectedDevice);
  const sendValuesHeaders = useSettingsStore((state) => state.sendValuesHeaders);
  const allSendsValues = useSettingsStore((state) => state.allSendsValues);
  const armsAre360Default = useSettingsStore((state) => state.armsAre360Default);
  const ARM_DEFAULT_VALUES = useSettingsStore((state) => state.armValuesDefault);
  const ARM_ANGLE_LIMITS = useSettingsStore((state) => state.armAngleLimitsDefault);
  const ARM_SPEED_LIMITS = useSettingsStore((state) => state.armSpeedLimitsDefault);
  const ARM_STEP = useSettingsStore((state) => state.armValuesStepDefault);
  const armDirReversed = useSettingsStore((state) => state.armDirectionReversedDefault);
  const { height } = useWindowDimensions();

  // Açı yönü ters ayarı (kol başına): 180° → gönderilen açı 180-açı; 360° → işaret tersine.
  const wire180 = (angle: number, i: number) => (armDirReversed[i] ? 180 - angle : angle);
  const wire360 = (signed: number, i: number) => (armDirReversed[i] ? -signed : signed);

  const [robotScrollHeight, setRobotScrollHeight] = useState(0);
  // Bir kolun değer aralığı: 360° -> ayardaki min/max hız (0–90), 180° -> ayardaki min/max açı (sıralı).
  const armBounds = (index: number, is360: boolean) =>
    is360
      ? {
          lo: Math.min(ARM_SPEED_LIMITS[index].min, ARM_SPEED_LIMITS[index].max),
          hi: Math.max(ARM_SPEED_LIMITS[index].min, ARM_SPEED_LIMITS[index].max),
        }
      : {
          lo: Math.min(ARM_ANGLE_LIMITS[index].min, ARM_ANGLE_LIMITS[index].max),
          hi: Math.max(ARM_ANGLE_LIMITS[index].min, ARM_ANGLE_LIMITS[index].max),
        };
  // Her kolun başlangıç değeri, o kolun moduna ait varsayılandan gelir (o modun sınırına kıstırılır).
  const initialArmValues = ARM_DEFAULT_VALUES.map((v, i) => {
    const is360 = armsAre360Default[i];
    const { lo, hi } = armBounds(i, is360);
    return clamp(is360 ? v.deg360 : v.deg180, lo, hi);
  });
  const [armValues, setArmValues] = useState<number[]>([...initialArmValues]);
  const [armIs360, setArmIs360] = useState<boolean[]>([...armsAre360Default]);
  const [armInputs, setArmInputs] = useState<string[]>(initialArmValues.map(String));

  // Web'de Web Bluetooth aynı anda yalnızca tek GATT işlemine izin verir; slider'ı
  // sürüklerken her hareketi ayrı write olarak kuyruğa atınca backlog oluşur ve
  // hareket parmaktan kopuk/gecikmeli iletilir. Coalescing: bir write uçarken
  // gelen değerler "pending"i ezer, write bitince yalnızca EN SON değer gönderilir.
  // Böylece kuyruk birikmez → slider akıcı kalır, cihaz son konumu ~tek write
  // gecikmeyle alır. (Android'de gerek yok; orada tek-işlem kısıtı yoktur.)
  const pendingArmPayloadRef = useRef<string | null>(null);
  const armWritingRef = useRef(false);
  const sendArmLatest = (payload: string) => {
    pendingArmPayloadRef.current = payload;
    if (armWritingRef.current) return;
    armWritingRef.current = true;
    (async () => {
      try {
        while (pendingArmPayloadRef.current != null) {
          const next = pendingArmPayloadRef.current;
          pendingArmPayloadRef.current = null;
          await connectedDevice?.write(next);
        }
      } finally {
        armWritingRef.current = false;
      }
    })();
  };

  const handleArmChange = async (index: number, rawValue: number | number[]) => {
    const value = getSliderValue(rawValue);
    const { lo, hi } = armBounds(index, armIs360[index]);
    const angleValue = clamp(value, lo, hi);
    const nextValues = [...armValues]; nextValues[index] = angleValue; setArmValues(nextValues);
    setArmInputs((prev) => { const next = [...prev]; next[index] = String(angleValue); return next; });
    const key: keyof typeof sendValuesHeaders.robot_arm = `robot_arm_${index}` as keyof typeof sendValuesHeaders.robot_arm;
    if (!armIs360[index]) {
      console.log(`Arm ${index}:`, angleValue);
    } else {
      console.log(`Arm ${index} (360) Speed:`, angleValue);
    }
    if (!armIs360[index]) {
      if (!allSendsValues.robot_arms) {
        sendArmLatest(`${sendValuesHeaders.robot_arm[key]}:${wire180(angleValue, index)}\r\n`);
      } else {
        const arm_values_new = armValues.map((value, index_) => { if (armIs360[index_]) return 0; const a = index_ === index ? angleValue : value; return wire180(a, index_); });
        if (!armIs360[index]) sendArmLatest(`${sendValuesHeaders.robot_arm.all_robot_arms}:${arm_values_new.join(',')}\r\n`);
      }
    }
  };

  const handle360Rotation = async (index: number, direction: 'left'|'right') => {
    const speedValue = armValues[index];
    console.log(`Arm ${index} (360) Rotating ${direction} at speed:`, speedValue);
    if (!allSendsValues.robot_arms) {
      const key: keyof typeof sendValuesHeaders.robot_arm = `robot_arm_${index}` as keyof typeof sendValuesHeaders.robot_arm;
      switch(direction){case 'right': await connectedDevice?.write(`${sendValuesHeaders.robot_arm[key]}:${wire360(speedValue, index)}\r\n`); break; case 'left': await connectedDevice?.write(`${sendValuesHeaders.robot_arm[key]}:${wire360(-speedValue, index)}\r\n`); break}
    } else {
      const arm_values_new = armValues.map((value, index_) => { if (!armIs360[index_]) return wire180(value, index_); else { if (index_==index){ switch(direction){case 'right': return wire360(speedValue, index_); case 'left': return wire360(-speedValue, index_);} } else return 0; } });
      await connectedDevice?.write(`${sendValuesHeaders.robot_arm.all_robot_arms}:${arm_values_new.join(',')}\r\n`);
    }
  };

  const handle360RotationStop = async (index:number)=>{ console.log(`Arm ${index + 1} (360) Stop`); if(!allSendsValues.robot_arms){ const key: keyof typeof sendValuesHeaders.robot_arm = `robot_arm_${index}` as keyof typeof sendValuesHeaders.robot_arm; await connectedDevice?.write(`${sendValuesHeaders.robot_arm[key]}:${0}\r\n`);} else { const arm_values_new = armValues.map((value, idx)=> !armIs360[idx]? wire180(value, idx):0); await connectedDevice?.write(`${sendValuesHeaders.robot_arm.all_robot_arms}:${arm_values_new.join(',')}\r\n`); } };

  const resetArm = (index:number)=>{ const def = armIs360[index] ? ARM_DEFAULT_VALUES[index].deg360 : ARM_DEFAULT_VALUES[index].deg180; console.log(`Arm ${index + 1} reset to default:`, def); handleArmChange(index, def); };
  const incrementArm = (index:number)=>handleArmChange(index, armValues[index]+ARM_STEP);
  const decrementArm = (index:number)=>handleArmChange(index, armValues[index]-ARM_STEP);

  const armValuesRef = useRef(armValues); armValuesRef.current = armValues;
  // Gelen komut ayrıştırma için en güncel kol modları + parça (chunk) tamponu.
  const armIs360Ref = useRef(armIs360); armIs360Ref.current = armIs360;
  const rxBufferRef = useRef('');
  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepArm = (index:number, dir:1|-1)=> handleArmChange(index, armValuesRef.current[index]+dir*ARM_STEP);
  const startArmHold = (index:number, dir:1|-1)=>{ stopArmHold(); stepArm(index, dir); holdTimerRef.current = setInterval(()=> stepArm(index, dir), HOLD_REPEAT_MS); };
  const stopArmHold = ()=>{ if(holdTimerRef.current){ clearInterval(holdTimerRef.current); holdTimerRef.current=null;} };
  useEffect(()=>()=>stopArmHold(), []);

  // ------------------------------------------------------------------------
  // GELEN KOMUTLARI OKU → slider'ı + input'u güncelle (BT'ye geri YAZMAZ).
  // Cihaz, uygulamanın gönderdiği kol komutuyla aynı formatta yollar (örn. "R5:0").
  // Header ayardaki robot_arm başlıklarıyla eşleşirse ilgili kolu ayarlar. Gönderimde
  // uygulanan "ters yön" dönüşümünün TERSİ uygulanır (180°: ters ise 180-değer;
  // 360°: hız büyüklüğü = |değer|). Değer kolun [min,max] sınırına kıstırılır.
  // ------------------------------------------------------------------------
  useEffect(() => {
    if (!connectedDevice) return;

    const applyIncoming = (index: number, rawNum: number) => {
      if (index < 0 || index > 5 || Number.isNaN(rawNum)) return;
      const s = useSettingsStore.getState();
      const is360 = armIs360Ref.current[index];
      const reversed = s.armDirectionReversedDefault[index];
      const lim = is360 ? s.armSpeedLimitsDefault[index] : s.armAngleLimitsDefault[index];
      const lo = Math.min(lim.min, lim.max);
      const hi = Math.max(lim.min, lim.max);
      const logical = is360 ? Math.abs(rawNum) : reversed ? 180 - rawNum : rawNum;
      const v = clamp(logical, lo, hi);
      setArmValues((prev) => { const next = [...prev]; next[index] = v; return next; });
      setArmInputs((prev) => { const next = [...prev]; next[index] = String(v); return next; });
    };

    const processLine = (line: string) => {
      const idx = line.indexOf(':');
      if (idx <= 0) return;
      const header = line.slice(0, idx).trim();
      const valuePart = line.slice(idx + 1).trim();
      const headers = useSettingsStore.getState().sendValuesHeaders.robot_arm;
      for (let n = 0; n <= 5; n++) {
        const key = `robot_arm_${n}` as keyof typeof headers;
        if (header === headers[key]) { applyIncoming(n, Number(valuePart)); return; }
      }
      if (header === headers.all_robot_arms) {
        valuePart.split(',').forEach((p, i) => applyIncoming(i, Number(p.trim())));
      }
    };

    const sub = connectedDevice.onDataReceived((event) => {
      // Web chunk verir → tampon + satır ayrıştırma (Android satır-bazlı ile de uyumlu).
      rxBufferRef.current += event.data;
      const parts = rxBufferRef.current.split(/\r\n|\r|\n/);
      rxBufferRef.current = parts.pop() ?? '';
      for (const raw of parts) {
        const line = raw.trim();
        if (line) processLine(line);
      }
    });

    return () => sub.remove();
  }, [connectedDevice]);

  const handleArmInputChange = (index:number, text:string)=>{ const onlyNumbers = text.replace(/[^0-9]/g,''); setArmInputs(prev=>{ const next=[...prev]; next[index]=onlyNumbers; return next; }); if(onlyNumbers!==''){ const { lo, hi } = armBounds(index, armIs360[index]); const clampedValue = clamp(Number(onlyNumbers), lo, hi); setArmValues(prev=>{ const next=[...prev]; next[index]=clampedValue; return next; }); } };
  const handleArmInputSubmit = (index:number, text:string)=>{ const onlyNumbers = text.replace(/[^0-9]/g,''); const numValue = onlyNumbers===''?0:Number(onlyNumbers); handleArmChange(index, numValue); };

  const renderVerticalArmCard = (index:number)=>{ const value = armValues[index]; return (
    <View key={index} style={styles.armCard}>
      <View style={styles.armTop}>
        <Text style={styles.armTitle}>R{index}</Text>
        <HoldButton style={styles.armResetButton} activeOpacity={0.7} onPressIn={()=>resetArm(index)}><MaterialIcons name="refresh" size={16} color="#0A84FF"/></HoldButton>
      </View>
      <HoldButton style={[styles.armButton, styles.armButtonVerticalTop]} activeOpacity={0.8} onPressIn={()=>incrementArm(index)}><Entypo name="plus" size={18} color="#FFFFFF"/></HoldButton>
      <View style={styles.verticalSliderBox}><CustomSlider value={value} minimumValue={ARM_MIN} maximumValue={ARM_MAX} step={1} vertical onValueChange={(val:number)=>handleArmChange(index,val)} trackThickness={7} thumbSize={20} trackColor="#D7E0EA" fillColor="#0A84FF" thumbColor="#0A84FF"/></View>
      <HoldButton style={[styles.armButton, styles.armButtonVerticalBottom]} activeOpacity={0.8} onPressIn={()=>decrementArm(index)}><Entypo name="minus" size={18} color="#FFFFFF"/></HoldButton>
      <View style={[styles.armInputBox, styles.armInputBoxVertical]}>
        <TextInput style={[styles.armInput,{fontSize:14}]} value={armInputs[index]} onChangeText={(text)=>handleArmInputChange(index,text)} onSubmitEditing={(e:any)=>handleArmInputSubmit(index,e.nativeEvent.text)} keyboardType="numeric" maxLength={3} selectTextOnFocus />
        <Text style={styles.armInputUnit}>°</Text>
      </View>
    </View>
  ); };

  const renderHorizontalArmCard = (index:number, height?:number)=>{ const value = armValues[index]; const color = ARM_COLORS[index]; const is360Servo = armIs360[index]; const { lo, hi } = armBounds(index, is360Servo); return (
    <View key={index} style={[styles.armCardHorizontal, { borderLeftColor: color }, height?{height}:{flex:1}]}> 
      <View style={styles.armHTitleBox}><Text style={[styles.armTitle,{color}]}>R{index}</Text></View>
      {is360Servo?(<>
        <HoldButton style={[styles.armButton, styles.armButtonHorizontal, { backgroundColor: color }]} activeOpacity={0.8} onPressIn={()=>handle360Rotation(index,'left')} onPressOut={()=>handle360RotationStop(index)}><Entypo name="arrow-left" size={18} color="#FFFFFF"/></HoldButton>
        <View style={styles.armHSliderBox}><CustomSlider value={value} minimumValue={lo} maximumValue={hi} step={1} onValueChange={(val:number)=>handleArmChange(index,val)} trackThickness={7} thumbSize={20} trackColor="#D7E0EA" fillColor={color} thumbColor={color}/></View>
        <HoldButton style={[styles.armButton, styles.armButtonHorizontal, { backgroundColor: color }]} activeOpacity={0.8} onPressIn={()=>handle360Rotation(index,'right')} onPressOut={()=>handle360RotationStop(index)}><Entypo name="arrow-right" size={18} color="#FFFFFF"/></HoldButton>
      </>):(<>
        <HoldButton style={[styles.armButton, styles.armButtonHorizontal, { backgroundColor: color }]} activeOpacity={0.8} onPressIn={()=>startArmHold(index,-1)} onPressOut={stopArmHold}><Entypo name="minus" size={18} color="#FFFFFF"/></HoldButton>
        <View style={styles.armHSliderBox}><CustomSlider value={value} minimumValue={lo} maximumValue={hi} step={1} onValueChange={(val:number)=>handleArmChange(index,val)} trackThickness={7} thumbSize={20} trackColor="#D7E0EA" fillColor={color} thumbColor={color}/></View>
        <HoldButton style={[styles.armButton, styles.armButtonHorizontal, { backgroundColor: color }]} activeOpacity={0.8} onPressIn={()=>startArmHold(index,1)} onPressOut={stopArmHold}><Entypo name="plus" size={18} color="#FFFFFF"/></HoldButton>
      </>) }
      <View style={[styles.armInputBox, styles.armInputBoxHorizontal]}>
        <TextInput style={[styles.armInput,{fontSize:14}]} value={armInputs[index]} onChangeText={(text)=>handleArmInputChange(index,text)} onSubmitEditing={(e:any)=>handleArmInputSubmit(index,e.nativeEvent.text)} keyboardType="numeric" maxLength={3} selectTextOnFocus />
        <Text style={styles.armInputUnit}>{is360Servo?"":"°"}</Text>
      </View>
      <HoldButton style={[styles.armResetButton, styles.armButtonHorizontal]} activeOpacity={0.7} onPressIn={()=>resetArm(index)}><MaterialIcons name="refresh" size={22} color="#0A84FF"/></HoldButton>
    </View>
  ); };

  const overheadEstimate = 115; const estimatedScrollH = Math.max(200, height - overheadEstimate); const effectiveH = robotScrollHeight>0 ? robotScrollHeight : estimatedScrollH; const cardHeight = Math.min(Math.max(70, Math.floor((effectiveH - 30)/3)), 110);

  const content = (<>{[5,4,3,2,1,0].map((i)=> renderHorizontalArmCard(i, cardHeight))}</>);

  if(disableScroll) return (<View style={styles.screenBody} onLayout={(e:any)=> setRobotScrollHeight(e.nativeEvent.layout.height)}>{content}</View>);
  return (<ScrollView style={styles.screenBody} contentContainerStyle={styles.armScrollContent} showsVerticalScrollIndicator={false} onLayout={(e)=> setRobotScrollHeight(e.nativeEvent.layout.height)}>{content}</ScrollView>);
  }

const TAB_ROUTES = [
  { key: 'car', title: 'Araç Kontrol', icon: 'directions-car' },
  { key: 'codes', title: 'Kodlar', icon: 'code' },
  { key: 'arm', title: 'Robot Kol', icon: 'precision-manufacturing' },
] as const;

// Bir bölümün üstü, kaydırma tepesinin bu kadar altına indiğinde o bölüm "aktif" sayılır.
const ACTIVATION_OFFSET = 110;

// Sekmeye tıklayınca yumuşak kaydırma için easing (yavaş başla → hızlan → yavaşla).
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

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

  // Tek sayfa scroll: bölüm ofsetleri (onLayout) + kaydırmaya göre aktif sekme.
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

  const onSectionLayout = (i: number) => (e: any) => {
    sectionOffsets.current[i] = e.nativeEvent.layout.y;
  };

  // Native smooth-scroll yerine mesafeyle orantılı süreli, easing'li kendi
  // animasyonumuzu sürüyoruz (Android ile aynı yumuşak his).
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

  const onScroll = (e: any) => {
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

  const disconnectDevice = async () => {
    console.log('[Header] Disconnect button pressed');
    if (!connectedDevice) return;
    if (!window.confirm('Bağlantı kesilecek. Emin misiniz?')) return;
    try {
      setManuallyDisconnected(true);
      await connectedDevice.disconnect();
      setConnectedDevice(null);
      setMessages([]);
      window.alert('Bağlantı kesildi');
    } catch (e) {
      window.alert('Bağlantı kesilemedi');
    }
  };


  const handleBackPress = () => {
    console.log('[Header] Back button pressed');
    navigation.goBack();
  };

  const handleHomePress = () => {
    console.log('[Header] Home button pressed');
    const idx = navigation.getState()?.index ?? 0;
    if (idx > 0 && typeof window !== 'undefined') {
      window.history.go(-idx);
    } else {
      navigation.navigate('Home');
    }
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


  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
        <StatusBar style={effectiveTheme === 'dark' ? 'light' : 'dark'} />

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
                  size={20}
                  color={activeTab === i ? '#FFFFFF' : colors.textSecondary}
                />
                <Text style={[styles.tabText, activeTab === i && styles.activeTabText]}>
                  {route.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={styles.singlePageContent}
            scrollEventThrottle={16}
            onScroll={onScroll}
            onScrollBeginDrag={cancelScrollAnim}
          >
            <Text style={styles.pageTitle}>Araç Kontrol Paneli</Text>
            <Text style={styles.pageSubtitle}>Tüm kontroller tek sayfada. Mouse kaydırma tüm sayfayı hareket ettirir.</Text>

            <View style={styles.sectionWrap} onLayout={onSectionLayout(0)}>
              <View style={styles.headerPillContainer}>
                <View style={styles.headerPill}>
                  <View style={styles.headerPillIconBox}>
                    <MaterialIcons name="directions-car" size={18} color="#0A84FF" />
                  </View>
                  <Text style={styles.headerPillText}>Araç Kontrol</Text>
                </View>
              </View>
              <RCCarTab disableScroll />
            </View>

            <View style={styles.sectionWrap} onLayout={onSectionLayout(1)}>
              <View style={styles.headerPillContainer}>
                <View style={styles.headerPill}>
                  <View style={styles.headerPillIconBox}>
                    <MaterialIcons name="code" size={18} color="#0A84FF" />
                  </View>
                  <Text style={styles.headerPillText}>Kodlar</Text>
                </View>
              </View>
              <CodesCard />
            </View>

            <View style={styles.sectionWrap} onLayout={onSectionLayout(2)}>
              <View style={styles.headerPillContainer}>
                <View style={styles.headerPill}>
                  <View style={styles.headerPillIconBox}>
                    <MaterialIcons name="precision-manufacturing" size={18} color="#0A84FF" />
                  </View>
                  <Text style={styles.headerPillText}>Robot Kol</Text>
                </View>
              </View>
              <RobotArmTab disableScroll />
            </View>

          </ScrollView>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
