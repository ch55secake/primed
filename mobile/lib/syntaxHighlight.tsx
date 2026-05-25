import { Fragment, type ReactNode } from "react";
import { Text, type TextStyle } from "react-native";
import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import cpp from "highlight.js/lib/languages/cpp";
import csharp from "highlight.js/lib/languages/csharp";
import css from "highlight.js/lib/languages/css";
import go from "highlight.js/lib/languages/go";
import java from "highlight.js/lib/languages/java";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import kotlin from "highlight.js/lib/languages/kotlin";
import python from "highlight.js/lib/languages/python";
import ruby from "highlight.js/lib/languages/ruby";
import rust from "highlight.js/lib/languages/rust";
import sql from "highlight.js/lib/languages/sql";
import swift from "highlight.js/lib/languages/swift";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";

// Register only the languages we ship. Others fall back to plain text.
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("cpp", cpp);
hljs.registerLanguage("csharp", csharp);
hljs.registerLanguage("css", css);
hljs.registerLanguage("go", go);
hljs.registerLanguage("html", xml);
hljs.registerLanguage("java", java);
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("json", json);
hljs.registerLanguage("kotlin", kotlin);
hljs.registerLanguage("python", python);
hljs.registerLanguage("ruby", ruby);
hljs.registerLanguage("rust", rust);
hljs.registerLanguage("sql", sql);
hljs.registerLanguage("swift", swift);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("yaml", yaml);

/**
 * Atom One Dark / Light token-class colour maps. Covers the common hljs
 * classes we see in our content; unknown classes fall through to the
 * baseStyle.color (no override).
 */
const TOKEN_COLOURS: {
  dark: Record<string, string>;
  light: Record<string, string>;
} = {
  dark: {
    "hljs-keyword": "#c678dd",
    "hljs-built_in": "#56b6c2",
    "hljs-type": "#e5c07b",
    "hljs-literal": "#d19a66",
    "hljs-number": "#d19a66",
    "hljs-regexp": "#98c379",
    "hljs-string": "#98c379",
    "hljs-subst": "#abb2bf",
    "hljs-symbol": "#d19a66",
    "hljs-class": "#e5c07b",
    "hljs-function": "#61afef",
    "hljs-title": "#61afef",
    "hljs-params": "#abb2bf",
    "hljs-comment": "#5c6370",
    "hljs-doctag": "#5c6370",
    "hljs-meta": "#5c6370",
    "hljs-section": "#e06c75",
    "hljs-tag": "#e06c75",
    "hljs-name": "#e06c75",
    "hljs-attr": "#d19a66",
    "hljs-attribute": "#d19a66",
    "hljs-variable": "#e06c75",
    "hljs-bullet": "#61afef",
    "hljs-code": "#abb2bf",
    "hljs-emphasis": "#abb2bf",
    "hljs-strong": "#abb2bf",
    "hljs-formula": "#abb2bf",
    "hljs-link": "#61afef",
    "hljs-quote": "#5c6370",
    "hljs-selector-tag": "#e06c75",
    "hljs-selector-id": "#61afef",
    "hljs-selector-class": "#d19a66",
    "hljs-selector-attr": "#d19a66",
    "hljs-selector-pseudo": "#56b6c2",
    "hljs-template-tag": "#c678dd",
    "hljs-template-variable": "#d19a66",
    "hljs-addition": "#98c379",
    "hljs-deletion": "#e06c75",
  },
  // Light scheme deepened from stock Atom One for higher contrast against
  // the light code background (Atom One's mid-tones wash out, especially
  // on lower-quality panels). Comments stay grey but darker; everything
  // else pushed toward darker, more saturated hues.
  light: {
    "hljs-keyword": "#8a1f8a",
    "hljs-built_in": "#016497",
    "hljs-type": "#8a5d00",
    "hljs-literal": "#7a5200",
    "hljs-number": "#7a5200",
    "hljs-regexp": "#3a7d39",
    "hljs-string": "#3a7d39",
    "hljs-subst": "#1d2330",
    "hljs-symbol": "#7a5200",
    "hljs-class": "#8a5d00",
    "hljs-function": "#1a5fd0",
    "hljs-title": "#1a5fd0",
    "hljs-params": "#1d2330",
    "hljs-comment": "#7a7d85",
    "hljs-doctag": "#7a7d85",
    "hljs-meta": "#7a7d85",
    "hljs-section": "#c8362b",
    "hljs-tag": "#c8362b",
    "hljs-name": "#c8362b",
    "hljs-attr": "#7a5200",
    "hljs-attribute": "#7a5200",
    "hljs-variable": "#c8362b",
    "hljs-bullet": "#1a5fd0",
    "hljs-code": "#1d2330",
    "hljs-emphasis": "#1d2330",
    "hljs-strong": "#1d2330",
    "hljs-formula": "#1d2330",
    "hljs-link": "#1a5fd0",
    "hljs-quote": "#7a7d85",
    "hljs-selector-tag": "#c8362b",
    "hljs-selector-id": "#1a5fd0",
    "hljs-selector-class": "#7a5200",
    "hljs-selector-attr": "#7a5200",
    "hljs-selector-pseudo": "#016497",
    "hljs-template-tag": "#8a1f8a",
    "hljs-template-variable": "#7a5200",
    "hljs-addition": "#3a7d39",
    "hljs-deletion": "#c8362b",
  },
};

/**
 * E-ink mode: colour carries no signal on a greyscale panel, so syntax is
 * conveyed by *weight* and *style* instead. Body text stays at the
 * high-contrast base colour; keywords/types/functions go bold, comments
 * go muted-italic. Anything not listed renders at the base colour, normal
 * weight.
 */
