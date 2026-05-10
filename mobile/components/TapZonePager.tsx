import { useMemo } from "react";
import {
  View,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  type GestureResponderEvent,
} from "react-native";
import Markdown, { type MarkdownProps } from "react-native-markdown-display";
import type { Page } from "../lib/pagination";
import type { Palette } from "../lib/theme";

interface Props {
  pages: Page[];
  currentPage: number;
  onChangePage: (next: number) => void;
  palette: Palette;
  markdownStyles: MarkdownProps["style"];
}

/**
 * E-ink reader body. Replaces PagerView's swipe-to-page (which causes
 * ghosting on e-ink panels because every drag-frame is a translated
 * bitmap) with a tap-zone overlay: left third = prev, right third =
 * next, middle = no-op (reserved for future chrome toggle). The page
 * itself is a single state-driven render — one full refresh per change.
 */
export function TapZonePager({
  pages,
  currentPage,
  onChangePage,
  palette,
  markdownStyles,
}: Props) {
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const { width } = useWindowDimensions();
  const page = pages[currentPage];

  const handlePress = (e: GestureResponderEvent) => {
    const x = e.nativeEvent.locationX;
    if (x < width / 3) {
      if (currentPage > 0) onChangePage(currentPage - 1);
    } else if (x > (2 * width) / 3) {
      if (currentPage < pages.length - 1) onChangePage(currentPage + 1);
    }
    // middle third — reserved for future chrome toggle
  };

  return (
    <Pressable onPress={handlePress} style={styles.zone}>
      {page?.oversized ? (
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyInner}
        >
          <Markdown style={markdownStyles}>{page.markdown}</Markdown>
        </ScrollView>
      ) : (
        <View style={styles.body}>
          <Markdown style={markdownStyles}>{page?.markdown ?? ""}</Markdown>
        </View>
      )}
    </Pressable>
  );
}

function makeStyles(p: Palette) {
  return StyleSheet.create({
    zone: { flex: 1, backgroundColor: p.bg },
    body: { flex: 1, paddingHorizontal: 16, paddingVertical: 12 },
    bodyInner: { paddingBottom: 24 },
  });
}
