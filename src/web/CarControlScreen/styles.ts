import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#EAF0F7',
  },

  container: {
    flex: 1,
    backgroundColor: '#EAF0F7',
    paddingHorizontal: 5,
    paddingBottom: 5,
  },

  headerWithBack: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    height: 36,
  },

  backBtn: {
    padding: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D5DFEA',
  },

  homeBtn: {
    padding: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D5DFEA',
  },

  headerCenter: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },

  headerTitle: {
    fontWeight: '900',
    color: '#111827',
    letterSpacing: 1.1,
  },

  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  connectionBox: {
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#D5DFEA',
  },

  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },

  connectionText: {
    color: '#111827',
    fontSize: 11,
    fontWeight: '900',
  },

  tabShell: {
    flexDirection: 'row',
    backgroundColor: '#DDE8F3',
    borderRadius: 18,
    padding: 4,
    height: 44,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#D5DFEA',
  },

  tabButton: {
    flex: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },

  activeTab: {
    backgroundColor: '#0A84FF',
    elevation: 4,
    boxShadow: "0px 3px 7px rgba(10, 132, 255, 0.22)",
  },

  tabText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#6B7280',
  },

  activeTabText: {
    color: '#FFFFFF',
  },

  headerPillContainer: {
    alignItems: 'flex-start',
    marginBottom: 8,
  },

  headerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 220,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D5DFEA',
    gap: 10,
    elevation: 2,
    boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.06)",
  },

  headerPillIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#DDEEFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerPillText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#111827',
  },

  singlePageContent: {
    flexGrow: 1,
    flexDirection: 'column',
    gap: 12,
    paddingTop: 12,
    paddingHorizontal: 6,
    paddingBottom: 24,
  },

  pageTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0B1220',
    marginBottom: 2,
  },

  pageSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
  },

  sectionWrap: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingBottom: 6,
  },

  sectionTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 6,
  },

  // --- RCCarTab styles merged ---
  screenBody: {
    flex: 1,
    backgroundColor: '#EAF0F8',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#D5DFEA',
  },

  vehicleScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 5,
    gap: 5,
    paddingBottom: 11,
  },

  vehicleTopRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 5,
  },

  cardLarge: {
    flex: 1.45,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    borderRadius: 18,
    padding: 7,
    borderWidth: 1,
    borderColor: '#D5DFEA',
    elevation: 4,
    boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.1)",
  },

  cardSmall: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    borderRadius: 18,
    padding: 7,
    borderWidth: 1,
    borderColor: '#D5DFEA',
    elevation: 4,
    boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.1)",
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'stretch',
  },

  headerIconBox: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: '#DDEEFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerIconBoxGreen: {
    backgroundColor: '#DCFCE7',
  },

  headerIconBoxRed: {
    backgroundColor: '#FEE2E2',
  },

  // Direction / vehicle pad
  directionPad: {
    flex: 1,
    alignItems: 'center',
    alignSelf: 'stretch',
    justifyContent: 'center',
    paddingVertical: 4,
  },

  directionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  directionButton: {
    width: 130,
    height: 66,
    borderRadius: 16,
    backgroundColor: '#0A84FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
    elevation: 4,
    boxShadow: "0px 3px 7px rgba(10, 132, 255, 0.22)",
  },

  directionCenter: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#DDEEFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C8E0FF',
  },

  ziplineStatusRow: {
    width: '92%',
    height: 32,
    marginTop: 8,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#D5DFEA',
  },

  ziplineStatusLabel: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '800',
  },

  ziplineStatusPill: {
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },

  ziplineStatusOpen: {
    backgroundColor: '#22C55E',
  },

  ziplineStatusClosed: {
    backgroundColor: '#EF4444',
  },

  ziplineStatusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },

  ziplineButton: {
    width: '92%',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
    minHeight: 100,
    borderRadius: 18,
    elevation: 4,
    boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.1)",
  },

  ziplineOpen: {
    backgroundColor: '#22C55E',
  },

  ziplineClosed: {
    backgroundColor: '#EF4444',
  },

  ziplineIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  ziplineButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: 0.5,
    fontSize: 15,
  },

  // Speed / controls
  speedCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 7,
    gap: 5,
    borderWidth: 1,
    borderColor: '#D5DFEA',
    elevation: 4,
    boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.1)",
  },

  speedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  speedControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  roundControlButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0A84FF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    boxShadow: "0px 3px 7px rgba(10, 132, 255, 0.22)",
    zIndex: 3,
    cursor: 'pointer' as any,
  },

  speedSliderBox: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 0,
  },

  speedInputBox: {
    width: 74,
    height: 36,
    borderWidth: 1,
    borderColor: '#D5DFEA',
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    zIndex: 1,
  },

  speedInput: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '900',
    color: '#111827',
    paddingVertical: 0,
    outlineWidth: 0,
    outlineStyle: 'none',
  } as any,

  speedInputUnit: {
    fontSize: 9,
    fontWeight: '900',
    color: '#6B7280',
  },

  // --- RobotArmTab styles merged ---
  armScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 5,
    gap: 5,
    paddingBottom: 11,
  },

  armCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D5DFEA',
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 8,
    elevation: 4,
    boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.1)",
  },

  armCardHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#D5DFEA',
    borderLeftWidth: 4,
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 10,
    elevation: 4,
    boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.1)",
  },

  armHTitleBox: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  armHSliderBox: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    overflow: 'hidden',
  },

  armTop: {
    alignItems: 'center',
    gap: 4,
  },

  armTitle: {
    fontWeight: '900',
    color: '#111827',
    fontSize: 15,
  },

  armButton: {
    backgroundColor: '#0A84FF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    boxShadow: "0px 3px 7px rgba(10, 132, 255, 0.22)",
    zIndex: 3,
    cursor: 'pointer' as any,
  },

  armButtonVerticalTop: {
    width: 40,
    height: 30,
    borderRadius: 12,
    marginTop: 4,
  },

  armButtonVerticalBottom: {
    width: 40,
    height: 30,
    borderRadius: 12,
    marginBottom: 4,
  },

  armButtonHorizontal: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },

  armResetButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#DDEEFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#C8E0FF',
  },

  verticalSliderBox: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },

  armInputBox: {
    borderWidth: 1,
    borderColor: '#D5DFEA',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    zIndex: 1,
  },

  armInputBoxVertical: {
    width: 66,
    height: 30,
  },

  armInputBoxHorizontal: {
    width: 70,
    height: 38,
  },

  armInput: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '900',
    color: '#111827',
    paddingVertical: 0,
    outlineWidth: 0,
    outlineStyle: 'none',
  } as any,

  armInputUnit: {
    fontSize: 12,
    fontWeight: '900',
    color: '#6B7280',
  },
});

export default styles;
