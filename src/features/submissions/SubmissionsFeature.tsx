import { useState } from "react";
import SubmissionList from "./SubmissionList";
import SubmissionDetail from "./SubmissionDetail";

export default function SubmissionsFeature() {
  const [selected, setSelected] = useState<string | null>(null);

  if (selected) {
    return <SubmissionDetail id={selected} onBack={() => setSelected(null)} />;
  }
  return <SubmissionList onOpen={setSelected} />;
}