import { useMemo } from "react";
import {
  ScrollView,
  View,
  Text,
  Pressable,
  Switch,
  StyleSheet,
  Platform,
} from "react-native";
import {
  useSettings,
  useUpdateSettings,
  type ReadingMode,
  type ThemeMode,
} from "../../lib/settings";
import { useTheme, type Palette } from "../../lib/theme";

export default function SettingsScreen() {
  const palette = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const settings = useSettings();
  const update = useUpdateSettings();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

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

      <Section title="Reading mode" palette={palette}>
        <Segmented<ReadingMode>
          value={settings.readingMode}
          options={[
            { value: "page", label: "Page turn" },
            { value: "scroll", label: "Scroll" },
          ]}
          onChange={(readingMode) => update({ readingMode })}
          palette={palette}
        />
        <Text style={styles.hint}>
          Page turn = swipe between auto-paginated pages. Scroll = one
          continuous view of the whole item.
        </Text>
      </Section>

      {Platform.OS === "android" && (
        <Section title="Hardware" palette={palette}>
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Volume keys turn pages</Text>
              <Text style={styles.hint}>
                Vol-Down = next page, Vol-Up = previous. System volume HUD
                stays hidden while the reader is open. Page mode only.
              </Text>
            </View>
            <Switch
              value={settings.volumeKeyNav}
              onValueChange={(volumeKeyNav) => update({ volumeKeyNav })}
              trackColor={{
                false: palette.border,
                true: palette.accent,
              }}
              thumbColor={palette.surface}
            />
          </View>
        </Section>
      )}
    </ScrollView>
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

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  palette,
}: {
  value: T;
  options: SegmentedOption<T>[];
  onChange: (next: T) => void;
  palette: Palette;
}) {
  const styles = makeStyles(palette);
  return (
    <View style={styles.segmented}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
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
    container: { flex: 1, backgroundColor: p.bg },
    content: { paddingBottom: 32 },
    header: {
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: p.border,
    },
    headerTitle: {
      color: p.textStrong,
      fontSize: 22,
      fontWeight: "700",
    },
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
