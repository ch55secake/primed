import { useEffect, useRef } from "react";
import { VolumeManager } from "react-native-volume-manager";
import { useSettings } from "../lib/settings";

/**
 * Subscribes to hardware volume key events and advances/retreats the page
 * via a caller-supplied `setPage(idx)` callback. The callback abstracts
 * over PagerView (LCD path) and tap-zone state setter (e-ink path) so this
 * hook works in both reading modes.
 *
 * react-native-volume-manager exposes volume *changes* (not key presses) —
 * we infer direction by comparing the new volume against the previous one.
 * To keep headroom at both ends (a key press at 0% or 100% won't fire a
 * change event), we clamp volume to the middle on enter and restore on exit.
 */
export function useVolumePager(
  setPage: (idx: number) => void,
  currentPage: number,
  pageCount: number,
  enabled: boolean,
) {
  const settings = useSettings();
  const lastVolumeRef = useRef<number>(0.5);
  // Latest page + setter in refs so the listener callback isn't stale across renders.
  const stateRef = useRef({ page: currentPage, count: pageCount, setPage });
  stateRef.current = { page: currentPage, count: pageCount, setPage };

  const active = enabled && settings.volumeKeyNav;

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

      const { page, count, setPage: doSetPage } = stateRef.current;
      if (delta < 0 && page < count - 1) {
        doSetPage(page + 1);
      } else if (delta > 0 && page > 0) {
        doSetPage(page - 1);
      }
    });

    return () => {
      mounted = false;
      sub.remove();
      // Restore the user's volume + native HUD on the way out.
      VolumeManager.showNativeVolumeUI({ enabled: true }).catch(() => {});
      VolumeManager.setVolume(originalVolume).catch(() => {});
    };
  }, [active]);
}
