import { ScrollViewStyleReset } from "expo-router/html";
import { type PropsWithChildren } from "react";

/**
 * Web-only document shell for the Expo Web export. Expo Router renders
 * this once around the SPA root (output: "single").
 *
 * NOTE: Expo's export strips custom `<style>` / `<link>` tags added here,
 * so the JetBrains Mono `@font-face` declarations + preloads are injected
 * into index.html by scripts/build-web.sh as a post-export step instead.
 * Meta tags and ScrollViewStyleReset below DO survive the export.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
