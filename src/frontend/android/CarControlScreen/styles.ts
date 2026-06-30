import { StyleSheet } from "react-native";
import { makeThemedStyles, type ThemeColors } from "../theme";

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
    shadowColor: '#0A84FF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 7,
  },

  tabText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#6B7280',
  },

  activeTabText: {
    color: '#FFFFFF',
  },
});

export const makeStyles = (c: ThemeColors) => makeThemedStyles(styles, c);
export default styles;