const EINK_BOLD = new Set([
  "hljs-keyword",
  "hljs-built_in",
  "hljs-type",
  "hljs-class",
  "hljs-title",
  "hljs-function",
  "hljs-section",
  "hljs-tag",
  "hljs-name",
  "hljs-literal",
  "hljs-selector-tag",
  "hljs-template-tag",
]);
const EINK_MUTED_ITALIC = new Set([
  "hljs-comment",
  "hljs-quote",
  "hljs-doctag",
  "hljs-meta",
]);
/** Muted grey for comments — dark enough to read on e-ink, light enough to recede. */
const EINK_COMMENT_COLOR = "#6b7280";

/**
 * One node in the parsed hljs token tree. Pure text leaves have
 * `className === null`; spans have a class like "hljs-keyword". Tokens
 * can be nested (e.g. "hljs-string" containing "hljs-subst").
 */
interface Token {
  className: string | null;
  text: string;
  children: Token[];
}

/** Decode the small set of HTML entities hljs ever emits. */
function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

/**
 * Walk an hljs HTML output string and build a token tree. hljs only emits
 * `<span class="hljs-X">…</span>` and bare text; no other tags. Parsing is
 * a single-pass scanner.
 */
function parseHljsHtml(html: string): Token[] {
  const root: Token = { className: null, text: "", children: [] };
  const stack: Token[] = [root];
  let i = 0;
  let buf = "";

  const flushText = () => {
    if (!buf) return;
    stack[stack.length - 1].children.push({
      className: null,
      text: decodeEntities(buf),
      children: [],
    });
    buf = "";
  };

  while (i < html.length) {
    if (html.startsWith('<span class="', i)) {
      flushText();
      const end = html.indexOf('">', i);
      if (end === -1) {
        // Malformed — give up and emit the rest as text.
        buf += html.slice(i);
        i = html.length;
        break;
      }
      const className = html.slice(i + '<span class="'.length, end);
      const next: Token = { className, text: "", children: [] };
      stack[stack.length - 1].children.push(next);
      stack.push(next);
      i = end + 2;
      continue;
    }
    if (html.startsWith("</span>", i)) {
      flushText();
      stack.pop();
      i += "</span>".length;
      continue;
    }
    buf += html[i];
    i += 1;
  }
  flushText();
  return root.children;
}

function colourFor(
  className: string | null,
  scheme: "dark" | "light",
): string | undefined {
  if (!className) return undefined;
  // hljs sometimes emits multi-class spans like "hljs-keyword hljs-keyword.if"
  // (rare but possible). Use the first hljs-* token.
  const first = className.split(/\s+/).find((c) => c.startsWith("hljs-"));
  if (!first) return undefined;
  return TOKEN_COLOURS[scheme][first];
}

/** First `hljs-*` class on a span, or null. */
function hljsClass(className: string | null): string | null {
  if (!className) return null;
  return className.split(/\s+/).find((c) => c.startsWith("hljs-")) ?? null;
}

/** E-ink token style: weight/italic instead of colour. */
function einkStyleFor(className: string | null, baseColor: string): TextStyle {
  const cls = hljsClass(className);
  if (cls && EINK_BOLD.has(cls)) return { color: baseColor, fontWeight: "700" };
  if (cls && EINK_MUTED_ITALIC.has(cls))
    return { color: EINK_COMMENT_COLOR, fontStyle: "italic" };
  return { color: baseColor };
}

function renderTokens(
  tokens: Token[],
  scheme: "dark" | "light",
  baseColor: string,
  keyPrefix: string,
  eink: boolean,
): ReactNode[] {
  return tokens.map((t, i) => {
    const key = `${keyPrefix}-${i}`;
    if (t.children.length === 0) {
      // Leaf — text node, optionally styled by the parent's class via
      // baseColor; bare text without a class uses baseColor as-is.
      return (
        <Text key={key} style={{ color: baseColor }}>
          {t.text}
        </Text>
      );
    }
    if (eink) {
      const style = einkStyleFor(t.className, baseColor);
      return (
        <Text key={key} style={style}>
          {renderTokens(t.children, scheme, baseColor, key, eink)}
        </Text>
      );
    }
    const color = colourFor(t.className, scheme) ?? baseColor;
    return (
      <Text key={key} style={{ color }}>
        {renderTokens(t.children, scheme, color, key, eink)}
      </Text>
    );
  });
}

/**
 * Highlight `code` for `language` and return a single `<Text>` whose
 * children are coloured spans. On unknown language or hljs error, falls
 * back to a single plain `<Text>` so the reader never crashes.
 *
 * The outer Text carries the base style (font family, size, line height);
 * children only override `color`.
 */
export function highlight(
  code: string,
  language: string,
  scheme: "dark" | "light",
  baseStyle: TextStyle,
  eink = false,
): ReactNode {
  const baseColor = (baseStyle.color as string) ?? "#000";
  const supported = !!hljs.getLanguage(language);

  if (!supported) {
    return (
      <Text selectable style={baseStyle}>
        {code}
      </Text>
    );
  }

  let html: string;
  try {
    html = hljs.highlight(code, { language, ignoreIllegals: true }).value;
  } catch {
    return (
      <Text selectable style={baseStyle}>
        {code}
      </Text>
    );
  }

  const tokens = parseHljsHtml(html);
  return (
    <Text selectable style={baseStyle}>
      <Fragment>{renderTokens(tokens, scheme, baseColor, "tok", eink)}</Fragment>
    </Text>
  );
}
