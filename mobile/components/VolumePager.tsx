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
/** Echo tolerance — Android quantises setVolume(0.5) to the nearest hardware step. */
const ECHO_TOLERANCE = 0.06;
/** Safety net: if the echo never lands, drop the suppress flag so the next press isn't swallowed. */
const ECHO_TIMEOUT_MS = 300;

export function useVolumePager(
  setPage: (idx: number) => void,
  currentPage: number,
  pageCount: number,
  enabled: boolean,
) {
  const settings = useSettings();
  const lastVolumeRef = useRef<number>(CENTER_VOLUME);
  /** True between issuing setVolume(CENTER) and seeing its volume-change echo. */
  const reclampingRef = useRef<boolean>(false);
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

    // We respond to direction only. After every detected press we re-clamp
    // back to CENTER so the user never runs out of headroom (Android only
    // emits change events when the volume *actually* changes, so without
    // re-clamping the listener stops firing once the bar hits 0 or 1).
    // The setVolume call itself triggers a listener event with the new
    // volume — we swallow that one via the reclampingRef tombstone.
    const sub = VolumeManager.addVolumeListener((result) => {
      const next = result.volume;
      if (typeof next !== "number") return;

      // Echo from our own setVolume(CENTER): swallow and reset the tombstone.
      if (
        reclampingRef.current &&
        Math.abs(next - CENTER_VOLUME) < ECHO_TOLERANCE
      ) {
        reclampingRef.current = false;
        lastVolumeRef.current = next;
        return;
      }

      const delta = next - lastVolumeRef.current;
      lastVolumeRef.current = next;
      if (Math.abs(delta) < PRESS_THRESHOLD) return;

      const { page, count, setPage: doSetPage } = stateRef.current;
      if (delta < 0 && page < count - 1) {
        doSetPage(page + 1);
      } else if (delta > 0 && page > 0) {
        doSetPage(page - 1);
      }

      // Re-clamp to keep headroom indefinitely. Set the tombstone first so
      // the resulting echo event is recognised and ignored above.
      reclampingRef.current = true;
      setTimeout(() => {
        // If the echo never arrived (rare — usually means setVolume failed
        // silently), clear the flag so a real future press isn't swallowed.
        reclampingRef.current = false;
      }, ECHO_TIMEOUT_MS);
      VolumeManager.setVolume(CENTER_VOLUME).catch(() => {
        reclampingRef.current = false;
      });
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
