/**
 * TASARIM TOKEN'LARI + TEMA STORE'U (WEB)
 * --------------------------------------------------------------------------
 * Light/Dark renk paletleri, manuel override için zustand store ve sistem
 * temasıyla birleşip etkin renkleri döndüren `useThemeColors` hook'u burada.
 * Override store'u kalıcı değildir; sayfa her açıldığında 'system' moduyla
 * başlar.
 */
import { StyleSheet, useColorScheme } from "react-native";
import { create } from "zustand";

export type ThemeColors = {
  background: string;
  surface: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primarySoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  sentBubble: string;
  receivedBubble: string;
  sentText: string;
  receivedText: string;
  inputBackground: string;
};

export const lightColors: ThemeColors = {
  background: "#F8FAFC",
  surface: "#FFFFFF",
  border: "#E2E8F0",
  textPrimary: "#1E293B",
  textSecondary: "#64748B",
  textMuted: "#94A3B8",
  primary: "#0284C7",
  primarySoft: "#E0F2FE",
  success: "#10B981",
  successSoft: "#DCFCE7",
  warning: "#F59E0B",
  warningSoft: "#FEF3C7",
  danger: "#EF4444",
  dangerSoft: "#FEE2E2",
  sentBubble: "#DCF8C6",
  receivedBubble: "#DDDDDD",
  sentText: "#000000",
  receivedText: "#000000",
  inputBackground: "#F5F5F5",
};

export const darkColors: ThemeColors = {
  background: "#0F172A",
  surface: "#1E293B",
  border: "#334155",
  textPrimary: "#F1F5F9",
  textSecondary: "#94A3B8",
  textMuted: "#64748B",
  primary: "#38BDF8",
  primarySoft: "#0C4A6E",
  success: "#34D399",
  successSoft: "#064E3B",
  warning: "#FBBF24",
  warningSoft: "#78350F",
  danger: "#F87171",
  dangerSoft: "#7F1D1D",
  sentBubble: "#005C4B",
  receivedBubble: "#2A3942",
  sentText: "#E9EDEF",
  receivedText: "#E9EDEF",
  inputBackground: "#2A3942",
};

export type ThemeMode = "light" | "dark" | "system";

type ThemeStore = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
};

export const useThemeStore = create<ThemeStore>((set) => ({
  mode: "system",
  setMode: (mode) => set({ mode }),
}));

export function useThemeColors(): ThemeColors {
  const mode = useThemeStore((s) => s.mode);
  const systemScheme = useColorScheme();
  const effective = mode === "system" ? systemScheme ?? "light" : mode;
  return effective === "dark" ? darkColors : lightColors;
}

export function useEffectiveTheme(): "light" | "dark" {
  const mode = useThemeStore((s) => s.mode);
  const systemScheme = useColorScheme();
  return mode === "system" ? (systemScheme === "dark" ? "dark" : "light") : mode;
}

/* --------------------------------------------------------------------------
 * STATİK STİLLERİ TEMALANDIRMA
 * Ekranların çoğu tek temalı (light) tasarlanmış statik StyleSheet kullanıyor.
 * Bu yardımcı, böyle bir stil nesnesindeki bilinen sabit renkleri aktif temanın
 * token'larına çevirir; böylece her ekranı baştan yazmadan tema duyarlı yaparız.
 * Kaynak tek temalı olduğundan açık renkler daima zemin/yüzey/dolgu, koyu renkler
 * daima metin rolündedir → hex→token eşlemesi tek yönlü güvenlidir. Token'a
 * karşılığı olmayan (markaya özgü dekoratif) renkler olduğu gibi bırakılır.
 * ------------------------------------------------------------------------ */
const COLOR_PROP_KEYS = new Set([
  "color",
  "backgroundColor",
  "borderColor",
  "borderTopColor",
  "borderBottomColor",
  "borderLeftColor",
  "borderRightColor",
  "borderStartColor",
  "borderEndColor",
  "shadowColor",
  "tintColor",
  "textDecorationColor",
  "textShadowColor",
  "placeholderTextColor",
]);

