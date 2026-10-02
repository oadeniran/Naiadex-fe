import { useState } from "react";
import ExploreFeed from "./ExploreFeed";
import ExploreDetail from "./ExploreDetail";

export default function ExploreFeature() {
  const [selected, setSelected] = useState<string | null>(null);
  if (selected) return <ExploreDetail id={selected} onBack={() => setSelected(null)} />;
  return <ExploreFeed onOpen={setSelected} />;
}