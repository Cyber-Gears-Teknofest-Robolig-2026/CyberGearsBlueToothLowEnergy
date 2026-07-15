import { useState, useMemo } from 'react';
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
// Native gesture: zipline butonu, bir yön butonu basılı tutulurken bile bağımsız tetiklensin.
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Entypo, MaterialIcons } from '@expo/vector-icons';
import CustomSlider from '../../CustomComponents/CustomSlider';
import HoldButton from '../../CustomComponents/HoldButton';
import ToggleSwitch from '../../CustomComponents/ToggleSwitch';
import { makeStyles } from './styles';
import { useThemeColors } from '../../theme';
import {
  useBluetoothStore,
  useSettingsStore,
} from '../../constants';

const getSliderValue = (value: number | number[]) => {
  return Array.isArray(value) ? value[0] : value;
};

const clamp = (value: number, min: number, max: number) => {
  return Math.max(min, Math.min(max, Math.round(value)));
};

// Referans telefon: Xiaomi Redmi Note 11 Pro (yatay). Üst satır (yön paneli +
// zipline) bu yükseklikte tam oturuyordu. Daha büyük ekranlarda satırın yüksekliğini
// bu değerde sabitliyoruz ki zipline butonu ekranı doldurup dev gibi büyümesin;
// kendi telefonunda (≤ referans) görünüm birebir aynı kalır.
const REFERENCE_SCROLL_HEIGHT = 285;

