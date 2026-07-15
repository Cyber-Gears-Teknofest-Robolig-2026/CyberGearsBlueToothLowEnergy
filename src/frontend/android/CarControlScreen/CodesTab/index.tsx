import { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  Text,
  TextInput,
  ToastAndroid,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../../theme";
import {
  CODE_COMMAND_PREFIX,
  useBluetoothStore,
  useCodesStore,
  useSettingsStore,
  type SavedCode,
} from "../../constants";
import { makeStyles } from "./styles";

/**
 * "Kodlar" sekmesi — kullanıcı İSİM + KOD NO ile komut kaydeder (kalıcı),
 * listeden dilediğini tek dokunuşla Bluetooth'a gönderir: `${önek}:${code}\r\n`
 * (örn. "Robot kol eğil" -> kod 5 -> "C:5\r\n"). Önek Ayarlar > Gönderim
 * Başlıkları > Kodlar > Kod Komutu'ndan gelir. Liste yukarı/aşağı taşınarak
 * kullanıcı sıralanabilir. Arduino tarafı gelen koda göre ilgili fonksiyonu
 * çalıştırır (o kod bu projenin kapsamı dışında).
 */
export default function CodesTab({ disableScroll = false }: { disableScroll?: boolean }) {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const connectedDevice = useBluetoothStore((state) => state.connectedDevice);
  const codeHeader = useSettingsStore(
    (state) => state.sendValuesHeaders.code?.command || CODE_COMMAND_PREFIX
  );
  const codes = useCodesStore((state) => state.codes);
  const addCode = useCodesStore((state) => state.addCode);
  const updateCode = useCodesStore((state) => state.updateCode);
  const removeCode = useCodesStore((state) => state.removeCode);
  const moveCode = useCodesStore((state) => state.moveCode);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [codeInput, setCodeInput] = useState("");

  const openAdd = () => {
    setEditingId(null);
    setNameInput("");
    setCodeInput("");
    setModalVisible(true);
  };

  const openEdit = (item: SavedCode) => {
    setEditingId(item.id);
    setNameInput(item.name);
    setCodeInput(String(item.code));
    setModalVisible(true);
  };

  const closeModal = () => setModalVisible(false);

  // Kod No'yu 1'er 1'er artır/azalt (kod numarası negatif olamaz → alt sınır 0).
  const stepCode = (delta: number) => {
    const current = codeInput === "" ? 0 : Number(codeInput);
    const next = Math.max(0, current + delta);
    setCodeInput(String(next));
  };

  const handleSave = () => {
    const name = nameInput.trim();
    if (name === "") {
      ToastAndroid.show("Lütfen bir isim girin", ToastAndroid.SHORT);
      return;
    }
    if (codeInput === "") {
      ToastAndroid.show("Lütfen bir kod no girin", ToastAndroid.SHORT);
      return;
    }
    const code = Number(codeInput);
    if (Number.isNaN(code)) {
      ToastAndroid.show("Geçersiz kod no", ToastAndroid.SHORT);
      return;
    }

    if (editingId) {
      updateCode(editingId, name, code);
      ToastAndroid.show("Kod güncellendi", ToastAndroid.SHORT);
    } else {
      addCode(name, code);
      ToastAndroid.show("Kod kaydedildi", ToastAndroid.SHORT);
    }
    setModalVisible(false);
  };

  const handleSend = async (item: SavedCode) => {
    // Buton basıldığında kaydın ismini ve kodunu logla.
    console.log(`[Kod] Gönder → İsim: "${item.name}", Kod: ${item.code}`);
    // Bağlı cihaz yoksa sessizce çık (uyarı gösterme).
    if (!connectedDevice) return;
    const payload = `${codeHeader}:${item.code}\r\n`;
    try {
      await connectedDevice.write(payload);
    } catch (e) {
      // Gönderim hatasında sessiz kal (uyarı gösterme).
    }
  };

  const confirmDelete = (item: SavedCode) => {
    Alert.alert("Kodu Sil", `"${item.name}" silinsin mi?`, [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: () => removeCode(item.id),
      },
    ]);
  };

  const content = (
    <>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.cardHeader}>
            <View style={styles.headerIconBox}>
              <MaterialIcons name="code" size={19.2} color="#0A84FF" />
            </View>
            <Text style={styles.sectionTitle}>Kodlar</Text>
          </View>

          <TouchableOpacity
            style={styles.addButton}
            activeOpacity={0.85}
            onPress={openAdd}
          >
            <MaterialIcons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Yeni Kod Ekle</Text>
          </TouchableOpacity>
        </View>

        {codes.length === 0 ? (
          <Text style={styles.emptyText}>
            Henüz kod eklenmedi. "Yeni Kod Ekle" ile bir isim ve kod no kaydedin.
          </Text>
        ) : (
          <View style={styles.list}>
            {codes.map((item, index) => (
              <View key={item.id} style={styles.codeRow}>
                <View style={styles.reorderColumn}>
                  <TouchableOpacity
                    style={[
                      styles.reorderButton,
                      index === 0 && styles.reorderButtonDisabled,
                    ]}
                    disabled={index === 0}
                    onPress={() => moveCode(item.id, "up")}
                  >
                    <MaterialIcons
                      name="keyboard-arrow-up"
                      size={20}
                      color={index === 0 ? colors.textMuted : colors.textSecondary}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.reorderButton,
                      index === codes.length - 1 && styles.reorderButtonDisabled,
                    ]}
                    disabled={index === codes.length - 1}
                    onPress={() => moveCode(item.id, "down")}
                  >
                    <MaterialIcons
                      name="keyboard-arrow-down"
                      size={20}
                      color={
                        index === codes.length - 1
                          ? colors.textMuted
                          : colors.textSecondary
                      }
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.codeBadge}>
                  <Text style={styles.codeBadgeText}>{item.code}</Text>
                </View>

                <Text style={styles.codeName} numberOfLines={1}>
                  {item.name}
                </Text>

                <TouchableOpacity
                  style={styles.sendButton}
                  activeOpacity={0.85}
                  onPress={() => handleSend(item)}
                >
                  <MaterialIcons name="send" size={16} color="#FFFFFF" />
                  <Text style={styles.sendButtonText}>Gönder</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => openEdit(item)}
                >
                  <MaterialIcons
                    name="edit"
                    size={18}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => confirmDelete(item)}
                >
                  <MaterialIcons
                    name="delete-outline"
                    size={18}
                    color="#EF4444"
                  />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingId ? "Kodu Düzenle" : "Yeni Kod"}
                </Text>
                <TouchableOpacity onPress={closeModal} style={styles.closeCircle}>
                  <MaterialIcons
                    name="close"
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>İsim</Text>
              <TextInput
                style={styles.textInput}
                value={nameInput}
                onChangeText={setNameInput}
                placeholder="Örn. Robot kol eğil"
                placeholderTextColor={colors.textMuted}
                maxLength={40}
              />

              <Text style={styles.inputLabel}>Kod No</Text>
              <View style={styles.codeStepRow}>
                <TouchableOpacity
                  style={styles.stepButton}
                  activeOpacity={0.85}
                  onPress={() => stepCode(-1)}
                >
                  <MaterialIcons name="remove" size={22} color="#FFFFFF" />
                </TouchableOpacity>
                <TextInput
                  style={[styles.textInput, styles.codeStepInput]}
                  value={codeInput}
                  onChangeText={(text) => setCodeInput(text.replace(/[^0-9]/g, ""))}
                  placeholder="Örn. 5"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  maxLength={6}
                />
                <TouchableOpacity
                  style={styles.stepButton}
                  activeOpacity={0.85}
                  onPress={() => stepCode(1)}
                >
                  <MaterialIcons name="add" size={22} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.cancelBtn]}
                  onPress={closeModal}
                >
                  <Text style={styles.cancelBtnText}>Vazgeç</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.saveBtn]}
                  onPress={handleSave}
                >
                  <Text style={styles.saveBtnText}>Kaydet</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );

  // Tek sayfa (single-page) modunda: dış ScrollView yerine düz View döner
  // (kaydırmayı üstteki tek sayfa ScrollView üstlenir).
  if (disableScroll) {
    return <View style={[styles.screenBody, styles.scrollContent]}>{content}</View>;
  }

  return (
    <ScrollView
      style={styles.screenBody}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {content}
    </ScrollView>
  );
}
