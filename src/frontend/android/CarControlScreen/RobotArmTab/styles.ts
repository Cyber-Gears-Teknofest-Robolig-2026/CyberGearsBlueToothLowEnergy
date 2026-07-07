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

  armScrollContent: {
    // İçerik kaydırma alanından kısaysa (kartlar sığıp boşluk kalıyorsa) dikeyde
    // ortala; uzunsa flexGrow devre dışı kalır ve normal şekilde (üstten) kayar.
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },

  armHTitleBox: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  armHSliderBox: {
    flex: 1,
    justifyContent: 'center',
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
    shadowColor: '#0A84FF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 7,
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
  },

  armInputUnit: {
    fontSize: 12,
    fontWeight: '900',
    color: '#6B7280',
  },
});

export const makeStyles = (c: ThemeColors) => makeThemedStyles(styles, c);
export default styles;