const HEX_TO_TOKEN: Record<string, keyof ThemeColors> = {
  // Zeminler / yüzeyler
  "#f8fafc": "background",
  "#ffffff": "surface",
  "#fff": "surface",
  // Açık gri/mavi ince dolgular → border tonu (her iki temada hafif ayrım)
  "#f1f5f9": "border",
  "#eaf0f7": "border",
  "#eaf0f8": "border",
  "#eef2f7": "border",
  "#dde8f3": "border",
  "#d5dfea": "border",
  "#cbd5e1": "border",
  "#e2e8f0": "border",
  "#e5e5e5": "border",
  "#ece5dd": "border",
  // Mavi yumuşak vurgu dolguları
  "#ddeeff": "primarySoft",
  "#c8e0ff": "primarySoft",
  "#bae6fd": "primarySoft",
  "#e0f2fe": "primarySoft",
  // Metin (koyu → temada uygun metin tonu)
  "#000": "textPrimary",
  "#000000": "textPrimary",
  "#0b1220": "textPrimary",
  "#0f172a": "textPrimary",
  "#111827": "textPrimary",
  "#1e293b": "textPrimary",
  "#334155": "textSecondary",
  "#475569": "textSecondary",
  "#54656f": "textSecondary",
  "#64748b": "textSecondary",
  "#667781": "textSecondary",
  "#6b7280": "textSecondary",
  "#94a3b8": "textMuted",
  "#9ca3af": "textMuted",
  // Birincil (mavi vurgu)
  "#0a84ff": "primary",
  "#0284c7": "primary",
  "#0369a1": "primary",
  "#0984e3": "primary",
  // Giriş arka planı
  "#f5f5f5": "inputBackground",
  // Durum: tehlike
  "#ef4444": "danger",
  "#ff0000": "danger",
  red: "danger",
  "#fee2e2": "dangerSoft",
  "#fecaca": "dangerSoft",
  // Durum: başarı
  "#10b981": "success",
  "#22c55e": "success",
  "#15803d": "success",
  "#00aa00": "success",
  green: "success",
  "#dcfce7": "successSoft",
  "#f0fdf4": "successSoft",
  "#86efac": "successSoft",
  // Durum: uyarı
  "#f59e0b": "warning",
  "#854d0e": "warning",
  "#92400e": "warning",
  "#b45309": "warning",
  "#fef3c7": "warningSoft",
  "#fde68a": "warningSoft",
  "#fcd34d": "warningSoft",
  // Sohbet balonları
  "#dcf8c6": "sentBubble",
  "#dddddd": "receivedBubble",
};

/** Tek bir renk değerini (gerekiyorsa) aktif temaya çevirir. Inline renkler için
 *  de kullanılabilir: `tc("#111827", colors)`. */
export function tc(value: string, c: ThemeColors): string {
  const token = HEX_TO_TOKEN[value.toLowerCase()];
  return token ? c[token] : value;
}

const themeStyleNode = (node: any, c: ThemeColors): any => {
  if (Array.isArray(node)) return node.map((n) => themeStyleNode(n, c));
  if (node && typeof node === "object") {
    const out: any = {};
    for (const k of Object.keys(node)) {
      const v = node[k];
      if (typeof v === "string") out[k] = COLOR_PROP_KEYS.has(k) ? tc(v, c) : v;
      else if (v && typeof v === "object") out[k] = themeStyleNode(v, c);
      else out[k] = v;
    }
    return out;
  }
  return node;
};

/** Statik bir StyleSheet nesnesini aktif tema renkleriyle yeniden üretir. */
export function makeThemedStyles<T extends Record<string, any>>(
  raw: T,
  c: ThemeColors,
): T {
  return StyleSheet.create(themeStyleNode(raw, c)) as T;
}
