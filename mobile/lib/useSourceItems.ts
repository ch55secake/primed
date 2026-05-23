import { useEffect, useState } from "react";
import { loadSource } from "./content";
import { parseContent, type Pattern, type SourceConfig } from "./parser";

/**
 * Module-level cache of parsed items keyed by source id. Keeps the
 * desktop sidebar from re-parsing the same large markdown every time
 * a source tree node toggles open/closed.
 */
const itemCache = new Map<string, Pattern[]>();
const inflight = new Map<string, Promise<Pattern[]>>();

/** Force-clear after a refresh-all so the next expand re-parses. */
export function invalidateSourceItemsCache(sourceId?: string) {
  if (sourceId) {
    itemCache.delete(sourceId);
    inflight.delete(sourceId);
  } else {
    itemCache.clear();
    inflight.clear();
  }
}

/**
 * Lazily load and parse a source's items. Returns `null` while loading,
 * `[]` on error, or the parsed Pattern[] when ready. Suppressed via
 * `enabled = false` so the sidebar only pays the parse cost for sources
 * the user actually expands.
 */
export function useSourceItems(
  source: SourceConfig | undefined,
  enabled: boolean,
): Pattern[] | null {
  const [items, setItems] = useState<Pattern[] | null>(() => {
    if (!source) return null;
    return itemCache.get(source.id) ?? null;
  });

  useEffect(() => {
    if (!source || !enabled) return;
    const cached = itemCache.get(source.id);
    if (cached) {
      setItems(cached);
      return;
    }
    let cancelled = false;
    let promise = inflight.get(source.id);
    if (!promise) {
      promise = (async () => {
        const md = await loadSource(source);
        const parsed = parseContent(md, source);
        itemCache.set(source.id, parsed);
        inflight.delete(source.id);
        return parsed;
      })();
      inflight.set(source.id, promise);
    }
    promise
      .then((parsed) => {
        if (!cancelled) setItems(parsed);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [source, enabled]);

  return items;
}
