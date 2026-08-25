"use client";

import { useState } from "react";

export function SavePaperButton({ paperId }: { paperId: string }) {
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  async function save() {
    setState("saving");
    try {
      const response = await fetch("/api/v1/me/reading", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ paperId }) });
      if (!response.ok) throw new Error();
      setState("saved");
    } catch { setState("error"); }
  }
  return <button type="button" onClick={save} disabled={state === "saving" || state === "saved"} className="rounded-md border px-3 py-1.5 text-xs font-medium disabled:opacity-60" aria-live="polite">{state === "saving" ? "Saving…" : state === "saved" ? "Saved" : state === "error" ? "Retry save" : "Save to reading list"}</button>;
}
