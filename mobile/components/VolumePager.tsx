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
/** Where we park the system volume so vol-up/vol-down both have headroom. */
const CENTER_VOLUME = 0.5;
/** A real key press shifts volume by ~1/15 (≈0.067). Anything smaller is rounding noise. */
const PRESS_THRESHOLD = 0.02;
/**
 * Debounce — Android fires 2-3 volume-change events per hardware press
 * (real change + an intermediate step). One page-change per DEBOUNCE_MS
 * absorbs the multi-fire reliably.
 */
const DEBOUNCE_MS = 200;

export function useVolumePager(
  setPage: (idx: number) => void,
  currentPage: number,
  pageCount: number,
  enabled: boolean,
) {
  const settings = useSettings();
  const lastVolumeRef = useRef<number>(CENTER_VOLUME);
  /** Wall-clock of the last advance/retreat — used to debounce multi-fire events. */
  const lastActionAtRef = useRef<number>(0);
  // Latest page + setter in refs so the listener callback isn't stale across renders.
  const stateRef = useRef({ page: currentPage, count: pageCount, setPage });
  stateRef.current = { page: currentPage, count: pageCount, setPage };

  const active = enabled && settings.volumeKeyNav;

  useEffect(() => {
    if (!active) return;

    let mounted = true;
    let originalVolume = CENTER_VOLUME;

    (async () => {
      try {
        const { volume } = await VolumeManager.getVolume();
        if (!mounted) return;
        originalVolume = typeof volume === "number" ? volume : CENTER_VOLUME;
        // Park at mid so both up and down still produce change events.
        await VolumeManager.setVolume(CENTER_VOLUME);
        lastVolumeRef.current = CENTER_VOLUME;
        await VolumeManager.showNativeVolumeUI({ enabled: false });
      } catch {
        // Non-fatal — listener still works, just without HUD suppression.
      }
    })();

    // Algorithm: the listener fires multiple times per hardware press
    // (real change + occasional intermediate step + our re-clamp echo).
    // Trying to identify the echo individually is fragile, so we just
    // debounce: one page-change per DEBOUNCE_MS regardless of how many
    // events arrive. After each advance we re-clamp the system volume to
    // CENTER so the user never runs out of headroom on long items.
    // Algorithm: respond to direction (sign of volume delta) only. We park
    // the volume at CENTER once on mount, giving ~7 presses of headroom
    // each direction (Android's default 15 steps). After that the user
    // hits the limit and presses go silent — they fall back to tap zones
    // (left/right thirds of the reader) for the rest of the item.
    //
    // We deliberately do NOT re-clamp inside the listener:
    //  - VolumeManager.setVolume() on Android maps to AudioManager.adjust-
    //    StreamVolume(ADJUST_LOWER/RAISE), which only nudges by one step,
    //    so a programmatic "snap to centre" is impossible from JS land.
    //  - Each step fires another volume-change event. With multi-fire
    //    already in play (2-3 events per real press), trying to detect
    //    and suppress the re-clamp echoes is brittle and produces ghost
    //    retreats. Direction-only is deterministic.
    const sub = VolumeManager.addVolumeListener((result) => {
      const next = result.volume;
      if (typeof next !== "number") return;

      const now = Date.now();
      if (now - lastActionAtRef.current < DEBOUNCE_MS) {
        lastVolumeRef.current = next;
        return;
      }

      const delta = next - lastVolumeRef.current;
      lastVolumeRef.current = next;
      if (Math.abs(delta) < PRESS_THRESHOLD) return;

      const { page, count, setPage: doSetPage } = stateRef.current;
      if (delta < 0 && page < count - 1) {
        doSetPage(page + 1);
        lastActionAtRef.current = now;
      } else if (delta > 0 && page > 0) {
        doSetPage(page - 1);
        lastActionAtRef.current = now;
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
