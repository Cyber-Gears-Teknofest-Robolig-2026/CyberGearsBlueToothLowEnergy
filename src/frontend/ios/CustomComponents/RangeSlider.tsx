import { useLayoutEffect, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  StyleProp,
  View,
  ViewStyle,
} from 'react-native';
// CustomSlider ile aynı gerekçe: native gesture (react-native-gesture-handler),
// JS responder sisteminin tekli kısıtını aşar. Bu bileşen tek bir ray üzerinde
// iki tutamak (min/max) taşır; min < max korunur (minGap).
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

type Props = {
  minValue: number;
  maxValue: number;
  minimumValue?: number;
  maximumValue?: number;
  step?: number;
  /** İki tutamak arasındaki en küçük fark (min < max için en az 1). */
  minGap?: number;
  trackThickness?: number;
  thumbSize?: number;
  trackColor?: string;
  fillColor?: string;
  thumbColor?: string;
  thumbBorderColor?: string;
  thumbBorderWidth?: number;
  onChange: (min: number, max: number) => void;
  style?: StyleProp<ViewStyle>;
};

export default function RangeSlider({
  minValue,
  maxValue,
  minimumValue = 0,
  maximumValue = 180,
  step = 1,
  minGap = 1,
  trackThickness = 7,
  thumbSize = 20,
  trackColor = '#E2E8F0',
  fillColor = '#0A84FF',
  thumbColor = '#0A84FF',
  thumbBorderColor = 'transparent',
  thumbBorderWidth = 0,
  onChange,
  style,
}: Props) {
  const [length, setLength] = useState(0);
  const lengthRef = useRef(0);

  const propsRef = useRef({ minValue, maxValue, minimumValue, maximumValue, step, minGap, onChange });
  propsRef.current = { minValue, maxValue, minimumValue, maximumValue, step, minGap, onChange };

  // Sürükleme sırasında akıcı görsel için yerel değerler.
  const [displayMin, setDisplayMin] = useState(minValue);
  const [displayMax, setDisplayMax] = useState(maxValue);
  const activeThumbRef = useRef<'min' | 'max'>('min');
  const isGestureActiveRef = useRef(false);

  // Sürüklenmiyorken dış değerleri görsele aktar.
  useLayoutEffect(() => {
    if (!isGestureActiveRef.current) {
      setDisplayMin(minValue);
      setDisplayMax(maxValue);
    }
  }, [minValue, maxValue]);

  const onLayout = (e: LayoutChangeEvent) => {
    const measured = e.nativeEvent.layout.width;
    if (measured > 0 && measured !== lengthRef.current) {
      lengthRef.current = measured;
      setLength(measured);
    }
  };

  const valueFromCoord = (coord: number) => {
    const len = lengthRef.current;
    const p = propsRef.current;
    if (len <= 0) return p.minimumValue;
    const clampedCoord = Math.max(0, Math.min(len, coord));
    const ratio = clampedCoord / len;
    const range = p.maximumValue - p.minimumValue;
    const raw = p.minimumValue + ratio * range;
    const stepped = p.step > 0 ? Math.round(raw / p.step) * p.step : raw;
    return Math.max(p.minimumValue, Math.min(p.maximumValue, stepped));
  };

  const pickThumb = (v: number): 'min' | 'max' => {
    const p = propsRef.current;
    if (v <= p.minValue) return 'min';
    if (v >= p.maxValue) return 'max';
    return Math.abs(v - p.minValue) <= Math.abs(v - p.maxValue) ? 'min' : 'max';
  };

  const lastSentRef = useRef(0);
  const THROTTLE_MS = 50;

  const applyValue = (v: number, force: boolean) => {
    const p = propsRef.current;
    let nextMin = p.minValue;
    let nextMax = p.maxValue;
    if (activeThumbRef.current === 'min') {
      nextMin = Math.max(p.minimumValue, Math.min(v, p.maxValue - p.minGap));
      setDisplayMin(nextMin);
    } else {
      nextMax = Math.min(p.maximumValue, Math.max(v, p.minValue + p.minGap));
      setDisplayMax(nextMax);
    }
    const now = Date.now();
    if (force || now - lastSentRef.current > THROTTLE_MS) {
      lastSentRef.current = now;
      p.onChange(nextMin, nextMax);
    }
  };

  const panGesture = useRef(
    Gesture.Pan()
      .runOnJS(true)
      .minDistance(0)
      .onBegin((e) => {
        isGestureActiveRef.current = true;
        const v = valueFromCoord(e.x);
        activeThumbRef.current = pickThumb(v);
        applyValue(v, false);
      })
      .onUpdate((e) => {
        applyValue(valueFromCoord(e.x), false);
      })
      .onEnd((e) => {
        isGestureActiveRef.current = false;
        applyValue(valueFromCoord(e.x), true);
      })
      .onFinalize(() => {
        isGestureActiveRef.current = false;
      }),
  ).current;

  const range = maximumValue - minimumValue;
  const ratioMin = range > 0 ? (displayMin - minimumValue) / range : 0;
  const ratioMax = range > 0 ? (displayMax - minimumValue) / range : 0;
  const clampedRatioMin = Math.max(0, Math.min(1, ratioMin));
  const clampedRatioMax = Math.max(0, Math.min(1, ratioMax));

  const crossSize = Math.max(trackThickness, thumbSize);
  const usableLength = Math.max(0, length - thumbSize);
  const thumbOffsetMin = clampedRatioMin * usableLength;
  const thumbOffsetMax = clampedRatioMax * usableLength;
  const fillLeft = thumbOffsetMin + thumbSize / 2;
  const fillWidth = Math.max(0, thumbOffsetMax - thumbOffsetMin);

  const trackCrossOffset = (crossSize - trackThickness) / 2;
  const thumbCrossOffset = (crossSize - thumbSize) / 2;

  return (
    <GestureDetector gesture={panGesture}>
      <View onLayout={onLayout} style={[{ width: '100%', height: crossSize }, style]}>
        <View
          style={{ pointerEvents: 'none',
            position: 'absolute',
            top: trackCrossOffset,
            left: 0,
            width: '100%',
            height: trackThickness,
            backgroundColor: trackColor,
            borderRadius: trackThickness / 2,
          }}
        />
        <View
          style={{ pointerEvents: 'none',
            position: 'absolute',
            top: trackCrossOffset,
            left: fillLeft,
            width: fillWidth,
            height: trackThickness,
            backgroundColor: fillColor,
            borderRadius: trackThickness / 2,
          }}
        />
        <View
          style={{ pointerEvents: 'none',
            position: 'absolute',
            top: thumbCrossOffset,
            left: thumbOffsetMin,
            width: thumbSize,
            height: thumbSize,
            borderRadius: thumbSize / 2,
            backgroundColor: thumbColor,
            borderWidth: thumbBorderWidth,
            borderColor: thumbBorderColor,
          }}
        />
        <View
          style={{ pointerEvents: 'none',
            position: 'absolute',
            top: thumbCrossOffset,
            left: thumbOffsetMax,
            width: thumbSize,
            height: thumbSize,
            borderRadius: thumbSize / 2,
            backgroundColor: thumbColor,
            borderWidth: thumbBorderWidth,
            borderColor: thumbBorderColor,
          }}
        />
      </View>
    </GestureDetector>
  );
}
