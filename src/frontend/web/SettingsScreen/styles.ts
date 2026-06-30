import { StyleSheet } from "react-native";
import { makeThemedStyles, type ThemeColors } from "../theme";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },

  backBtn: {
    padding: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  headerTextBox: {
    flex: 1,
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#1E293B",
  },

  headerSubtitle: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
    marginTop: 2,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 28,
    gap: 14,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    padding: 16,
    elevation: 2,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },

  cardIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E293B",
  },

  subGroupTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 6,
    marginBottom: 4,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 7,
    gap: 12,
  },

  // İki anahtarı (360° Servo / Açı Yönü Ters) aynı satırda yan yana göstermek için.
  // Dar ekranda (Android) sığmazsa alt satıra kaydırır (flexWrap).
  switchPairRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "flex-end",
    columnGap: 28,
    rowGap: 0,
  },

  // Tam genişlikli switch'te durum etiketi + toggle'ın sağ grubu.
  switchRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  // Switch'in değerine göre değişen durum yazısı (renk inline veriliyor).
  switchStateText: {
    fontSize: 13,
    fontWeight: "700",
  },

  // Sıkı (yan yana) switch: etiket + durum + toggle bitişik dursun.
  switchCompact: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 7,
  },

  switchCompactLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
  },

  rowLabel: {
    flex: 1,
    fontSize: 14,
    color: "#334155",
    fontWeight: "700",
  },

  textInput: {
    minWidth: 90,
    maxWidth: 140,
    height: 40,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
    textAlign: "center",
    paddingVertical: 0,
    // web: tıklayınca çıkan tarayıcı focus çerçevesini kaldır
    outlineWidth: 0,
    outlineStyle: "none",
  } as any,

  numberInput: {
    width: 80,
    height: 40,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 10,
    fontSize: 15,
    fontWeight: "800",
    color: "#1E293B",
    textAlign: "center",
    paddingVertical: 0,
    // web: tıklayınca çıkan tarayıcı focus çerçevesini kaldır
    outlineWidth: 0,
    outlineStyle: "none",
  } as any,

  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 2,
  },

  sliderField: {
    paddingVertical: 8,
    gap: 8,
  },

  sliderTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  sliderControlRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  sliderBox: {
    flex: 1,
    justifyContent: "center",
    height: 28,
  },

  sliderStepBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
  },

  footer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    backgroundColor: "#F8FAFC",
    borderTopWidth: 1,
    borderTopColor: "#EEF2F7",
  },

  saveBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#0A84FF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    elevation: 3,
  },

  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },

  resetBtn: {
    height: 52,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FECACA",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  resetBtnText: {
    color: "#EF4444",
    fontSize: 15,
    fontWeight: "800",
  },
});

export const makeStyles = (c: ThemeColors) => makeThemedStyles(styles, c);
export default styles;
