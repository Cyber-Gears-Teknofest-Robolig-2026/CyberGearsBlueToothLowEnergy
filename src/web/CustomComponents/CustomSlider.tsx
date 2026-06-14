import { useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  PanResponder,
  StyleProp,
  View,
  ViewStyle,
} from 'react-native';

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
  const startCoordRef = useRef(0);

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

  const onLayout = (e: LayoutChangeEvent) => {
    const measured = vertical
      ? e.nativeEvent.layout.height
      : e.nativeEvent.layout.width;
    if (measured > 0 && measured !== lengthRef.current) {
      lengthRef.current = measured;
      setLength(measured);
    }
  };

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
    p.onValueChange(clamped);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        // Web: slider'a basınca tarayıcının varsayılan davranışının (yan
        // TextInput'a odak taşıma / metin seçme) tetiklenmesini engelle.
        (e as any)?.preventDefault?.();
        const coord = propsRef.current.vertical
          ? e.nativeEvent.locationY
          : e.nativeEvent.locationX;
        startCoordRef.current = coord;
        updateFromCoord(coord);
      },
      onPanResponderMove: (_e, g) => {
        const delta = propsRef.current.vertical ? g.dy : g.dx;
        updateFromCoord(startCoordRef.current + delta);
      },
      onPanResponderRelease: (e) => {
        (e as any)?.preventDefault?.();
      },
      onPanResponderTerminate: (e) => {
        (e as any)?.preventDefault?.();
      },
    }),
  ).current;

  const range = maximumValue - minimumValue;
  const ratio = range > 0 ? (value - minimumValue) / range : 0;
  const clampedRatio = Math.max(0, Math.min(1, ratio));

  const crossSize = Math.max(trackThickness, thumbSize);
  const usableLength = Math.max(0, length - thumbSize);
  const thumbOffset = clampedRatio * usableLength;
  const fillSize = thumbOffset + thumbSize / 2;

  const trackCrossOffset = (crossSize - trackThickness) / 2;
  const thumbCrossOffset = (crossSize - thumbSize) / 2;

  if (vertical) {
    return (
      <View
        onLayout={onLayout}
        style={[
          { width: crossSize, height: '100%' },
          style,
        ]}
        {...panResponder.panHandlers}
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
    );
  }

  return (
    <View
      onLayout={onLayout}
      style={[
        { width: '100%', height: crossSize },
        style,
      ]}
      {...panResponder.panHandlers}
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
  );
}
