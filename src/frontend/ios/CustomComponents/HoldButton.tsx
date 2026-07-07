import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
// Bas-bırak (momentary) buton. TouchableOpacity tek responder kuralına takıldığı için
// aynı anda 2 butona (ya da buton + slider) basılamıyordu. Native gesture ile her butonun
// dokunuşu bağımsız izlenir → birden fazla parmakla aynı anda basılabilir.
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

type Props = {
  style?: StyleProp<ViewStyle>;
  activeOpacity?: number;
  onPressIn?: () => void;
  onPressOut?: () => void;
  children?: ReactNode;
};

export default function HoldButton({
  style,
  activeOpacity = 0.78,
  onPressIn,
  onPressOut,
  children,
}: Props) {
  const [pressed, setPressed] = useState(false);

  // Callback'ler her render'da değişebilir; gesture'ı 1 kez kurup ref'ten okuyoruz.
  const onPressInRef = useRef(onPressIn);
  const onPressOutRef = useRef(onPressOut);
  onPressInRef.current = onPressIn;
  onPressOutRef.current = onPressOut;

  // onBegin: parmak değer değmez (bas) → onPressIn. onFinalize: gesture biter/iptal olur
  // (bırak/kesinti) → onPressOut. Böylece "sürüş takılı kalma" olmaz.
  const gesture = useRef(
    Gesture.Pan()
      .runOnJS(true)
      .minDistance(0)
      .onBegin(() => {
        setPressed(true);
        onPressInRef.current?.();
      })
      .onFinalize(() => {
        setPressed(false);
        onPressOutRef.current?.();
      }),
  ).current;

  return (
    <GestureDetector gesture={gesture}>
      <View style={[style, pressed ? { opacity: activeOpacity } : null]}>
        {children}
      </View>
    </GestureDetector>
  );
}
