import { Redirect } from "expo-router";
import { useManifest } from "../lib/manifest";

/**
 * Default landing — redirect to the first source declared in the manifest.
 *
 * expo-router needs an index route at "/", otherwise launching with the bare
 * scheme (drilly:///) lands on the "Unmatched Route" 404 screen.
 *
 * We pick the first manifest source rather than a hardcoded id so deleting or
 * renaming a source via remote manifest doesn't strand new launches on a 404.
 */
export default function Index() {
  const { sources } = useManifest();
  const first = sources[0]?.id ?? "patterns";
  return <Redirect href={`/${first}` as never} />;
}
