import { StyleSheet } from "react-native";
import { makeThemedStyles, type ThemeColors } from "../../theme";

const styles = StyleSheet.create({
  screenBody: {
    flex: 1,
    backgroundColor: '#EAF0F8',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#D5DFEA',
  },

  vehicleScrollContent: {
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
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

  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#111827',
  },

  directionPad: {
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
    shadowColor: '#0A84FF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 7,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
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

  speedCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 7,
    gap: 5,
    borderWidth: 1,
    borderColor: '#D5DFEA',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
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
    shadowColor: '#0A84FF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 7,
  },

  speedSliderBox: {
    flex: 1,
    justifyContent: 'center',
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
  },

  speedInput: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '900',
    color: '#111827',
    paddingVertical: 0,
  },

  speedInputUnit: {
    fontSize: 9,
    fontWeight: '900',
    color: '#6B7280',
  },
});

export const makeStyles = (c: ThemeColors) => makeThemedStyles(styles, c);
export default styles;
