
import { StyleSheet } from "react-native";
import { makeThemedStyles, type ThemeColors } from "../theme";

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#F8FAFC" 
  },
  headerWithBack: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "space-between", 
    paddingHorizontal: 20, 
    paddingTop: 15, 
    paddingBottom: 10 
  },
  backBtn: {
    padding: 8,
    backgroundColor: "#F1F5F9",
    borderRadius: 12
  },
  homeBtn: {
    padding: 8,
    backgroundColor: "#F1F5F9",
    borderRadius: 12
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: "800", 
    color: "#1E293B" 
  },
  headerSpacer: {
    width: 40
  },
  lastDeviceCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
    padding: 18,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#0284C7",
    boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.12)"
  },
  lastDeviceIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#E0F2FE",
    alignItems: "center",
    justifyContent: "center"
  },
  lastDeviceTextSection: {
    flex: 1,
    marginLeft: 15,
    gap: 2
  },
  lastDeviceLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0284C7",
    letterSpacing: 0.5,
    textTransform: "uppercase"
  },
  lastDeviceName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E293B"
  },
  lastDeviceAddress: {
    fontSize: 12,
    color: "#64748B",
    fontFamily: "monospace"
  },
  infoCard: { 
    backgroundColor: "#fff", 
    margin: 20, 
    padding: 25, 
    borderRadius: 28, 
    boxShadow: "0px 3px 6px rgba(0, 0, 0, 0.14)"
  },
  infoRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 15, 
    marginBottom: 25 
  },
  statusLabelRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "space-between", 
    marginBottom: 8 
  },
  label: { 
    fontSize: 10, 
    fontWeight: "800", 
    color: "#94A3B8", 
    letterSpacing: 1 
  },
  connectingBadge: { 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: "#FEF3C7", 
    paddingHorizontal: 8, 
    paddingVertical: 2, 
    borderRadius: 20, 
    gap: 2 
  },
  smallSpinner: {
    transform: [
      { 
        scale: 0.6 
      } 
    ] 
  },
  connectingText: { 
    fontSize: 10, 
    fontWeight: "900", 
    color: "#F59E0B", 
    textTransform: "uppercase" 
  },
  onlineBadge: { 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: "#DCFCE7", 
    paddingHorizontal: 8, 
    paddingVertical: 2, 
    borderRadius: 20, 
    gap: 4 
  },
  onlineDot: { 
    width: 6, 
    height: 6, 
    borderRadius: 3, 
    backgroundColor: "#10B981"
  },
  onlineText: { 
    fontSize: 10, 
    fontWeight: "900", 
    color: "#10B981", 
    textTransform: "uppercase" 
  },
  offlineBadge: { 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: "#FEE2E2", 
    paddingHorizontal: 8, 
    paddingVertical: 2, 
    borderRadius: 20, 
    gap: 4 
  },
  offlineDot: { 
    width: 6, 
    height: 6, 
    borderRadius: 3, 
    backgroundColor: "#EF4444"
  },
  offlineText: { 
    fontSize: 10, 
    fontWeight: "900", 
    color: "#EF4444", 
    textTransform: "uppercase" 
  },
  infoText: { 
    fontSize: 18, 
    fontWeight: "900", 
    color: "#1E293B" 
  },
  scanBtn: { 
    backgroundColor: "#0984e3", 
    padding: 18, 
    borderRadius: 18, 
    alignItems: "center" 
  },
  scanBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16
  },
  communicationBtn: {
    backgroundColor: "#10B981",
    marginHorizontal: 60,
    marginTop: 10,
    marginBottom: 10,
    padding: 18,
    borderRadius: 18,
    boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.12)"
  },
  communicationBtnContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10
  },
  communicationBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16
  },
  carControlBtn: {
    backgroundColor: "#FDE68A",
    marginHorizontal: 60,
    marginTop: 10,
    marginBottom: 10,
    padding: 18,
    borderRadius: 18,
    boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.12)"
  },
  carControlBtnContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10
  },
  carControlBtnText: {
    color: "#854D0E",
    fontWeight: "800",
    fontSize: 16
  },
  disconnectBtn: { 
    marginTop: 12, 
    padding: 16, 
    borderRadius: 16, 
    alignItems: "center", 
    backgroundColor: "#EF4444"
  },
  disconnectBtnText: { 
    color: "#F1F5F9",
    fontWeight: "800" 
  },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: "rgba(15, 23, 42, 0.5)", 
    justifyContent: "flex-end" 
  },
  modalBox: { 
    backgroundColor: "#F8FAFC", 
    borderTopLeftRadius: 40, 
    borderTopRightRadius: 40, 
    overflow: 'hidden', 
    position: 'absolute', 
    width: '100%' 
  },
  interactiveHeader: { 
    width: '100%', 
    paddingTop: 12, 
    paddingBottom: 20 
  },
  dragHandle: { 
    width: 45, 
    height: 5, 
    backgroundColor: "#CBD5E1", 
    borderRadius: 10, 
    alignSelf: 'center', 
    marginBottom: 15 
  },
  modalHeaderContent: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    paddingHorizontal: 25 
  },
  titleWrapper: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 12 
  },
  titleIconCircle: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: "#E0F2FE", 
    alignItems: "center", 
    justifyContent: "center" 
  },
  modalTitle: { 
    fontSize: 20, 
    fontWeight: "900", 
    color: "#0F172A" 
  },
  closeCircle: { 
    backgroundColor: "#E2E8F0", 
    padding: 8, 
    borderRadius: 20 
  },
  scanningIndicator: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center", 
    backgroundColor: "#E0F2FE", 
    marginHorizontal: 20, 
    paddingVertical: 8, 
    borderRadius: 12, 
    marginBottom: 15, 
    gap: 10, 
    borderWidth: 1, 
    borderColor: "#BAE6FD" 
  },
  scanningIndicatorText: { 
    fontSize: 13, 
    color: "#0369A1", 
    fontWeight: "700" 
  },
  listContentStyle: { 
    paddingBottom: 80, 
    paddingHorizontal: 20 
  },
  separator: { 
    height: 12 
  },
  emptyStateText: { 
    fontSize: 15, 
    color: "#94A3B8", 
    fontWeight: "600", 
    textAlign: "center", 
    marginTop: 50 
  },