export default function RCCarTab({ disableScroll = false }: { disableScroll?: boolean }) {

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
    }
    else {
      await connectedDevice?.write(`${sendValuesHeaders.motor.all_motors}:${r},${l}\r\n`);
    }
  };

  const handleDirectionStop = async () => {
    console.log('Direction: stop');
    if (!allSendsValues.motors) {
      await connectedDevice?.write(`${sendValuesHeaders.motor.right_motor}:0\r\n`);
      await connectedDevice?.write(`${sendValuesHeaders.motor.left_motor}:0\r\n`);
    }
    else {
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
      }
      else {
        await connectedDevice?.write(`${sendValuesHeaders.zipline.front_zipline}:${ziplineAnglesDefault.front.close}\r\n`);
        await connectedDevice?.write(`${sendValuesHeaders.zipline.back_zipline}:${ziplineAnglesDefault.back.close}\r\n`);
      }
    }
    else {
      if (nextValue) {
        await connectedDevice?.write(`${sendValuesHeaders.zipline.all_ziplines}:${ziplineAnglesDefault.front.open},${ziplineAnglesDefault.back.open}\r\n`);
      }
      else {
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
        <TouchableOpacity style={[styles.roundControlButton, { backgroundColor: fillColor }]} onPress={ctrl.decrement}>
          <Entypo name="minus" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.speedSliderBox}>
          <CustomSlider
            value={ctrl.value}
            minimumValue={ctrl.min}
            maximumValue={ctrl.max}
            step={1}
            onValueChange={ctrl.apply}
            trackThickness={8}
            thumbSize={22}
            trackColor="#D7E0EA"
            fillColor={fillColor}
            thumbColor={fillColor}
          />
        </View>

        <TouchableOpacity style={[styles.roundControlButton, { backgroundColor: fillColor }]} onPress={ctrl.increment}>
          <Entypo name="plus" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={[styles.speedInputBox, { width: inputBoxWidth }]}>
          <TextInput
            style={styles.speedInput}
            value={ctrl.input}
            onChangeText={ctrl.onInput}
            onBlur={ctrl.normalize}
            keyboardType="numeric"
            maxLength={inputMaxLen}
            selectTextOnFocus
          />
          <Text style={styles.speedInputUnit}>PWM</Text>
        </View>
      </View>
    );
  };

  // Üst satır (yön paneli + zipline) yüksekliği: referans telefonla sınırlı.
  const topRowHeight =
    vehicleScrollHeight > 0
      ? Math.min(vehicleScrollHeight, REFERENCE_SCROLL_HEIGHT) - 10
      : 0;

  // Yön paneli + zipline içeriğini, satır yüksekliğine göre GERÇEK boyutlarıyla
  // (transform değil) ölçekliyoruz. Transform sadece görüntüyü küçültür, layout
  // yüksekliği doğal kalır ve dar ekranda "aşağı" butonu yine taşardı. Burada
  // gerçek genişlik/yükseklik/margin/ikon boyutları küçüldüğü için içerik fiziksel
  // olarak sığar. Telefon/tablette yeterli alan var → s = 1 → görünüm birebir aynı.
  const DIR_PAD_NATURAL_HEIGHT = 218; // yön paddingi (8) + 3 buton sırası (66+margin=70)
  const DIR_CARD_OVERHEAD = 52; // border(2) + kart dikey padding(14) + başlık(32) + 4px pay
  const s =
    topRowHeight > 0
      ? Math.min(1, Math.max(0.5, (topRowHeight - DIR_CARD_OVERHEAD) / DIR_PAD_NATURAL_HEIGHT))
      : 1;

  // Ölçekli inline stil parçaları (s = 1 iken statik stillerle birebir aynı değerler).
  const dpButton = { width: 130 * s, height: 66 * s, borderRadius: 16 * s, marginVertical: 2 * s };
  const dpCenter = { width: 56 * s, height: 56 * s, borderRadius: 28 * s };
  const dpRow = { gap: 12 * s };
  const dpPad = { paddingVertical: 4 * s };
  const dpArrowIcon = Math.round(36 * s);
  const dpCenterIcon = Math.round(32 * s);

  const zipStatusRow = { height: 32 * s, marginTop: 8 * s };
  const zipIconCircle = { width: 40 * s, height: 40 * s, borderRadius: 20 * s };
  const zipButton = { minHeight: 100 * s, gap: 5 * s, marginTop: 8 * s };
  const zipLockIcon = Math.round(26 * s);
  const zipButtonText = { fontSize: 15 * s };

  const content = (
    <>
      <View
        style={[
          styles.vehicleTopRow,
          topRowHeight > 0 ? { height: topRowHeight } : null,
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

          <View style={[styles.directionPad, dpPad]}>
            <HoldButton
              style={[styles.directionButton, dpButton]}
              activeOpacity={0.78}
              onPressIn={() => handleDirection('forward')}
              onPressOut={handleDirectionStop}
            >
              <Entypo name="arrow-up" size={dpArrowIcon} color="#FFFFFF" />
            </HoldButton>

            <View style={[styles.directionRow, dpRow]}>
              <HoldButton
                style={[styles.directionButton, dpButton]}
                activeOpacity={0.78}
                onPressIn={() => handleDirection('left')}
                onPressOut={handleDirectionStop}
              >
                <Entypo name="arrow-left" size={dpArrowIcon} color="#FFFFFF" />
              </HoldButton>

              <View style={[styles.directionCenter, dpCenter]}>
                <MaterialIcons
                  name="directions-car"
                  size={dpCenterIcon}
                  color="#0A84FF"
                />
              </View>

              <HoldButton
                style={[styles.directionButton, dpButton]}
                activeOpacity={0.78}
                onPressIn={() => handleDirection('right')}
                onPressOut={handleDirectionStop}
              >
                <Entypo name="arrow-right" size={dpArrowIcon} color="#FFFFFF" />
              </HoldButton>
            </View>

            <HoldButton
              style={[styles.directionButton, dpButton]}
              activeOpacity={0.78}
              onPressIn={() => handleDirection('backward')}
              onPressOut={handleDirectionStop}
            >
              <Entypo name="arrow-down" size={dpArrowIcon} color="#FFFFFF" />
            </HoldButton>
          </View>
        </View>

        <View style={styles.cardSmall}>
          <View style={styles.cardHeader}>
            <View
              style={[
                styles.headerIconBox,
                ziplineOpen ? styles.headerIconBoxGreen : styles.headerIconBoxRed,
              ]}
            >
              <MaterialIcons
                name={ziplineOpen ? 'lock-open' : 'lock'}
                size={19.2}
                color={ziplineOpen ? '#22C55E' : '#EF4444'}
              />
            </View>

            <View>
              <Text style={styles.sectionTitle}>Zipline Mekanizması</Text>
            </View>
          </View>

          <View style={[styles.ziplineStatusRow, zipStatusRow]}>
            <Text style={styles.ziplineStatusLabel}>Durum</Text>

            <View
              style={[
                styles.ziplineStatusPill,
                ziplineOpen ? styles.ziplineStatusOpen : styles.ziplineStatusClosed,
              ]}
            >
              <Text style={styles.ziplineStatusText}>
                {ziplineOpen ? 'AÇIK' : 'KAPALI'}
              </Text>
            </View>
          </View>

          <GestureDetector
            gesture={Gesture.Tap()
              .runOnJS(true)
              .onEnd((_event, success) => {
                if (success) {
                  toggleZipline();
                }
              })}
          >
            <View
              style={[
                styles.ziplineButton,
                zipButton,
                ziplineOpen ? styles.ziplineOpen : styles.ziplineClosed,
              ]}
            >
              <View style={[styles.ziplineIconCircle, zipIconCircle]}>
                <MaterialIcons
                  name={ziplineOpen ? 'lock-open' : 'lock'}
                  size={zipLockIcon}
                  color="#FFFFFF"
                />
              </View>

              <Text style={[styles.ziplineButtonText, zipButtonText]}>
                {ziplineOpen ? 'AÇIK' : 'KAPALI'}
              </Text>
            </View>
          </GestureDetector>
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

  // Tek sayfa (single-page) modunda: dış ScrollView yerine düz View döner; ölçü
  // (onLayout) yine alınır ki referans-yükseklik ölçekleme mantığı çalışsın.
  if (disableScroll) {
    return (
      <View
        style={[styles.screenBody, { padding: 5, gap: 5 }]}
        onLayout={(e) => setVehicleScrollHeight(e.nativeEvent.layout.height)}
      >
        {content}
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screenBody}
      contentContainerStyle={styles.vehicleScrollContent}
      showsVerticalScrollIndicator={false}
      onLayout={(e) => setVehicleScrollHeight(e.nativeEvent.layout.height)}
    >
      {content}
    </ScrollView>
  );
}
