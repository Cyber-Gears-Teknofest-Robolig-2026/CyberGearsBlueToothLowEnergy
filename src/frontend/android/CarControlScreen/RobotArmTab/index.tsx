import { useState, useRef, useEffect } from 'react';
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
import styles from './styles';
import {
  useBluetoothStore,
  useSettingsStore,
} from '../../constants';

const ARM_MIN = 0;
const ARM_MAX = 180;

// 180° servolarda +/- butonu basılı tutulurken değerin tekrar tekrar
// değişme (sağa/sola döndürme) hızı.
const HOLD_REPEAT_MS = 120;

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

export default function RobotArmTab() {

  const connectedDevice = useBluetoothStore((state) => state.connectedDevice);

  const sendValuesHeaders = useSettingsStore((state) => state.sendValuesHeaders);
  const allSendsValues = useSettingsStore((state) => state.allSendsValues);
  const armsAre360Default = useSettingsStore((state) => state.armsAre360Default);
  const ARM_DEFAULT_VALUES = useSettingsStore((state) => state.armValuesDefault);
  const ARM_ANGLE_LIMITS = useSettingsStore((state) => state.armAngleLimitsDefault);
  const ARM_STEP = useSettingsStore((state) => state.armValuesStepDefault);

  const { height } = useWindowDimensions();

  const [robotScrollHeight, setRobotScrollHeight] = useState(0);

  // Bir kolun değer aralığı: 360° modunda hız 0–90, 180° modunda kullanıcı ayarındaki
  // min/max açı (sıralı, ters girilirse de bozulmaz).
  const armBounds = (index: number, is360: boolean) =>
    is360
      ? { lo: 0, hi: 90 }
      : {
          lo: Math.min(ARM_ANGLE_LIMITS[index].min, ARM_ANGLE_LIMITS[index].max),
          hi: Math.max(ARM_ANGLE_LIMITS[index].min, ARM_ANGLE_LIMITS[index].max),
        };

  // Her kolun başlangıç değeri, o kolun moduna (180°/360°) ait varsayılandan gelir
  // ve 180° modunda açı sınırına kıstırılır.
  const initialArmValues = ARM_DEFAULT_VALUES.map((v, i) => {
    if (armsAre360Default[i]) return v.deg360;
    const { lo, hi } = armBounds(i, false);
    return clamp(v.deg180, lo, hi);
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
        await connectedDevice?.write(`${sendValuesHeaders.robot_arm[key]}:${angleValue}\r\n`);
      }
    }

    else {
      const arm_values_new = armValues.map((value, index_) => {
        if (!armIs360[index]) {
          if (index != index_) {
            return value;
          }
          else {
            return angleValue;
          }
        }
        else {
          return 90;
        }
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
          await connectedDevice?.write(`${sendValuesHeaders.robot_arm[key]}:${speedValue}\r\n`);
          break;
        case "left":
          await connectedDevice?.write(`${sendValuesHeaders.robot_arm[key]}:${-speedValue}\r\n`);
          break;
      }
    }
    else {
      const arm_values_new = armValues.map((value, index_) => {
        if (!armIs360[index_]) {
          return value;
        }
        else {
          if (index_ == index) {
            switch (direction) {
              case "right":
                return speedValue;
              case "left":
                return -speedValue;
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
          return value;
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

            {/* Yeni Hız Ayarı Slider'ı (0-90 arası) */}
            <View style={styles.armHSliderBox}>
              <CustomSlider
                value={value}
                minimumValue={0}
                maximumValue={90}
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
  const effectiveH =
    robotScrollHeight > 0 ? robotScrollHeight : estimatedScrollH;

  const cardHeight = Math.max(
    70,
    Math.floor((effectiveH - 30) / 3),
  );

  return (
    <ScrollView
      style={styles.screenBody}
      contentContainerStyle={styles.armScrollContent}
      showsVerticalScrollIndicator={false}
      onLayout={(e) => setRobotScrollHeight(e.nativeEvent.layout.height)}
    >
      {[5, 4, 3, 2, 1, 0].map((i) =>
        renderHorizontalArmCard(i, cardHeight),
      )}
    </ScrollView>
  );
}
