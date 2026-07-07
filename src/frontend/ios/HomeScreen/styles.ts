
import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#F8FAFC" 
  },
  mainHeader: { 
    paddingTop: 20, 
    paddingBottom: 10 
  },
  headerTopRow: {
    flexDirection: "column",
    gap: 12,
  },
  headerTextBox: {
    minWidth: 0,
  },
  mainHeaderText: { 
    fontSize: 28, 
    fontWeight: "900", 
    color: "#1E293B" 
  },
  subHeaderText: { 
    fontSize: 16, 
    color: "#64748B", 
    fontWeight: "500", 
    marginTop: 4 
  },
  themeButtonRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    gap: 6,
  },
  themeButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: { 
    paddingHorizontal: 25, 
    paddingTop: 10, 
    paddingBottom: 40, 
    gap: 16 
  },
  menuCard: { 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: "#fff", 
    paddingVertical: 20, 
    paddingHorizontal: 20, 
    borderRadius: 20, 
    borderWidth: 1, 
    borderColor: "#F1F5F9", 
    boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.12)"
  },
  menuIconCircle: { 
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16 
  },
  menuTextContent: { 
    flex: 1 
  },
  menuTitle: { 
    fontSize: 17, 
    fontWeight: "800", 
    color: "#1E293B", 
    marginBottom: 4 
  },
  menuDesc: { 
    fontSize: 13, 
    color: "#64748B", 
    fontWeight: "500" 
  },
});

export default styles;