///////////////////////////////////
  connectedCard: {
    backgroundColor: "#F0FDF4",
    borderColor: "#86EFAC",
    borderWidth: 1.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  pairedCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#BAE6FD",
    borderWidth: 1.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  newCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderWidth: 1.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  deviceListItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
  },
  deviceListItemPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  listIconCircle: { 
    padding: 12, 
    borderRadius: 16 
  },
  connectedIconCircle: { 
    backgroundColor: "#10B981" 
  },
  listTextSection: { 
    flex: 1, 
    marginLeft: 15, 
    gap: 2 
  },
  deviceName: { 
    fontSize: 16, 
    fontWeight: "800", 
    color: "#1E293B" 
  },
  deviceAddress: { 
    fontSize: 12, 
    color: "#64748B", 
    fontFamily: "monospace" 
  },
  badgeRow: { 
    flexDirection: "row", 
    gap: 8, 
    flexWrap: "wrap" 
  },
  statusBadge: { 
    paddingVertical: 4, 
    paddingHorizontal: 10, 
    borderRadius: 10 
  },
  connectedBadge: { 
    backgroundColor: "#DCFCE7" 
  },
  connectedBadgeText: { 
    color: "#15803D" 
  },
  pairedBadge: { 
    backgroundColor: "#E0F2FE" 
  },
  pairedBadgeText: { 
    color: "#0284C7" 
  },
  newBadge: { 
    backgroundColor: "#F1F5F9" 
  },
  newBadgeText: { 
    color: "#64748B" 
  },
  statusBadgeText: { 
    fontSize: 10, 
    fontWeight: "900", 
    letterSpacing: 0.5 
  },

});

export const makeStyles = (c: ThemeColors) => makeThemedStyles(styles, c);
export default styles;