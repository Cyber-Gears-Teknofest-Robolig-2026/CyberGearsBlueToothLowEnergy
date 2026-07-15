import { StyleSheet } from "react-native";
import { makeThemedStyles, type ThemeColors } from "../../theme";

// Diğer sekmelerle (RCCarTab / RobotArmTab) aynı kabuk: #EAF0F8 zemin, yuvarlak
// kenarlı screenBody. İçindeki kart ve renkler makeThemedStyles ile aktif temanın
// token'larına çevrilir (dark modda otomatik uyarlanır).
const styles = StyleSheet.create({
  screenBody: {
    flex: 1,
    backgroundColor: "#EAF0F8",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#D5DFEA",
  },

  scrollContent: {
    padding: 8,
    gap: 8,
  },

  card: {
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    padding: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: "#D5DFEA",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  headerIconBox: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: "#DDEEFF",
    alignItems: "center",
    justifyContent: "center",
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#111827",
  },

  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#0A84FF",
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 12,
    elevation: 3,
    shadowColor: "#0A84FF",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 7,
  },

  addButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  emptyText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    textAlign: "center",
    paddingVertical: 24,
  },

  list: {
    gap: 8,
  },

  codeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D5DFEA",
    paddingVertical: 8,
    paddingHorizontal: 10,
  },

  reorderColumn: {
    justifyContent: "center",
    gap: 2,
  },

  reorderButton: {
    width: 30,
    height: 22,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
  },

  reorderButtonDisabled: {
    opacity: 0.4,
  },

  codeBadge: {
    minWidth: 36,
    height: 32,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: "#DDEEFF",
    alignItems: "center",
    justifyContent: "center",
  },

  codeBadgeText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0A84FF",
  },

  codeName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },

  sendButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#22C55E",
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 11,
    elevation: 3,
    shadowColor: "#22C55E",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
  },

  sendButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
  },

  // --- Ekle / Düzenle modalı ---
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },

  modalBox: {
    width: "100%",
    maxWidth: 440,
    maxHeight: "92%",
    backgroundColor: "#F8FAFC",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D5DFEA",
    padding: 16,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },

  modalTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
  },

  closeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
  },

  inputLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#6B7280",
    marginTop: 8,
    marginBottom: 4,
  },

  textInput: {
    height: 44,
    borderWidth: 1,
    borderColor: "#D5DFEA",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },

  codeStepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  stepButton: {
    width: 46,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#0A84FF",
    alignItems: "center",
    justifyContent: "center",
  },

  codeStepInput: {
    flex: 1,
    textAlign: "center",
  },

  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },

  modalBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  cancelBtn: {
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#D5DFEA",
  },

  cancelBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#6B7280",
  },

  saveBtn: {
    backgroundColor: "#0A84FF",
  },

  saveBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});

export const makeStyles = (c: ThemeColors) => makeThemedStyles(styles, c);
export default styles;
