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
import type { Pattern, SourceConfig } from "@interview-prep/parser";
import { paginate, type Page } from "../lib/pagination";
import { setLastPage, getLastPage } from "../lib/storage";

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
  const { height: windowHeight } = useWindowDimensions();
  const viewportHeight = windowHeight - HEADER_HEIGHT - PAGE_INDICATOR_HEIGHT - PAGE_PADDING;

  const pages: Page[] = useMemo(
    () => paginate(item, viewportHeight),
    [item, viewportHeight],
  );

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
        // Defer until pager is laid out
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
          disabled={currentPage > 0}
        >
          <Text
            style={[
              styles.navArrowText,
              currentPage > 0 && styles.navArrowDisabled,
            ]}
          >
            ‹ prev item
          </Text>
        </Pressable>
        <Text style={styles.pageCount}>
          {currentPage + 1} / {pages.length}
        </Text>
        <Pressable
          onPress={() => onNeighbourItem(1)}
          style={styles.navArrow}
          disabled={currentPage < pages.length - 1}
        >
          <Text
            style={[
              styles.navArrowText,
              currentPage < pages.length - 1 && styles.navArrowDisabled,
            ]}
          >
            next item ›
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0d12" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    height: HEADER_HEIGHT,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#232938",
    backgroundColor: "#11141b",
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  backArrow: { color: "#7c9cff", fontSize: 28, lineHeight: 28 },
  headerTitle: { flex: 1, marginLeft: 4 },
  headerLabel: {
    color: "#8a93a6",
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  headerName: { color: "#ffffff", fontSize: 15, fontWeight: "600" },
  pager: { flex: 1 },
  pageWrapper: { flex: 1 },
  pageContent: { flex: 1, paddingHorizontal: 16, paddingVertical: 12 },
  pageContentInner: { paddingBottom: 24 },
  indicator: {
    height: PAGE_INDICATOR_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: "#232938",
    backgroundColor: "#11141b",
  },
  navArrow: { paddingVertical: 4, paddingHorizontal: 6 },
  navArrowText: { color: "#7c9cff", fontSize: 13 },
  navArrowDisabled: { color: "#3a4154" },
  pageCount: {
    color: "#8a93a6",
    fontSize: 13,
    fontVariant: ["tabular-nums"],
  },
});

const markdownStyles = {
  body: { color: "#d6dae4", fontSize: 15, lineHeight: 22 },
  heading1: { color: "#ffffff", fontSize: 22, fontWeight: "700" as const, marginTop: 12, marginBottom: 8 },
  heading2: { color: "#ffffff", fontSize: 19, fontWeight: "700" as const, marginTop: 12, marginBottom: 6 },
  heading3: { color: "#ffffff", fontSize: 16, fontWeight: "600" as const, marginTop: 10, marginBottom: 4 },
  heading4: { color: "#ffffff", fontSize: 15, fontWeight: "600" as const, marginTop: 8, marginBottom: 2 },
  strong: { color: "#ffffff" },
  em: { color: "#b8a3ff", fontStyle: "italic" as const },
  link: { color: "#7c9cff" },
  paragraph: { marginTop: 6, marginBottom: 6 },
  list_item: { marginVertical: 2 },
  bullet_list: { marginVertical: 6 },
  ordered_list: { marginVertical: 6 },
  code_inline: {
    backgroundColor: "#1f2028",
    color: "#7c9cff",
    fontFamily: "Courier",
    fontSize: 13,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  code_block: {
    backgroundColor: "#1f2028",
    color: "#d6dae4",
    fontFamily: "Courier",
    fontSize: 12,
    padding: 10,
    borderRadius: 6,
    marginVertical: 6,
  },
  fence: {
    backgroundColor: "#1f2028",
    color: "#d6dae4",
    fontFamily: "Courier",
    fontSize: 12,
    padding: 10,
    borderRadius: 6,
    marginVertical: 6,
  },
  blockquote: {
    backgroundColor: "transparent",
    borderLeftColor: "#7c9cff",
    borderLeftWidth: 3,
    paddingLeft: 12,
    marginVertical: 6,
  },
  table: {
    borderWidth: 1,
    borderColor: "#232938",
    borderRadius: 6,
    marginVertical: 6,
  },
  th: {
    backgroundColor: "#161a23",
    color: "#ffffff",
    fontWeight: "600" as const,
    padding: 6,
  },
  td: { padding: 6, color: "#d6dae4" },
  hr: { backgroundColor: "#232938", height: 1, marginVertical: 12 },
};
