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
  light: {
    "hljs-keyword": "#a626a4",
    "hljs-built_in": "#0184bc",
    "hljs-type": "#c18401",
    "hljs-literal": "#986801",
    "hljs-number": "#986801",
    "hljs-regexp": "#50a14f",
    "hljs-string": "#50a14f",
    "hljs-subst": "#383a42",
    "hljs-symbol": "#986801",
    "hljs-class": "#c18401",
    "hljs-function": "#4078f2",
    "hljs-title": "#4078f2",
    "hljs-params": "#383a42",
    "hljs-comment": "#a0a1a7",
    "hljs-doctag": "#a0a1a7",
    "hljs-meta": "#a0a1a7",
    "hljs-section": "#e45649",
    "hljs-tag": "#e45649",
    "hljs-name": "#e45649",
    "hljs-attr": "#986801",
    "hljs-attribute": "#986801",
    "hljs-variable": "#e45649",
    "hljs-bullet": "#4078f2",
    "hljs-code": "#383a42",
    "hljs-emphasis": "#383a42",
    "hljs-strong": "#383a42",
    "hljs-formula": "#383a42",
    "hljs-link": "#4078f2",
    "hljs-quote": "#a0a1a7",
    "hljs-selector-tag": "#e45649",
    "hljs-selector-id": "#4078f2",
    "hljs-selector-class": "#986801",
    "hljs-selector-attr": "#986801",
    "hljs-selector-pseudo": "#0184bc",
    "hljs-template-tag": "#a626a4",
    "hljs-template-variable": "#986801",
    "hljs-addition": "#50a14f",
    "hljs-deletion": "#e45649",
  },
};

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

function renderTokens(
  tokens: Token[],
  scheme: "dark" | "light",
  baseColor: string,
  keyPrefix: string,
): ReactNode[] {
  return tokens.map((t, i) => {
    const key = `${keyPrefix}-${i}`;
    if (t.children.length === 0) {
      // Leaf — text node, optionally coloured by the parent's class via
      // baseColor; bare text without a class uses baseColor as-is.
      return (
        <Text key={key} style={{ color: baseColor }}>
          {t.text}
        </Text>
      );
    }
    const color = colourFor(t.className, scheme) ?? baseColor;
    return (
      <Text key={key} style={{ color }}>
        {renderTokens(t.children, scheme, color, key)}
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
      <Fragment>{renderTokens(tokens, scheme, baseColor, "tok")}</Fragment>
    </Text>
  );
}
