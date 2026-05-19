import { redirect } from "next/navigation";
import { LabEditorClient } from "./LabEditorClient";

export default function LabEditorPage() {
  if (process.env.NODE_ENV === "production") redirect("/");
  return <LabEditorClient />;
}
