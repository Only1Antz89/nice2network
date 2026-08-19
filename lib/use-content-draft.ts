"use client";

import { createElement, useCallback, useRef, useState } from "react";
import type { ContentDraft, DraftKind } from "@/lib/content-drafts";

export type DraftSaveStatus = "idle" | "saving" | "saved" | "error";

export function useContentDraft<T>({ kind, initialDraft, payload }: { kind: DraftKind; initialDraft?: ContentDraft<T> | null; payload: T }) {
  const initialId = initialDraft?.id ?? "";
  const [draftId, setDraftId] = useState(initialId);
  const [status, setStatus] = useState<DraftSaveStatus>(initialDraft ? "saved" : "idle");
  const draftIdRef = useRef(initialId), savingRef = useRef<Promise<string> | null>(null);

  const saveNow = useCallback(async (override?: T) => {
    if (savingRef.current) await savingRef.current;
    const next = override ?? payload;
    setStatus("saving");
    const request = (async () => {
      try {
        const response = await fetch(draftIdRef.current ? `/api/drafts/${draftIdRef.current}` : "/api/drafts", {
          method: draftIdRef.current ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(draftIdRef.current ? { payload: next } : { kind, payload: next }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error ?? "Draft save failed");
        draftIdRef.current = result.draft.id;
        setDraftId(result.draft.id);
        setStatus("saved");
        window.dispatchEvent(new CustomEvent("n2:drafts-changed", { detail: { kind } }));
        return result.draft.id as string;
      } catch {
        setStatus("error");
        return "";
      } finally { savingRef.current = null; }
    })();
    savingRef.current = request;
    return request;
  }, [kind, payload]);

  const discard = useCallback(async () => {
    const id = draftIdRef.current;
    if (id) {
      const response = await fetch(`/api/drafts/${id}`, { method: "DELETE" });
      if (!response.ok) return false;
      window.dispatchEvent(new CustomEvent("n2:drafts-changed", { detail: { kind } }));
    }
    draftIdRef.current = "";
    setDraftId("");
    setStatus("idle");
    return true;
  }, [kind]);

  const forget = useCallback(() => { draftIdRef.current = ""; setDraftId(""); setStatus("idle"); }, []);
  return { draftId, status, saveNow, discard, forget };
}

export function DraftSaveIndicator({ status }: { status: DraftSaveStatus }) {
  if (status === "idle") return null;
  const label = status === "saving" ? "Saving draft…" : status === "error" ? "Draft not saved" : "Draft saved";
  return createElement("small", { className: `draft-save-status ${status}`, role: "status" }, label);
}
