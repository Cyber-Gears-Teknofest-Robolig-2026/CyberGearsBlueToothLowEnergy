import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { PanResponder, StyleProp, View, ViewStyle } from 'react-native';

// Web için bas-bırak (momentary) buton.
// TouchableOpacity (click tabanlı) web'de iki soruna yol açıyordu:
//  1) Butona basınca tarayıcı odağı/metin seçimini yan TextInput'a taşıyordu
//     ("input'a tıklamış gibi" davranış).
//  2) Basılı tutarken bileşen yeniden render olunca onPressOut güvenilir
//     tetiklenmiyordu (değer takılı kalıyordu).
//
// Önemli ayrıntı: odak taşıma / metin seçme tarayıcıda *mousedown*'ın varsayılan
// davranışıdır. react-native responder'ı pointerdown üzerinde çalıştığından oradaki
// preventDefault sonraki mousedown'ı engellemez. Bu yüzden doğrudan DOM mousedown
// olayında preventDefault çağırıyoruz. Ayrıca pointerEvents="box-only" ile basışın
// hedefi (çocuk ikon değil) butonun kendisi olur ve userSelect:'none' ile seçim olmaz.
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
  const activeRef = useRef(false);
  const viewRef = useRef<View | null>(null);

  // DOM mousedown'da preventDefault → tarayıcının odağı/metni yan input'a taşımasını
  // ve metin seçimi başlatmasını engelle.
  useEffect(() => {
    const node = viewRef.current as unknown as HTMLElement | null;
    if (!node || typeof node.addEventListener !== 'function') return;
    const prevent = (e: Event) => e.preventDefault();
    node.addEventListener('mousedown', prevent);
    return () => node.removeEventListener('mousedown', prevent);
  }, []);

  const end = (e: any) => {
    e?.preventDefault?.();
    if (!activeRef.current) return;
    activeRef.current = false;
    setPressed(false);
    onPressOutRef.current?.();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        (e as any)?.preventDefault?.();
        activeRef.current = true;
        setPressed(true);
        onPressInRef.current?.();
      },
      onPanResponderRelease: end,
      onPanResponderTerminate: end,
    }),
  ).current;

  return (
    <View
      ref={viewRef}
      style={[
        style,
        { userSelect: 'none', cursor: 'pointer', pointerEvents: 'box-only' } as any,
        pressed ? { opacity: activeOpacity } : null,
      ]}
      {...panResponder.panHandlers}
    >
      {children}
    </View>
  );
}
