import { SourceLibrary } from "../components/SourceLibrary";

/**
 * App home — the source library. Replaces the previous redirect to the
 * default tab; with the bottom chip strip removed, the library is the
 * top-level entry point.
 */
export default function Home() {
  return <SourceLibrary />;
}
