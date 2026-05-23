import { useMemo } from "react";
import {
  Platform,
  ScrollView,
  View,
  Text,
  Pressable,
  Switch,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import {
  useSettings,
  useUpdateSettings,
  type ThemeMode,
} from "../lib/settings";
import { useTheme, type Palette } from "../lib/theme";

export default function SettingsScreen() {
  const palette = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const settings = useSettings();
  const update = useUpdateSettings();
  const { width } = useWindowDimensions();
  const showOwnHeader = !(Platform.OS === "web" && width >= 900);

  return (
    <View style={styles.root}>
      {showOwnHeader && (
        <View style={styles.header}>
          <Pressable
            onPress={() => router.push("/")}
            style={styles.backButton}
            accessibilityLabel="Back to library"
          >
            <Text style={styles.backArrow}>‹</Text>
          </Pressable>
          <View style={styles.headerTitleBlock}>
            <Text style={styles.headerTitle}>Settings</Text>
          </View>
        </View>
      )}
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
      <Section title="Theme" palette={palette}>
        <Segmented<ThemeMode>
          value={settings.themeMode}
          options={[
            { value: "system", label: "System" },
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
          onChange={(themeMode) => update({ themeMode })}
          palette={palette}
        />
      </Section>

      <Section title="Text size" palette={palette}>
        <Segmented<number>
          value={settings.fontScale}
          options={[
            { value: 0.85, label: "S" },
            { value: 1.0, label: "M" },
            { value: 1.15, label: "L" },
            { value: 1.3, label: "XL" },
          ]}
          onChange={(fontScale) => update({ fontScale })}
          palette={palette}
        />
      </Section>

      <Section title="E-ink mode" palette={palette}>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.hint}>
              Turn off screen animations, silence haptics, and render mermaid
              diagrams in monochrome. Designed for Boox / Kindle-style e-ink
              devices.
            </Text>
          </View>
          <Switch
            value={settings.eInkMode}
            onValueChange={(eInkMode) => update({ eInkMode })}
            trackColor={{ false: palette.border, true: palette.accent }}
            thumbColor={palette.surface}
          />
        </View>
      </Section>
      </ScrollView>
    </View>
  );
}

// ---- Subcomponents ----------------------------------------------------------

function Section({
  title,
  children,
  palette,
}: {
  title: string;
  children: React.ReactNode;
  palette: Palette;
}) {
  const styles = makeStyles(palette);
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

interface SegmentedOption<T extends string | number> {
  value: T;
  label: string;
}

function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  palette,
  disabled = false,
}: {
  value: T;
  options: SegmentedOption<T>[];
  onChange: (next: T) => void;
  palette: Palette;
  disabled?: boolean;
}) {
  const styles = makeStyles(palette);
  return (
    <View style={[styles.segmented, disabled && styles.segmentedDisabled]}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={String(opt.value)}
            onPress={() => {
              if (!disabled) onChange(opt.value);
            }}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <Text
              style={[
                styles.segmentLabel,
                active && styles.segmentLabelActive,
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function makeStyles(p: Palette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: p.bg },
    container: { flex: 1, backgroundColor: p.bg },
    content: { paddingBottom: 32 },
    header: {
      flexDirection: "row",
      alignItems: "center",
      height: 56,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: p.border,
      backgroundColor: p.surface,
    },
    backButton: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
    },
    backArrow: { color: p.accent, fontSize: 28, lineHeight: 28 },
    headerTitleBlock: { flex: 1, marginLeft: 4 },
    headerTitle: { color: p.textStrong, fontSize: 17, fontWeight: "600" },
    section: {
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: p.border,
    },
    sectionTitle: {
      color: p.textMuted,
      fontSize: 11,
      letterSpacing: 1.2,
      textTransform: "uppercase",
      marginBottom: 12,
    },
    segmented: {
      flexDirection: "row",
      borderWidth: 1,
      borderColor: p.border,
      borderRadius: 8,
      overflow: "hidden",
    },
    segmentedDisabled: {
      opacity: 0.5,
    },
    segment: {
      flex: 1,
      paddingVertical: 10,
      alignItems: "center",
      backgroundColor: p.surface,
    },
    segmentActive: {
      backgroundColor: p.accent,
    },
    segmentLabel: {
      color: p.text,
      fontSize: 13,
      fontWeight: "500",
    },
    segmentLabelActive: {
      color: p.scheme === "light" ? "#ffffff" : "#0b0d12",
      fontWeight: "600",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    rowSpaced: {
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: p.border,
    },
    rowText: { flex: 1 },
    rowLabel: { color: p.textStrong, fontSize: 15 },
    hint: {
      color: p.textMuted,
      fontSize: 12,
      marginTop: 8,
      lineHeight: 16,
    },
  });
}
