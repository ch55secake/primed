import { useEffect, useRef, type RefObject } from "react";
import type PagerView from "react-native-pager-view";
import { VolumeManager } from "react-native-volume-manager";
import { useSettings } from "../lib/settings";

/**
 * Subscribes to hardware volume key events and advances/retreats a PagerView.
 *
 * react-native-volume-manager exposes volume *changes* (not key presses) — so
 * we infer direction by comparing the new volume against the previous one.
 * To keep headroom at both ends (a key press at 0% or 100% won't fire a
 * change event), we clamp volume to the middle on enter and restore on exit.
 */
export function useVolumePager(
  pagerRef: RefObject<PagerView | null>,
  currentPage: number,
  pageCount: number,
  enabled: boolean,
) {
  const settings = useSettings();
  const lastVolumeRef = useRef<number>(0.5);
  // Latest page in a ref so the listener callback isn't stale across renders.
  const pageRef = useRef({ page: currentPage, count: pageCount });
  pageRef.current = { page: currentPage, count: pageCount };

  const active =
    enabled && settings.readingMode === "page" && settings.volumeKeyNav;

  useEffect(() => {
    if (!active) return;

    let mounted = true;
    let originalVolume = 0.5;

    (async () => {
      try {
        const { volume } = await VolumeManager.getVolume();
        if (!mounted) return;
        originalVolume = typeof volume === "number" ? volume : 0.5;
        // Clamp to mid so both up and down still produce change events.
        await VolumeManager.setVolume(0.5);
        lastVolumeRef.current = 0.5;
        await VolumeManager.showNativeVolumeUI({ enabled: false });
      } catch {
        // Non-fatal — listener still works, just without HUD suppression.
      }
    })();

    // Each key press shifts the system volume by ~1/15 (Android default).
    // We respond to direction only and let the volume drift naturally — re-
    // clamping inside the listener triggers a feedback event that double-
    // counts the press.
    const sub = VolumeManager.addVolumeListener((result) => {
      const next = result.volume;
      if (typeof next !== "number") return;
      const prev = lastVolumeRef.current;
      // Only act on changes large enough to be a real key press, not a
      // rounding echo from a programmatic setVolume.
      const delta = next - prev;
      lastVolumeRef.current = next;
      if (Math.abs(delta) < 0.02) return;

      const { page, count } = pageRef.current;
      if (delta < 0 && page < count - 1) {
        pagerRef.current?.setPage(page + 1);
      } else if (delta > 0 && page > 0) {
        pagerRef.current?.setPage(page - 1);
      }
    });

    return () => {
      mounted = false;
      sub.remove();
      // Restore the user's volume + native HUD on the way out.
      VolumeManager.showNativeVolumeUI({ enabled: true }).catch(() => {});
      VolumeManager.setVolume(originalVolume).catch(() => {});
    };
  }, [active, pagerRef]);
}
