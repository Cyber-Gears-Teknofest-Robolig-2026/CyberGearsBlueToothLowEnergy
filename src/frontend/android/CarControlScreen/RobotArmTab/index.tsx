import { useState, useRef, useEffect, useMemo } from 'react';
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Entypo, MaterialIcons } from '@expo/vector-icons';
import CustomSlider from '../../CustomComponents/CustomSlider';
import HoldButton from '../../CustomComponents/HoldButton';
import { makeStyles } from './styles';
import { useThemeColors } from '../../theme';
import {
  useBluetoothStore,
  useSettingsStore,
} from '../../constants';

const ARM_MIN = 0;
const ARM_MAX = 180;

// Referans telefon: Xiaomi Redmi Note 11 Pro (yatay). Bu ekranda kaydırma alanı
// yaklaşık bu yükseklikteydi ve 3 slider tam oturuyordu. Kart yüksekliğini bu
// değerde sabitlemek (tavan) için kullanılır; daha büyük ekranlarda kartlar dev
// gibi büyümesin, aynı boyutta kalıp daha fazlası tek ekrana sığsın diye.
const REFERENCE_SCROLL_HEIGHT = 285;

// 180° servolarda +/- butonu basılı tutulurken değerin tekrar tekrar
// değişme (sağa/sola döndürme) hızı. BLE backend artık yüksek bağlantı önceliği
// + write-without-response kullandığından bu aralık güvenle düşürülebilir.
const HOLD_REPEAT_MS = 50;

const ARM_COLORS = [
  '#6366F1',
  '#0EA5E9',
  '#14B8A6',
  '#22C55E',
  '#F59E0B',
  '#EF4444',
];

const getSliderValue = (value: number | number[]) => {
  return Array.isArray(value) ? value[0] : value;
};

const clamp = (value: number, min: number, max: number) => {
  return Math.max(min, Math.min(max, Math.round(value)));
};

