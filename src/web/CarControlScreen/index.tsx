import React, { useState, useRef, useEffect } from 'react';
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
import styles from './styles';
import CustomSlider from '../CustomComponents/CustomSlider';
import HoldButton from '../CustomComponents/HoldButton';
import { AppNavigationProp, useBluetoothStore, useSettingsStore } from '../constants';

// --- RCCarTab component (migrated) ---
const PWM_MIN = 0;
const PWM_MAX = 255;

const getSliderValue = (value: number | number[]) => {
  return Array.isArray(value) ? value[0] : value;
};

const clamp = (value: number, min: number, max: number) => {
  return Math.max(min, Math.min(max, Math.round(value)));
};

function RCCarTab({ disableScroll = false }: { disableScroll?: boolean }) {
  const connectedDevice = useBluetoothStore((state) => state.connectedDevice);
  const sendValuesHeaders = useSettingsStore((state) => state.sendValuesHeaders);
  const allSendsValues = useSettingsStore((state) => state.allSendsValues);
  const ziplineAnglesDefault = useSettingsStore((state) => state.ziplineAnglesDefault);
  const SPEED_DEFAULT = useSettingsStore((state) => state.motorSpeedDefault);
  const PWM_STEP = useSettingsStore((state) => state.motorSpeedStepDefault);

  const [ziplineOpen, setZiplineOpen] = useState(false);
  const [vehicleScrollHeight, setVehicleScrollHeight] = useState(0);

  const [speed, setSpeed] = useState(SPEED_DEFAULT);
  const [speedInput, setSpeedInput] = useState(SPEED_DEFAULT.toString());

  const handleDirection = async (direction: string) => {
    switch (direction) {
      case 'forward':
        if (!allSendsValues.motors) {
          await connectedDevice?.write(`${sendValuesHeaders.motor.right_motor}:${speed}\r\n`);
          await connectedDevice?.write(`${sendValuesHeaders.motor.left_motor}:${speed}\r\n`);
        } else {
          await connectedDevice?.write(`${sendValuesHeaders.motor.all_motors}:${speed},${speed}\r\n`);
        }
        break;
      case 'backward':
        if (!allSendsValues.motors) {
          await connectedDevice?.write(`${sendValuesHeaders.motor.right_motor}:-${speed}\r\n`);
          await connectedDevice?.write(`${sendValuesHeaders.motor.left_motor}:-${speed}\r\n`);
        } else {
          await connectedDevice?.write(`${sendValuesHeaders.motor.all_motors}:-${speed},-${speed}\r\n`);
        }
        break;
      case 'right':
        if (!allSendsValues.motors) {
          await connectedDevice?.write(`${sendValuesHeaders.motor.right_motor}:-${speed}\r\n`);
          await connectedDevice?.write(`${sendValuesHeaders.motor.left_motor}:${speed}\r\n`);
        } else {
          await connectedDevice?.write(`${sendValuesHeaders.motor.all_motors}:-${speed},${speed}\r\n`);
        }
        break;
      case 'left':
        if (!allSendsValues.motors) {
          await connectedDevice?.write(`${sendValuesHeaders.motor.right_motor}:${speed}\r\n`);
          await connectedDevice?.write(`${sendValuesHeaders.motor.left_motor}:-${speed}\r\n`);
        } else {
          await connectedDevice?.write(`${sendValuesHeaders.motor.all_motors}:-${speed},${speed}\r\n`);
        }
        break;
    }
  };

  const handleDirectionStop = async () => {
    if (!allSendsValues.motors) {
      await connectedDevice?.write(`${sendValuesHeaders.motor.right_motor}:0\r\n`);
      await connectedDevice?.write(`${sendValuesHeaders.motor.left_motor}:0\r\n`);
    } else {
      await connectedDevice?.write(`${sendValuesHeaders.motor.all_motors}:0,0\r\n`);
    }
  };

  const toggleZipline = async () => {
    const nextValue = !ziplineOpen;
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

  const handleSpeedChange = (rawValue: number | number[]) => {
    const value = getSliderValue(rawValue);
    const pwmValue = clamp(value, PWM_MIN, PWM_MAX);
    setSpeed(pwmValue);
    setSpeedInput(pwmValue.toString());
  };

  const incrementSpeed = () => handleSpeedChange(speed + PWM_STEP);
  const decrementSpeed = () => handleSpeedChange(speed - PWM_STEP);

  const handleSpeedInputChange = (text: string) => {
    const onlyNumbers = text.replace(/[^0-9]/g, '');
    setSpeedInput(onlyNumbers);
    if (onlyNumbers === '') return;
    const numValue = Number(onlyNumbers);
    if (!Number.isNaN(numValue)) setSpeed(clamp(numValue, PWM_MIN, PWM_MAX));
  };

  const normalizeSpeedInput = () => {
    if (speedInput === '') {
      handleSpeedChange(speed);
      return;
    }
    handleSpeedChange(Number(speedInput));
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
        <View style={styles.speedHeaderRow}>
          <View style={styles.cardHeader}>
            <View style={styles.headerIconBox}>
              <MaterialIcons name="speed" size={19.2} color="#0A84FF" />
            </View>
            <View>
              <Text style={styles.sectionTitle}>PWM Hız Kontrolü</Text>
            </View>
          </View>
        </View>

        <View style={styles.speedControlRow}>
          <HoldButton style={styles.roundControlButton} onPressIn={decrementSpeed}><Entypo name="minus" size={20} color="#FFFFFF" /></HoldButton>
          <View style={styles.speedSliderBox}>
            <CustomSlider value={speed} minimumValue={PWM_MIN} maximumValue={PWM_MAX} step={1} onValueChange={handleSpeedChange} trackThickness={8} thumbSize={22} trackColor="#D7E0EA" fillColor="#0A84FF" thumbColor="#0A84FF" />
          </View>
          <HoldButton style={styles.roundControlButton} onPressIn={incrementSpeed}><Entypo name="plus" size={20} color="#FFFFFF" /></HoldButton>
          <View style={styles.speedInputBox}><TextInput style={styles.speedInput} value={speedInput} onChangeText={handleSpeedInputChange} onBlur={normalizeSpeedInput} keyboardType="numeric" maxLength={3} selectTextOnFocus /></View>
        </View>
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
const HOLD_REPEAT_MS = 120;
const ARM_COLORS = ['#6366F1','#0EA5E9','#14B8A6','#22C55E','#F59E0B','#EF4444'];

function RobotArmTab({ disableScroll = false }: { disableScroll?: boolean }) {
  const connectedDevice = useBluetoothStore((state) => state.connectedDevice);
  const sendValuesHeaders = useSettingsStore((state) => state.sendValuesHeaders);
  const allSendsValues = useSettingsStore((state) => state.allSendsValues);
  const armsAre360Default = useSettingsStore((state) => state.armsAre360Default);
  const ARM_DEFAULT_VALUES = useSettingsStore((state) => state.armValuesDefault);
  const ARM_STEP = useSettingsStore((state) => state.armValuesStepDefault);
  const { height } = useWindowDimensions();

  const [robotScrollHeight, setRobotScrollHeight] = useState(0);
  const [armValues, setArmValues] = useState<number[]>([...ARM_DEFAULT_VALUES]);
  const [armIs360, setArmIs360] = useState<boolean[]>([...armsAre360Default]);
  const [armInputs, setArmInputs] = useState<string[]>(ARM_DEFAULT_VALUES.map(String));

  const handleArmChange = async (index: number, rawValue: number | number[]) => {
    const value = getSliderValue(rawValue);
    const min = 0;
    const max = armIs360[index] ? 90 : 180;
    const angleValue = clamp(value, min, max);
    const nextValues = [...armValues]; nextValues[index] = angleValue; setArmValues(nextValues);
    setArmInputs((prev) => { const next = [...prev]; next[index] = String(angleValue); return next; });
    const key: keyof typeof sendValuesHeaders.robot_arm = `robot_arm_${index}` as keyof typeof sendValuesHeaders.robot_arm;
    if (!armIs360[index]) {
      if (!allSendsValues.robot_arms) {
        await connectedDevice?.write(`${sendValuesHeaders.robot_arm[key]}:${angleValue}\r\n`);
      } else {
        const arm_values_new = armValues.map((value, index_) => { if (!armIs360[index]) { if (index != index_) { return value; } else { return angleValue; } } else { return 90; } });
        if (!armIs360[index]) await connectedDevice?.write(`${sendValuesHeaders.robot_arm.all_robot_arms}:${arm_values_new.join(',')}\r\n`);
      }
    }
  };

  const handle360Rotation = async (index: number, direction: 'left'|'right') => {
    const speedValue = armValues[index];
    if (!allSendsValues.robot_arms) {
      const key: keyof typeof sendValuesHeaders.robot_arm = `robot_arm_${index}` as keyof typeof sendValuesHeaders.robot_arm;
      switch(direction){case 'right': await connectedDevice?.write(`${sendValuesHeaders.robot_arm[key]}:${90+speedValue}\r\n`); break; case 'left': await connectedDevice?.write(`${sendValuesHeaders.robot_arm[key]}:${90-speedValue}\r\n`); break}
    } else {
      const arm_values_new = armValues.map((value, index_) => { if (!armIs360[index_]) return value; else { if (index_==index){ switch(direction){case 'right': return 90+speedValue; case 'left': return 90-speedValue;} } else return 90; } });
      await connectedDevice?.write(`${sendValuesHeaders.robot_arm.all_robot_arms}:${arm_values_new.join(',')}\r\n`);
    }
  };

  const handle360RotationStop = async (index:number)=>{ if(!allSendsValues.robot_arms){ const key: keyof typeof sendValuesHeaders.robot_arm = `robot_arm_${index}` as keyof typeof sendValuesHeaders.robot_arm; await connectedDevice?.write(`${sendValuesHeaders.robot_arm[key]}:${90}\r\n`);} else { const arm_values_new = armValues.map((value, idx)=> !armIs360[idx]? value:90); await connectedDevice?.write(`${sendValuesHeaders.robot_arm.all_robot_arms}:${arm_values_new.join(',')}\r\n`); } };

  const resetArm = (index:number)=>handleArmChange(index, ARM_DEFAULT_VALUES[index]);
  const incrementArm = (index:number)=>handleArmChange(index, armValues[index]+ARM_STEP);
  const decrementArm = (index:number)=>handleArmChange(index, armValues[index]-ARM_STEP);

  const armValuesRef = useRef(armValues); armValuesRef.current = armValues;
  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepArm = (index:number, dir:1|-1)=> handleArmChange(index, armValuesRef.current[index]+dir*ARM_STEP);
  const startArmHold = (index:number, dir:1|-1)=>{ stopArmHold(); stepArm(index, dir); holdTimerRef.current = setInterval(()=> stepArm(index, dir), HOLD_REPEAT_MS); };
  const stopArmHold = ()=>{ if(holdTimerRef.current){ clearInterval(holdTimerRef.current); holdTimerRef.current=null;} };
  useEffect(()=>()=>stopArmHold(), []);

  const handleArmInputChange = (index:number, text:string)=>{ const onlyNumbers = text.replace(/[^0-9]/g,''); setArmInputs(prev=>{ const next=[...prev]; next[index]=onlyNumbers; return next; }); if(onlyNumbers!==''){ const min=0; const max=armIs360[index]?90:180; const clampedValue = clamp(Number(onlyNumbers), min, max); setArmValues(prev=>{ const next=[...prev]; next[index]=clampedValue; return next; }); } };
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

  const renderHorizontalArmCard = (index:number, height?:number)=>{ const value = armValues[index]; const color = ARM_COLORS[index]; const is360Servo = armIs360[index]; return (
    <View key={index} style={[styles.armCardHorizontal, { borderLeftColor: color }, height?{height}:{flex:1}]}> 
      <View style={styles.armHTitleBox}><Text style={[styles.armTitle,{color}]}>R{index}</Text></View>
      {is360Servo?(<>
        <HoldButton style={[styles.armButton, styles.armButtonHorizontal, { backgroundColor: color }]} activeOpacity={0.8} onPressIn={()=>handle360Rotation(index,'left')} onPressOut={()=>handle360RotationStop(index)}><Entypo name="arrow-left" size={18} color="#FFFFFF"/></HoldButton>
        <View style={styles.armHSliderBox}><CustomSlider value={value} minimumValue={0} maximumValue={90} step={1} onValueChange={(val:number)=>handleArmChange(index,val)} trackThickness={7} thumbSize={20} trackColor="#D7E0EA" fillColor={color} thumbColor={color}/></View>
        <HoldButton style={[styles.armButton, styles.armButtonHorizontal, { backgroundColor: color }]} activeOpacity={0.8} onPressIn={()=>handle360Rotation(index,'right')} onPressOut={()=>handle360RotationStop(index)}><Entypo name="arrow-right" size={18} color="#FFFFFF"/></HoldButton>
      </>):(<>
        <HoldButton style={[styles.armButton, styles.armButtonHorizontal, { backgroundColor: color }]} activeOpacity={0.8} onPressIn={()=>startArmHold(index,-1)} onPressOut={stopArmHold}><Entypo name="minus" size={18} color="#FFFFFF"/></HoldButton>
        <View style={styles.armHSliderBox}><CustomSlider value={value} minimumValue={ARM_MIN} maximumValue={ARM_MAX} step={1} onValueChange={(val:number)=>handleArmChange(index,val)} trackThickness={7} thumbSize={20} trackColor="#D7E0EA" fillColor={color} thumbColor={color}/></View>
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

  export default function CarControlScreen() {

  const navigation = useNavigation<AppNavigationProp>();
  const layout = useWindowDimensions();

  const connectedDevice = useBluetoothStore((state) => state.connectedDevice);
  const setConnectedDevice = useBluetoothStore((state) => state.setConnectedDevice);
  const setMessages = useBluetoothStore((state) => state.setMessages);
  const setManuallyDisconnected = useBluetoothStore((state) => state.setManuallyDisconnected);

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
        <StatusBar style="dark" />

        <View style={styles.container}>
          <View style={styles.headerWithBack}>
            <TouchableOpacity onPress={handleBackPress} style={styles.backBtn}>
              <MaterialCommunityIcons name="arrow-left" size={22} color="#111827" />
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
                <MaterialCommunityIcons name="home" size={22} color="#111827" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSettingsPress}
                style={styles.homeBtn}
              >
                <MaterialCommunityIcons name="cog" size={22} color="#111827" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleDefaultsPress}
                style={styles.homeBtn}
              >
                <MaterialCommunityIcons name="tune-variant" size={22} color="#111827" />
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

          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.singlePageContent}>
            <Text style={styles.pageTitle}>Araç Kontrol Paneli</Text>
            <Text style={styles.pageSubtitle}>Tüm kontroller tek sayfada. Mouse kaydırma tüm sayfayı hareket ettirir.</Text>

            <View style={styles.sectionWrap}>
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

            <View style={styles.sectionWrap}>
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
