import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  FlatList,
  TextInput,
  Keyboard,
  View,
  TouchableOpacity,
  Text,
  ScrollView,
} from "react-native";
import {
  useSafeAreaInsets,
  SafeAreaView,
} from "react-native-safe-area-context";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { makeStyles } from "./styles";
import { useThemeColors } from "../theme";
import { useNavigation } from "@react-navigation/native";
import {
  AppNavigationProp,
  useBluetoothStore,
} from "../constants";

interface Message {
  id: number;
  text: string;
  mode: "sent" | "received";
  time: string;
}

export default function CommunicationScreen() {

  const navigation = useNavigation<AppNavigationProp>();
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const connectedDevice = useBluetoothStore((state) => state.connectedDevice);

  const messages = useBluetoothStore((state) => state.messages);
  const setMessages = useBluetoothStore((state) => state.setMessages);
  const manuallyDisconnected = useBluetoothStore((state) => state.manuallyDisconnected);
  const setManuallyDisconnected = useBluetoothStore((state) => state.setManuallyDisconnected);
  const connectedDeviceName = useBluetoothStore((state) => state.connectedDevice);
  const setConnectedDevice = useBluetoothStore((state) => state.setConnectedDevice);

  //const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Terminal benzeri komut geçmişi (yalnızca web): yukarı/aşağı ok ile gönderilen
  // mesajlar arasında gezinme. `history` eski→yeni sırada gönderilen komutlardır;
  // `historyIndex` null iken geçmişte gezinmiyoruz (taze taslak), değilse aktif index.
  const [history, setHistory] = useState<string[]>(() =>
    messages.filter((m) => m.mode === "sent").map((m) => m.text),
  );
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  // Geçmişe girmeden önceki taslak; en alta (yeni uca) dönünce geri yüklenir.
  const historyDraftRef = useRef("");

  const flatListRef = useRef<FlatList<Message>>(null);
  const inputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const readSubscriptionRef = useRef<any>(null);

  const currentMessageId = useRef(0);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToBottom = useCallback((animated = true, delay = 100) => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    requestAnimationFrame(() => {
      scrollTimeoutRef.current = setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated });
      }, delay);
    });
  }, []);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      scrollToBottom(true, 300);
    });

    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
      setIsFocused(false);
      scrollToBottom(true, 100);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [scrollToBottom]);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom(true, 100);
    }
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (connectedDevice) {
      readSubscriptionRef.current = connectedDevice?.onDataReceived((event) => {
        const receivedData = event.data.trim();

        if (!receivedData) return;

        console.log("Gelen mesaj:", receivedData);

        setMessages([
          ...useBluetoothStore.getState().messages,
          {
            id: currentMessageId.current,
            text: receivedData,
            mode: "received",
            time: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ]);

        console.log("Message ID:", currentMessageId.current);

        currentMessageId.current++;
      });
    }

    return () => {
      if (readSubscriptionRef.current) {
        readSubscriptionRef.current.remove();
        readSubscriptionRef.current = null;
      }
    };
    // Yalnızca bağlantı değişince yeniden abone ol; mesaj geldikçe DEĞİL. Aksi
    // halde web'de stream kilidi serbest bırakılmadan getReader() çağrılıp çöker.
  }, [connectedDevice]);

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const sendedData = inputText.trim();

    console.log("Gönderilen mesaj:", sendedData);

    try {
      if (connectedDevice) {
        await connectedDevice.write(sendedData + "\r\n");
      }

      setMessages([
        ...useBluetoothStore.getState().messages,
        {
          id: currentMessageId.current,
          text: sendedData,
          mode: "sent",
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);

      console.log("Message ID:", currentMessageId.current);

      currentMessageId.current++;

      // Komut geçmişine ekle (üst üste aynı komutu tekrarlama) ve gezinmeyi sıfırla.
      setHistory((h) => (h[h.length - 1] === sendedData ? h : [...h, sendedData]));
      setHistoryIndex(null);
      historyDraftRef.current = "";

      setInputText("");
      scrollToBottom(true, 150);
      // Gönderimden sonra odağı input'ta tut. Enter'da blurOnSubmit kapalı olsa da
      // butona mouse ile tıklayınca odak kayabiliyor; ayrıca input boşalınca buton
      // disabled olup odağı çalabiliyor. Re-render'dan sonra odağı geri ver.
      requestAnimationFrame(() => inputRef.current?.focus());
    } catch (e) {
      window.alert("Veri gönderilemedi. Cihaz bağlı mı?");
    }
  };

  const handleMessagePress = (text: string) => {
    setInputText(text);
    setHistoryIndex(null);
    inputRef.current?.focus();
  };

  // Kullanıcı elle yazınca komut geçmişi gezinmesinden çık (programatik value
  // değişimi onChangeText tetiklemediği için ok ile gezerken burası çalışmaz).
  const handleChangeText = (text: string) => {
    setInputText(text);
    if (historyIndex !== null) setHistoryIndex(null);
  };

  // Terminal mantığı: yukarı ok → daha eski komut, aşağı ok → daha yeni komut.
  // En yeni komuttan bir aşağı inince geçmişe girmeden önceki taslak geri gelir.
  const handleInputKeyPress = (e: any) => {
    const key = e?.nativeEvent?.key;
    if (key !== "ArrowUp" && key !== "ArrowDown") return;
    if (history.length === 0) return;

    // Tek satır input'ta okun imleci başa/sona atmasını engelle.
    e?.preventDefault?.();

    if (key === "ArrowUp") {
      // Geçmişe ilk giriş: o anki taslağı sakla.
      if (historyIndex === null) historyDraftRef.current = inputText;
      const nextIndex =
        historyIndex === null ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIndex);
      setInputText(history[nextIndex]);
    } else {
      if (historyIndex === null) return;
      const nextIndex = historyIndex + 1;
      if (nextIndex >= history.length) {
        // En yeni komutun da altına inildi: taslağı geri yükle, gezinmeyi bitir.
        setHistoryIndex(null);
        setInputText(historyDraftRef.current);
      } else {
        setHistoryIndex(nextIndex);
        setInputText(history[nextIndex]);
      }
    }
  };

  const clearMessages = async () => {
    if (messages.length === 0) {
      window.alert("Silinecek mesaj yok");
      return;
    }

    if (window.confirm("Ekrandaki bütün mesajlar silinecek. Emin misiniz?")) {
      setMessages([]);
      currentMessageId.current = 0;
      // Geçmiş ekrandaki mesajlarla birlikte sıfırlanır.
      setHistory([]);
      setHistoryIndex(null);
      historyDraftRef.current = "";
      window.alert("Mesajlar silindi");
    }
  };

  const disconnectDevice = async () => {
    if (!connectedDevice) return;
    if (!window.confirm("Bağlantı kesilecek. Emin misiniz?")) return;
    try {
      setManuallyDisconnected(true);
      if (readSubscriptionRef.current) {
        readSubscriptionRef.current.remove();
        readSubscriptionRef.current = null;
      }
      await connectedDevice.disconnect();
      setConnectedDevice(null);
      window.alert("Bağlantı kesildi");
    } catch (e) {
      window.alert("Bağlantı kesilemedi");
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>
              {connectedDevice?.name || "Bağlı Değil"}
            </Text>
            <Text
              style={
                connectedDevice ? styles.headerStatusConnected : styles.headerStatusNotConnected
              }
            >
              {connectedDevice ? "Çevrimiçi" : "Çevrimdışı"}
            </Text>
          </View>
        </View>

        <View style={styles.headerIcons}>
          <TouchableOpacity
            onPress={() => {
              const idx = navigation.getState()?.index ?? 0;
              if (idx > 0 && typeof window !== 'undefined') {
                window.history.go(-idx);
              } else {
                navigation.navigate('Home');
              }
            }}
            style={styles.headerIconButton}
          >
            <MaterialCommunityIcons name="home" size={25} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('BluetoothConnection')}
            style={styles.headerIconButtonCog}
          >
            <MaterialCommunityIcons name="cog" size={25} color={colors.textPrimary} />
          </TouchableOpacity>
          {connectedDevice ? (
            <TouchableOpacity
              onPress={disconnectDevice}
              style={styles.headerIconButtonBluetoothOff}
            >
              <MaterialCommunityIcons name="bluetooth-off" size={25} color={colors.danger} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => navigation.navigate('BluetoothConnection')}
              style={styles.headerIconButtonBluetoothConnect}
            >
              <MaterialCommunityIcons name="bluetooth-connect" size={25} color={colors.success} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={clearMessages}
            style={styles.headerIconButtonTrash}
          >
            <MaterialCommunityIcons name="trash-can" size={25} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.keyboardAvoidingView}>
        <View style={styles.messagesContainer}>
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id.toString()}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
            scrollEnabled={true}
            contentContainerStyle={styles.messagesContent}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.messageWrapper,
                  item.mode === "sent"
                    ? styles.messageWrapperSent
                    : styles.messageWrapperReceived,
                ]}
              >
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleMessagePress(item.text)}
                  style={[
                    styles.messageBubble,
                    item.mode === "sent"
                      ? styles.messageBubbleSent
                      : styles.messageBubbleReceived,
                  ]}
                >
                  <Text style={styles.messageText}>{item.text}</Text>
                  <View style={styles.messageTimeContainer}>
                    <Text style={styles.messageTime}>{item.time}</Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}
            onLayout={() => {
              scrollToBottom(true, 100);
            }}
          />
        </View>

        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>

            <TextInput
              ref={inputRef}
              style={styles.textInput}
              placeholder="Mesaj yazın..."
              placeholderTextColor={colors.textMuted}
              value={inputText}
              onChangeText={handleChangeText}
              onKeyPress={handleInputKeyPress}
              onFocus={() => {
                //setIsFocused(true);
                //scrollToBottom(true, 150);
              }}
              onBlur={() => setIsFocused(false)}
              maxLength={1000}
              returnKeyType="send"
              blurOnSubmit={false}
              onSubmitEditing={sendMessage}
            />

            <TouchableOpacity
              style={[
                !inputText.trim() ? styles.sendButtonDisabled : styles.sendButtonEnabled,
              ]}
              onPress={sendMessage}
              disabled={!inputText.trim()}
            >
              <MaterialCommunityIcons name="send" size={26} color="#FFFFFF" />
            </TouchableOpacity>

            {/*{inputText.trim() ? (
              <TouchableOpacity
                style={styles.sendButton}
                onPress={sendMessage}
              >
                <MaterialCommunityIcons name="send" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.cameraButton}>
                <MaterialCommunityIcons name="camera" size={24} color="#54656F" />
              </TouchableOpacity>
            )}*/}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