export default function RobotArmTab({ disableScroll = false }: { disableScroll?: boolean }) {

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

  // Açı yönü ters ayarı (kol başına): 180° → gönderilen açı 180-açı; 360° → işaret tersine.
  const wire180 = (angle: number, i: number) => (armDirReversed[i] ? 180 - angle : angle);
  const wire360 = (signed: number, i: number) => (armDirReversed[i] ? -signed : signed);

  const { height } = useWindowDimensions();

  const [robotScrollHeight, setRobotScrollHeight] = useState(0);

  // Bir kolun değer aralığı: 360° modunda kullanıcı ayarındaki min/max hız (0–90),
  // 180° modunda kullanıcı ayarındaki min/max açı (sıralı, ters girilirse de bozulmaz).
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

  // Her kolun başlangıç değeri, o kolun moduna (180°/360°) ait varsayılandan gelir
  // ve o modun [min, max] sınırına kıstırılır.
  const initialArmValues = ARM_DEFAULT_VALUES.map((v, i) => {
    const is360 = armsAre360Default[i];
    const { lo, hi } = armBounds(i, is360);
    return clamp(is360 ? v.deg360 : v.deg180, lo, hi);
  });

  const [armValues, setArmValues] = useState<number[]>([...initialArmValues]);
  const [armIs360, setArmIs360] = useState<boolean[]>([...armsAre360Default]);
  // TextInput'lar için ayrı metin state'i: alan düzenlenirken boş bırakılabilsin.
  const [armInputs, setArmInputs] = useState<string[]>(initialArmValues.map(String));

  const handleArmChange = async (index: number, rawValue: number | number[]) => {
    const value = getSliderValue(rawValue);
    const { lo, hi } = armBounds(index, armIs360[index]);
    const angleValue = clamp(value, lo, hi);

    const nextValues = [...armValues];
    nextValues[index] = angleValue;
    setArmValues(nextValues);

    // Input metnini de güncel değere eşitle (slider/buton/submit hepsi buradan geçiyor).
    setArmInputs((prev) => {
      const next = [...prev];
      next[index] = String(angleValue);
      return next;
    });

    const key: keyof typeof sendValuesHeaders.robot_arm = `robot_arm_${index}` as keyof typeof sendValuesHeaders.robot_arm;

    if (!armIs360[index]) {
      console.log(`Arm ${index}:`, angleValue);
    }
    else {
      console.log(`Arm ${index} (360) Speed:`, angleValue);
    }

    if (!allSendsValues.robot_arms) {
      if (!armIs360[index]) {
        await connectedDevice?.write(`${sendValuesHeaders.robot_arm[key]}:${wire180(angleValue, index)}\r\n`);
      }
    }

    else {
      // 180° slider'ı oynatınca toplu gönder: 360° servolar her zaman 0 (dursun),
      // oynatılan 180° kolu yeni değerini, diğer 180° kollar mevcut değerini alır.
      const arm_values_new = armValues.map((value, index_) => {
        if (armIs360[index_]) {
          return 0;
        }
        const a = index_ === index ? angleValue : value;
        return wire180(a, index_);
      })
      if (!armIs360[index]) {
        await connectedDevice?.write(`${sendValuesHeaders.robot_arm.all_robot_arms}:${arm_values_new.join(",")}\r\n`);
      }
    }
  };

  const handle360Rotation = async (index: number, direction: 'left' | 'right') => {
    const speedValue = armValues[index];
    console.log(`Arm ${index} (360) Rotating ${direction} at speed:`, speedValue);
    if (!allSendsValues.robot_arms) {
      const key: keyof typeof sendValuesHeaders.robot_arm = `robot_arm_${index}` as keyof typeof sendValuesHeaders.robot_arm;
      switch (direction) {
        case "right":
          await connectedDevice?.write(`${sendValuesHeaders.robot_arm[key]}:${wire360(speedValue, index)}\r\n`);
          break;
        case "left":
          await connectedDevice?.write(`${sendValuesHeaders.robot_arm[key]}:${wire360(-speedValue, index)}\r\n`);
          break;
      }
    }
    else {
      const arm_values_new = armValues.map((value, index_) => {
        if (!armIs360[index_]) {
          return wire180(value, index_);
        }
        else {
          if (index_ == index) {
            switch (direction) {
              case "right":
                return wire360(speedValue, index_);
              case "left":
                return wire360(-speedValue, index_);
            }
          }
          else {
            return 0;
          }
        }
      })
      await connectedDevice?.write(`${sendValuesHeaders.robot_arm.all_robot_arms}:${arm_values_new.join(",")}\r\n`);
    }
  };

  const handle360RotationStop = async (index: number) => {
    console.log(`Arm ${index + 1} (360) Stop`);
    if (!allSendsValues.robot_arms) {
      const key: keyof typeof sendValuesHeaders.robot_arm = `robot_arm_${index}` as keyof typeof sendValuesHeaders.robot_arm;
      await connectedDevice?.write(`${sendValuesHeaders.robot_arm[key]}:${0}\r\n`);
    }
    else {
      const arm_values_new = armValues.map((value, index) => {
        if (!armIs360[index]) {
          return wire180(value, index);
        }
        else {
          return 0;
        }
      })
      await connectedDevice?.write(`${sendValuesHeaders.robot_arm.all_robot_arms}:${arm_values_new.join(",")}\r\n`);
    }
  };

  const resetArm = (index: number) => {
    const def = armIs360[index] ? ARM_DEFAULT_VALUES[index].deg360 : ARM_DEFAULT_VALUES[index].deg180;
    console.log(`Arm ${index + 1} reset to default:`, def);
    handleArmChange(index, def);
  };

  const incrementArm = (index: number) => {
    handleArmChange(index, armValues[index] + ARM_STEP);
  };

  const decrementArm = (index: number) => {
    handleArmChange(index, armValues[index] - ARM_STEP);
  };

  // Basılı tut → değeri tekrar tekrar değiştir (180° servoyu sağa/sola döndürmek
  // gibi). setInterval içindeki closure bayatlamasın diye en güncel değerleri
  // ref'ten okuyoruz.
  const armValuesRef = useRef(armValues);
  armValuesRef.current = armValues;
  // Gelen komut ayrıştırma için en güncel kol modları + parça (chunk) tamponu.
  const armIs360Ref = useRef(armIs360);
  armIs360Ref.current = armIs360;
  const rxBufferRef = useRef('');
  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stepArm = (index: number, dir: 1 | -1) => {
    handleArmChange(index, armValuesRef.current[index] + dir * ARM_STEP);
  };

  const startArmHold = (index: number, dir: 1 | -1) => {
    stopArmHold();
    stepArm(index, dir); // ilk adımı hemen uygula
    holdTimerRef.current = setInterval(() => stepArm(index, dir), HOLD_REPEAT_MS);
  };

  const stopArmHold = () => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  // Ekrandan çıkılırsa sayaç takılı kalmasın.
  useEffect(() => () => stopArmHold(), []);

  // ------------------------------------------------------------------------
  // GELEN KOMUTLARI OKU → slider'ı + input'u güncelle (BT'ye geri YAZMAZ).
  // Cihaz, uygulamanın gönderdiği kol komutuyla aynı formatta yollar (örn.
  // "R5:0"). Header ayardaki robot_arm başlıklarıyla eşleşirse ilgili kolu ayarlar.
  // Gönderimde uygulanan "ters yön" dönüşümünün TERSİ uygulanır (180°: ters ise
  // 180-değer; 360°: hız büyüklüğü = |değer|). Değer kolun [min,max] sınırına kıstırılır.
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
      setArmValues((prev) => {
        const next = [...prev];
        next[index] = v;
        return next;
      });
      setArmInputs((prev) => {
        const next = [...prev];
        next[index] = String(v);
        return next;
      });
    };

    const processLine = (line: string) => {
      const idx = line.indexOf(':');
      if (idx <= 0) return;
      const header = line.slice(0, idx).trim();
      const valuePart = line.slice(idx + 1).trim();
      const headers = useSettingsStore.getState().sendValuesHeaders.robot_arm;

      // Tek kol: R0..R5 (tam eşleşme; "R" ön ekiyle karışmaz).
      for (let n = 0; n <= 5; n++) {
        const key = `robot_arm_${n}` as keyof typeof headers;
        if (header === headers[key]) {
          applyIncoming(n, Number(valuePart));
          return;
        }
      }
      // Tüm kollar: "R:v0,v1,...,v5"
      if (header === headers.all_robot_arms) {
        valuePart.split(',').forEach((p, i) => applyIncoming(i, Number(p.trim())));
      }
    };

    const sub = connectedDevice.onDataReceived((event) => {
      // Android satır-bazlı, web chunk verir → tampon + satır ayrıştırma ikisini de kapsar.
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

  const handleArmInputChange = (index: number, text: string) => {
    const onlyNumbers = text.replace(/[^0-9]/g, '');

    // Ham metni doğrudan yaz: alan düzenlenirken boş kalabilsin.
    setArmInputs((prev) => {
      const next = [...prev];
      next[index] = onlyNumbers;
      return next;
    });

    // Sayı varsa slider'ı canlı oynat (boşsa dokunma, BT gönderme).
    if (onlyNumbers !== '') {
      const { lo, hi } = armBounds(index, armIs360[index]);
      const clampedValue = clamp(Number(onlyNumbers), lo, hi);
      setArmValues((prev) => {
        const next = [...prev];
        next[index] = clampedValue;
        return next;
      });
    }
  };

  const handleArmInputSubmit = (index: number, text: string) => {
    const onlyNumbers = text.replace(/[^0-9]/g, '');
    const numValue = onlyNumbers === '' ? 0 : Number(onlyNumbers);

    // "Bitti"ye basınca: slider'ı elle oynatmışım gibi event'i tetikle → BT gönder.
    handleArmChange(index, numValue);
  };

  const renderVerticalArmCard = (index: number) => {
    const value = armValues[index];

    return (
      <View
        key={index}
        style={styles.armCard}
      >
        <View style={styles.armTop}>
          <Text style={styles.armTitle}>
            R{index}
          </Text>

          <TouchableOpacity
            style={styles.armResetButton}
            activeOpacity={0.7}
            onPress={() => resetArm(index)}
          >
            <MaterialIcons name="refresh" size={16} color="#0A84FF" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.armButton, styles.armButtonVerticalTop]}
          activeOpacity={0.8}
          onPress={() => incrementArm(index)}
        >
          <Entypo name="plus" size={18} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.verticalSliderBox}>
          <CustomSlider
            value={value}
            minimumValue={ARM_MIN}
            maximumValue={ARM_MAX}
            step={1}
            vertical
            onValueChange={(val: number) => handleArmChange(index, val)}
            trackThickness={7}
            thumbSize={20}
            trackColor="#D7E0EA"
            fillColor="#0A84FF"
            thumbColor="#0A84FF"
          />
        </View>

        <TouchableOpacity
          style={[styles.armButton, styles.armButtonVerticalBottom]}
          activeOpacity={0.8}
          onPress={() => decrementArm(index)}
        >
          <Entypo name="minus" size={18} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={[styles.armInputBox, styles.armInputBoxVertical]}>
          <TextInput
            style={[styles.armInput, { fontSize: 14 }]}
            value={armInputs[index]}
            onChangeText={(text) => handleArmInputChange(index, text)}
            onSubmitEditing={(e) => handleArmInputSubmit(index, e.nativeEvent.text)}
            keyboardType="numeric"
            maxLength={3}
            selectTextOnFocus
          />
          <Text style={styles.armInputUnit}>°</Text>
        </View>
      </View>
    );
  };

  const renderHorizontalArmCard = (index: number, height?: number) => {
    const value = armValues[index];
    const color = ARM_COLORS[index];
    const is360Servo = armIs360[index];
    const { lo, hi } = armBounds(index, is360Servo);

    return (
      <View
        key={index}
        style={[
          styles.armCardHorizontal,
          { borderLeftColor: color },
          height ? { height } : { flex: 1 },
        ]}
      >
        <View style={styles.armHTitleBox}>
          <Text style={[styles.armTitle, { color }]}>
            R{index}
          </Text>
        </View>

        {is360Servo ? (
          <>
            {/* E1 ve E5 (360) için eski eksi butonu iptal edildi */}
            {/*
            <TouchableOpacity
              style={[
                styles.armButton,
                styles.armButtonHorizontal,
                {
                  backgroundColor: color,
                },
              ]}
              activeOpacity={0.8}
              onPress={() => decrementArm(index)}
            >
              <Entypo name="minus" size={18} color="#FFFFFF" />
            </TouchableOpacity>
            */}

            {/* Yeni Sol Ok Butonu */}
            <HoldButton
              style={[
                styles.armButton,
                styles.armButtonHorizontal,
                {
                  backgroundColor: color,
                },
              ]}
              activeOpacity={0.8}
              onPressIn={() => handle360Rotation(index, 'left')}
              onPressOut={() => handle360RotationStop(index)}
            >
              <Entypo name="arrow-left" size={18} color="#FFFFFF" />
            </HoldButton>

            {/* Hız Ayarı Slider'ı (ayardaki min–max aralığında) */}
            <View style={styles.armHSliderBox}>
              <CustomSlider
                value={value}
                minimumValue={lo}
                maximumValue={hi}
                step={1}
                onValueChange={(val: number) => handleArmChange(index, val)}
                trackThickness={7}
                thumbSize={20}
                trackColor="#D7E0EA"
                fillColor={color}
                thumbColor={color}
              />
            </View>

            {/* Yeni Sağ Ok Butonu */}
            <HoldButton
              style={[
                styles.armButton,
                styles.armButtonHorizontal,
                {
                  backgroundColor: color,
                },
              ]}
              activeOpacity={0.8}
              onPressIn={() => handle360Rotation(index, 'right')}
              onPressOut={() => handle360RotationStop(index)}
            >
              <Entypo name="arrow-right" size={18} color="#FFFFFF" />
            </HoldButton>
          </>
        ) : (
          <>
            <HoldButton
              style={[
                styles.armButton,
                styles.armButtonHorizontal,
                {
                  backgroundColor: color,
                },
              ]}
              activeOpacity={0.8}
              onPressIn={() => startArmHold(index, -1)}
              onPressOut={stopArmHold}
            >
              <Entypo name="minus" size={18} color="#FFFFFF" />
            </HoldButton>

            <View style={styles.armHSliderBox}>
              <CustomSlider
                value={value}
                minimumValue={lo}
                maximumValue={hi}
                step={1}
                onValueChange={(val: number) => handleArmChange(index, val)}
                trackThickness={7}
                thumbSize={20}
                trackColor="#D7E0EA"
                fillColor={color}
                thumbColor={color}
              />
            </View>

            <HoldButton
              style={[
                styles.armButton,
                styles.armButtonHorizontal,
                {
                  backgroundColor: color,
                },
              ]}
              activeOpacity={0.8}
              onPressIn={() => startArmHold(index, 1)}
              onPressOut={stopArmHold}
            >
              <Entypo name="plus" size={18} color="#FFFFFF" />
            </HoldButton>
          </>
        )}

        <View style={[styles.armInputBox, styles.armInputBoxHorizontal]}>
          <TextInput
            style={[styles.armInput, { fontSize: 14 }]}
            value={armInputs[index]}
            onChangeText={(text) => handleArmInputChange(index, text)}
            onSubmitEditing={(e) => handleArmInputSubmit(index, e.nativeEvent.text)}
            keyboardType="numeric"
            maxLength={3}
            selectTextOnFocus
          />
          <Text style={styles.armInputUnit}>{is360Servo ? "" : "°"}</Text>
        </View>

        <TouchableOpacity
          style={[styles.armResetButton, styles.armButtonHorizontal]}
          activeOpacity={0.7}
          onPress={() => resetArm(index)}
        >
          <MaterialIcons
            name="refresh"
            size={22}
            color="#0A84FF"
          />
        </TouchableOpacity>
      </View>
    );
  };

  const overheadEstimate = 115;
  const estimatedScrollH = Math.max(200, height - overheadEstimate);
  const measuredScrollH =
    robotScrollHeight > 0 ? robotScrollHeight : estimatedScrollH;

  // Kart yüksekliğini hesaplarken kullanılan yüksekliği referans telefonla sınırla.
  // Kendi telefonunda (≤ referans) hiçbir şey değişmez: 3 kart yine tam oturur.
  // Daha büyük ekranlarda yükseklik sabit kalır → kartlar aynı boyutta durur ve
  // tek ekrana 3'ten fazla kol sığabilir. Kısa ekranlarda alttaki Math.max(70, …)
  // taban sınırı devrede kalır.
  const effectiveH = Math.min(measuredScrollH, REFERENCE_SCROLL_HEIGHT);

  const cardHeight = Math.max(
    70,
    Math.floor((effectiveH - 30) / 3),
  );

  const content = [5, 4, 3, 2, 1, 0].map((i) =>
    renderHorizontalArmCard(i, cardHeight),
  );

  // Tek sayfa (single-page) modunda: dış ScrollView yerine düz View döner; ölçü
  // (onLayout) yine alınır ki kart yüksekliği mantığı çalışsın.
  if (disableScroll) {
    return (
      <View
        style={[styles.screenBody, { padding: 5, gap: 5 }]}
        onLayout={(e) => setRobotScrollHeight(e.nativeEvent.layout.height)}
      >
        {content}
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screenBody}
      contentContainerStyle={styles.armScrollContent}
      showsVerticalScrollIndicator={false}
      onLayout={(e) => setRobotScrollHeight(e.nativeEvent.layout.height)}
    >
      {content}
    </ScrollView>
  );
}
