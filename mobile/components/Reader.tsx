import { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  ScrollView,
  Pressable,
} from "react-native";
import PagerView from "react-native-pager-view";
import * as Haptics from "expo-haptics";
import Markdown from "react-native-markdown-display";
import { useRouter } from "expo-router";
import type { Pattern, SourceConfig } from "../lib/parser";
import { paginate, type Page } from "../lib/pagination";
import { setLastPage, getLastPage } from "../lib/storage";
import { useSettings } from "../lib/settings";
import { useTheme, type Palette } from "../lib/theme";
import { useVolumePager } from "./VolumePager";

const HEADER_HEIGHT = 56;
const PAGE_INDICATOR_HEIGHT = 36;
const PAGE_PADDING = 32;

interface Props {
  source: SourceConfig;
  item: Pattern;
  /** Callback to navigate to next/previous item; null = no neighbour. */
  onNeighbourItem: (delta: 1 | -1) => void;
}

export function Reader({ source, item, onNeighbourItem }: Props) {
  const router = useRouter();
  const palette = useTheme();
  const settings = useSettings();
  const { height: windowHeight } = useWindowDimensions();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const markdownStyles = useMemo(() => makeMarkdownStyles(palette), [palette]);
  const viewportHeight =
    windowHeight - HEADER_HEIGHT - PAGE_INDICATOR_HEIGHT - PAGE_PADDING;

  const pages: Page[] = useMemo(
    () => paginate(item, viewportHeight),
    [item, viewportHeight],
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <View style={styles.headerTitle}>
          <Text style={styles.headerLabel}>
            {source.itemLabel} {item.id}
          </Text>
          <Text style={styles.headerName} numberOfLines={1}>
            {item.title}
          </Text>
        </View>
      </View>

      {settings.readingMode === "page" ? (
        <PagedBody
          source={source}
          item={item}
          pages={pages}
          palette={palette}
          markdownStyles={markdownStyles}
          onNeighbourItem={onNeighbourItem}
        />
      ) : (
        <ScrollBody
          pages={pages}
          palette={palette}
          markdownStyles={markdownStyles}
          onNeighbourItem={onNeighbourItem}
        />
      )}
    </View>
  );
}

// ---- Paged mode -------------------------------------------------------------

interface PagedProps {
  source: SourceConfig;
  item: Pattern;
  pages: Page[];
  palette: Palette;
  markdownStyles: ReturnType<typeof makeMarkdownStyles>;
  onNeighbourItem: (delta: 1 | -1) => void;
}

function PagedBody({
  source,
  item,
  pages,
  palette,
  markdownStyles,
  onNeighbourItem,
}: PagedProps) {
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const [currentPage, setCurrentPage] = useState(0);
  const pagerRef = useRef<PagerView>(null);
  const initialPageLoaded = useRef(false);

  // Restore last-read page on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await getLastPage(source.id, item.id);
      if (cancelled) return;
      if (saved > 0 && saved < pages.length) {
        requestAnimationFrame(() => {
          pagerRef.current?.setPageWithoutAnimation(saved);
          setCurrentPage(saved);
        });
      }
      initialPageLoaded.current = true;
    })();
    return () => {
      cancelled = true;
    };
  }, [source.id, item.id, pages.length]);

  // Persist current page on change
  useEffect(() => {
    if (!initialPageLoaded.current) return;
    setLastPage(source.id, item.id, currentPage);
  }, [source.id, item.id, currentPage]);

  // Hardware volume keys advance / retreat pages
  useVolumePager(pagerRef, currentPage, pages.length, true);

  return (
    <>
      <PagerView
        ref={pagerRef}
        style={styles.pager}
        initialPage={0}
        onPageSelected={(e) => {
          const p = e.nativeEvent.position;
          setCurrentPage(p);
          Haptics.selectionAsync();
        }}
      >
        {pages.map((page, idx) => (
          <View key={idx} style={styles.pageWrapper}>
            {page.oversized ? (
              <ScrollView
                style={styles.pageContent}
                contentContainerStyle={styles.pageContentInner}
              >
                <Markdown style={markdownStyles}>{page.markdown}</Markdown>
              </ScrollView>
            ) : (
              <View style={styles.pageContent}>
                <Markdown style={markdownStyles}>{page.markdown}</Markdown>
              </View>
            )}
          </View>
        ))}
      </PagerView>

      <View style={styles.indicator}>
        <Pressable
          onPress={() => onNeighbourItem(-1)}
          style={styles.navArrow}
        >
          <Text style={styles.navArrowText}>‹ prev</Text>
        </Pressable>
        <Text style={styles.pageCount}>
          {currentPage + 1} / {pages.length}
        </Text>
        <Pressable
          onPress={() => onNeighbourItem(1)}
          style={styles.navArrow}
        >
          <Text style={styles.navArrowText}>next ›</Text>
        </Pressable>
      </View>
    </>
  );
}

// ---- Scroll mode ------------------------------------------------------------

