import { useRef, useState, useEffect } from 'react';
import {
  LayoutChangeEvent,
  StyleProp,
  View,
  ViewStyle,
} from 'react-native';
// PanResponder yerine native gesture: React Native'in JS responder sistemi aynı anda
// TEK bir responder'a izin verdiği için 2 slider'ı 2 parmakla oynatmak mümkün değildi.
// react-native-gesture-handler her slider'ın dokunuşunu bağımsız (native) izler →
// çoklu dokunma (aynı anda birden fazla slider/buton) çalışır.
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

type Props = {
  value: number;
  minimumValue?: number;
  maximumValue?: number;
  step?: number;
  vertical?: boolean;
  trackThickness?: number;
  thumbSize?: number;
  trackColor?: string;
  fillColor?: string;
  thumbColor?: string;
  onValueChange: (value: number) => void;
  style?: StyleProp<ViewStyle>;
};

export default function CustomSlider({
  value,
  minimumValue = 0,
  maximumValue = 100,
  step = 1,
  vertical = false,
  trackThickness = 8,
  thumbSize = 24,
  trackColor = '#D7E0EA',
  fillColor = '#0A84FF',
  thumbColor = '#0A84FF',
  onValueChange,
  style,
}: Props) {
  const [length, setLength] = useState(0);
  const lengthRef = useRef(0);

  const propsRef = useRef({
    minimumValue,
    maximumValue,
    step,
    vertical,
    onValueChange,
  });
  propsRef.current = {
    minimumValue,
    maximumValue,
    step,
    vertical,
    onValueChange,
  };

  // Local displayed value to ensure visual updates during concurrent multi-touch.
  const [displayValue, setDisplayValue] = useState(value);
  // Sync with prop value — forces a re-render of visual elements even if gestures are active.
  useEffect(() => {
    setDisplayValue(value);
  }, [value]);

  const onLayout = (e: LayoutChangeEvent) => {
    const measured = vertical
      ? e.nativeEvent.layout.height
      : e.nativeEvent.layout.width;
    if (measured > 0 && measured !== lengthRef.current) {
      lengthRef.current = measured;
      setLength(measured);
    }
  };

  // Throttle sending value to parent to reduce JS-thread load during multi-touch.
  const lastSentRef = useRef(0);
  const THROTTLE_MS = 50; // send at most every 50ms while dragging

  const updateFromCoord = (coord: number) => {
    const len = lengthRef.current;
    if (len <= 0) return;
    const p = propsRef.current;
    const clampedCoord = Math.max(0, Math.min(len, coord));
    const ratio = p.vertical
      ? (len - clampedCoord) / len
      : clampedCoord / len;
    const range = p.maximumValue - p.minimumValue;
    const raw = p.minimumValue + ratio * range;
    const stepped =
      p.step > 0 ? Math.round(raw / p.step) * p.step : raw;
    const clamped = Math.max(
      p.minimumValue,
      Math.min(p.maximumValue, stepped),
    );
    // Update local display immediately for smooth visuals during gesture
    setDisplayValue(clamped);

    // Throttle parent updates (which may trigger heavy re-renders / IO)
    const now = Date.now();
    if (now - lastSentRef.current > THROTTLE_MS) {
      lastSentRef.current = now;
      p.onValueChange(clamped);
    }
  };

  // minDistance(0): dokunur dokunmaz aktive olsun (tap-to-set + sürükleme).
  // runOnJS(true): callback'ler JS thread'inde çalışsın (state/onValueChange direkt çağrılabilsin).
  // e.x / e.y view'a göre konumdur → doğrudan koordinat olarak kullanıyoruz.
  const panGesture = useRef(
    Gesture.Pan()
      .runOnJS(true)
      .minDistance(0)
      .onBegin((e) => {
        updateFromCoord(propsRef.current.vertical ? e.y : e.x);
      })
      .onUpdate((e) => {
        updateFromCoord(propsRef.current.vertical ? e.y : e.x);
      })
      .onEnd((e) => {
        // Ensure final value is committed to parent on gesture end
        const p = propsRef.current;
        const coord = p.vertical ? e.y : e.x;
        const len = lengthRef.current;
        if (len <= 0) return;
        const clampedCoord = Math.max(0, Math.min(len, coord));
        const ratio = p.vertical
          ? (len - clampedCoord) / len
          : clampedCoord / len;
        const range = p.maximumValue - p.minimumValue;
        const raw = p.minimumValue + ratio * range;
        const stepped = p.step > 0 ? Math.round(raw / p.step) * p.step : raw;
        const clamped = Math.max(p.minimumValue, Math.min(p.maximumValue, stepped));
        setDisplayValue(clamped);
        lastSentRef.current = Date.now();
        p.onValueChange(clamped);
      }),
  ).current;

  const range = maximumValue - minimumValue;
  const ratio = range > 0 ? (displayValue - minimumValue) / range : 0;
  const clampedRatio = Math.max(0, Math.min(1, ratio));

  const crossSize = Math.max(trackThickness, thumbSize);
  const usableLength = Math.max(0, length - thumbSize);
  const thumbOffset = clampedRatio * usableLength;
  const fillSize = thumbOffset + thumbSize / 2;

  const trackCrossOffset = (crossSize - trackThickness) / 2;
  const thumbCrossOffset = (crossSize - thumbSize) / 2;

  if (vertical) {
    return (
      <GestureDetector gesture={panGesture}>
        <View
          onLayout={onLayout}
          style={[
            { width: crossSize, height: '100%' },
            style,
          ]}
        >
          <View
            style={{ pointerEvents: "none",
              position: 'absolute',
              left: trackCrossOffset,
              top: 0,
              width: trackThickness,
              height: '100%',
              backgroundColor: trackColor,
              borderRadius: trackThickness / 2,
            }}
          />
          <View
            style={{ pointerEvents: "none",
              position: 'absolute',
              left: trackCrossOffset,
              bottom: 0,
              width: trackThickness,
              height: fillSize,
              backgroundColor: fillColor,
              borderRadius: trackThickness / 2,
            }}
          />
          <View
            style={{ pointerEvents: "none",
              position: 'absolute',
              left: thumbCrossOffset,
              bottom: thumbOffset,
              width: thumbSize,
              height: thumbSize,
              borderRadius: thumbSize / 2,
              backgroundColor: thumbColor,
            }}
          />
        </View>
      </GestureDetector>
    );
  }

  return (
    <GestureDetector gesture={panGesture}>
      <View
        onLayout={onLayout}
        style={[
          { width: '100%', height: crossSize },
          style,
        ]}
      >
        <View
          style={{ pointerEvents: "none",
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
          style={{ pointerEvents: "none",
            position: 'absolute',
            top: trackCrossOffset,
            left: 0,
            width: fillSize,
            height: trackThickness,
            backgroundColor: fillColor,
            borderRadius: trackThickness / 2,
          }}
        />
        <View
          style={{ pointerEvents: "none",
            position: 'absolute',
            top: thumbCrossOffset,
            left: thumbOffset,
            width: thumbSize,
            height: thumbSize,
            borderRadius: thumbSize / 2,
            backgroundColor: thumbColor,
          }}
        />
      </View>
    </GestureDetector>
  );
}
