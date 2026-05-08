import { Redirect } from "expo-router";

// Default landing — send to System Design tab.
// expo-router requires an index route at "/", otherwise launching the app with
// the bare scheme (drilly:///) lands on the "Unmatched Route" 404 screen.
export default function Index() {
  return <Redirect href="/(tabs)/patterns" />;
}