interface ScrollProps {
  pages: Page[];
  palette: Palette;
  markdownStyles: ReturnType<typeof makeMarkdownStyles>;
  onNeighbourItem: (delta: 1 | -1) => void;
}

function ScrollBody({
  pages,
  palette,
  markdownStyles,
  onNeighbourItem,
}: ScrollProps) {
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const fullMarkdown = useMemo(
    () => pages.map((p) => p.markdown).join("\n\n"),
    [pages],
  );
  return (
    <>
      <ScrollView
        style={styles.pager}
        contentContainerStyle={styles.scrollInner}
      >
        <Markdown style={markdownStyles}>{fullMarkdown}</Markdown>
      </ScrollView>
      <View style={styles.indicator}>
        <Pressable
          onPress={() => onNeighbourItem(-1)}
          style={styles.navArrow}
        >
          <Text style={styles.navArrowText}>‹ prev</Text>
        </Pressable>
        <Text style={styles.pageCount}>scroll mode</Text>
        <Pressable
          onPress={() => onNeighbourItem(1)}
          style={styles.navArrow}
        >
          <Text style={styles.navArrowText}>next ›</Text>
        </Pressable>
      </View>
    </>
  );
}

// ---- Styles -----------------------------------------------------------------

function makeStyles(p: Palette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: p.bg },
    header: {
      flexDirection: "row",
      alignItems: "center",
      height: HEADER_HEIGHT,
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
    headerTitle: { flex: 1, marginLeft: 4 },
    headerLabel: {
      color: p.textMuted,
      fontSize: 11,
      letterSpacing: 1.2,
      textTransform: "uppercase",
    },
    headerName: { color: p.textStrong, fontSize: 15, fontWeight: "600" },
    pager: { flex: 1 },
    pageWrapper: { flex: 1 },
    pageContent: { flex: 1, paddingHorizontal: 16, paddingVertical: 12 },
    pageContentInner: { paddingBottom: 24 },
    scrollInner: { paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 32 },
    indicator: {
      height: PAGE_INDICATOR_HEIGHT,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      borderTopWidth: 1,
      borderTopColor: p.border,
      backgroundColor: p.surface,
    },
    navArrow: { paddingVertical: 4, paddingHorizontal: 6 },
    navArrowText: { color: p.accent, fontSize: 13 },
    pageCount: {
      color: p.textMuted,
      fontSize: 13,
      fontVariant: ["tabular-nums"],
    },
  });
}

function makeMarkdownStyles(p: Palette) {
  return {
    body: { color: p.text, fontSize: 15, lineHeight: 22 },
    heading1: {
      color: p.textStrong,
      fontSize: 22,
      fontWeight: "700" as const,
      marginTop: 12,
      marginBottom: 8,
    },
    heading2: {
      color: p.textStrong,
      fontSize: 19,
      fontWeight: "700" as const,
      marginTop: 12,
      marginBottom: 6,
    },
    heading3: {
      color: p.textStrong,
      fontSize: 16,
      fontWeight: "600" as const,
      marginTop: 10,
      marginBottom: 4,
    },
    heading4: {
      color: p.textStrong,
      fontSize: 15,
      fontWeight: "600" as const,
      marginTop: 8,
      marginBottom: 2,
    },
    strong: { color: p.textStrong },
    em: {
      color: p.scheme === "light" ? "#6845c0" : "#b8a3ff",
      fontStyle: "italic" as const,
    },
    link: { color: p.accent },
    paragraph: { marginTop: 6, marginBottom: 6 },
    list_item: { marginVertical: 2 },
    bullet_list: { marginVertical: 6 },
    ordered_list: { marginVertical: 6 },
    code_inline: {
      backgroundColor: p.codeBg,
      color: p.accent,
      fontFamily: "Courier",
      fontSize: 13,
      paddingHorizontal: 4,
      paddingVertical: 1,
      borderRadius: 3,
    },
    code_block: {
      backgroundColor: p.codeBg,
      color: p.codeFg,
      fontFamily: "Courier",
      fontSize: 12,
      padding: 10,
      borderRadius: 6,
      marginVertical: 6,
    },
    fence: {
      backgroundColor: p.codeBg,
      color: p.codeFg,
      fontFamily: "Courier",
      fontSize: 12,
      padding: 10,
      borderRadius: 6,
      marginVertical: 6,
    },
    blockquote: {
      backgroundColor: "transparent",
      borderLeftColor: p.accent,
      borderLeftWidth: 3,
      paddingLeft: 12,
      marginVertical: 6,
    },
    table: {
      borderWidth: 1,
      borderColor: p.border,
      borderRadius: 6,
      marginVertical: 6,
    },
    th: {
      backgroundColor: p.surfacePressed,
      color: p.textStrong,
      fontWeight: "600" as const,
      padding: 6,
    },
    td: { padding: 6, color: p.text },
    hr: { backgroundColor: p.border, height: 1, marginVertical: 12 },
  };
}
