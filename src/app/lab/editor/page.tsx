"use client";

import dynamic from "next/dynamic";

const LabEditor = dynamic(
  () => import("@/components/lab-editor/LabEditor").then((m) => ({ default: m.LabEditor })),
  { ssr: false },
);

export default function LabEditorPage() {
  return <LabEditor />;
}
