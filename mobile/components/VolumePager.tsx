import { useEffect, useRef } from "react";
import { DeviceEventEmitter } from "react-native";
import { useSettings } from "../lib/settings";

/**
 * Subscribes to the native "DrillyHardwareKey" event emitted by the
 * MainActivity.dispatchKeyEvent override (see plugins/withHardwareKey-
 * Intercept.js). One event per real key press of:
 *   - Vol-Down / Vol-Up
 *   - Page-Down / Page-Up (Boox firmware remaps volume → page on Go 7)
 *   - DPad arrows (some external keyboards)
 *
 * Direction is "next" or "prev". The native side already consumes the
 * key so volume never moves — we get clean 1-press = 1-event semantics
 * with no rail / saturation issues that plagued the volume-listener
 * approach.
 */
export function useVolumePager(
  setPage: (idx: number) => void,
  currentPage: number,
  pageCount: number,
  enabled: boolean,
) {
  const settings = useSettings();
  const stateRef = useRef({ page: currentPage, count: pageCount, setPage });
  stateRef.current = { page: currentPage, count: pageCount, setPage };

  const active = enabled && settings.volumeKeyNav;

  useEffect(() => {
    if (!active) return;
    const sub = DeviceEventEmitter.addListener(
      "DrillyHardwareKey",
      (direction: "next" | "prev") => {
        const { page, count, setPage: doSetPage } = stateRef.current;
        if (direction === "next" && page < count - 1) {
          doSetPage(page + 1);
        } else if (direction === "prev" && page > 0) {
          doSetPage(page - 1);
        }
      },
    );
    return () => {
      sub.remove();
    };
  }, [active]);
}
