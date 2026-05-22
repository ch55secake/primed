/**
 * Native-only re-export of `react-native-pager-view`. The matching
 * `NativePager.web.tsx` next to this file exports a no-op stub so the
 * bundler can resolve the import on web without pulling the native
 * package (which uses Yoga `codegenNativeCommands` and won't bundle).
 */
import PagerViewImpl from "react-native-pager-view";

export const PagerView = PagerViewImpl;
export type PagerViewRef = InstanceType<typeof PagerViewImpl>;
