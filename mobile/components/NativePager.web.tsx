import { forwardRef } from "react";
import { View, type ViewProps } from "react-native";

/**
 * Web stub for `react-native-pager-view`. Mounted only because Reader's
 * imports must resolve on the web platform; the web code path always
 * picks the TapZone / scroll body so this component is never actually
 * rendered. Exports a forwardRef component with a `setPage` method so
 * the volume/key abstraction's typed setter still type-checks on web.
 */
export type PagerViewRef = {
  setPage: (index: number) => void;
  setPageWithoutAnimation: (index: number) => void;
};

export const PagerView = forwardRef<PagerViewRef, ViewProps>((_, _ref) => {
  return <View />;
});
PagerView.displayName = "PagerView.web.stub";
