"use client";

import { createElement, useCallback, useEffect, useRef, useState } from "react";
import { bufferDraft, clearBufferedDraft, readBufferedDraft } from "@/lib/draft-buffer";
import type { ContentDraft, DraftKind } from "@/lib/content-drafts";

export type DraftSaveStatus = "idle" | "saving" | "saved" | "local";

export function useContentDraftAutosave<T>({ kind, initialDraft, payload, meaningful, onRecover }: { kind: DraftKind; initialDraft?: ContentDraft<T> | null; payload: T; meaningful: boolean; onRecover?: (payload: T) => void }) {
  const localDraft = Boolean(initialDraft?.id.startsWith("local:")), initialServerId = localDraft ? "" : initialDraft?.id ?? "";
  const [draftId, setDraftId] = useState(initialServerId), [status, setStatus] = useState<DraftSaveStatus>(initialDraft ? (localDraft ? "local" : "saved") : "idle");
  const draftIdRef = useRef(initialServerId), payloadRef = useRef(payload), recoverRef = useRef(onRecover), keyRef = useRef(localDraft ? initialDraft!.id.slice(6) : `n2-${kind}-${initialDraft?.id ?? crypto.randomUUID()}`), savingRef = useRef<Promise<string> | null>(null), lastSavedRef = useRef(initialDraft && !localDraft ? JSON.stringify(initialDraft.payload) : "");
  useEffect(() => { payloadRef.current = payload; }, [payload]);
  useEffect(() => { recoverRef.current = onRecover; }, [onRecover]);

  const saveNow = useCallback(async (override?: T) => {
    if (savingRef.current) await savingRef.current;
    const next = override ?? payloadRef.current;
    if (!meaningful && !draftIdRef.current) return "";
    const serialised = JSON.stringify(next);
    if (serialised === lastSavedRef.current && draftIdRef.current) return draftIdRef.current;
    await bufferDraft({ key: keyRef.current, kind, draftId: draftIdRef.current || null, payload: next, updatedAt: Date.now() });
    setStatus("saving");
    const request = (async () => {
      try {
        const response = await fetch(draftIdRef.current ? `/api/drafts/${draftIdRef.current}` : "/api/drafts", {
          method: draftIdRef.current ? "PATCH" : "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify(draftIdRef.current ? { payload: next } : { kind, payload: next }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error ?? "Draft save failed");
        const previousKey = keyRef.current;
        draftIdRef.current = result.draft.id;
        setDraftId(result.draft.id); lastSavedRef.current = serialised; setStatus("saved");
        await clearBufferedDraft(previousKey);
        keyRef.current = `n2-${kind}-${result.draft.id}`;
        window.dispatchEvent(new CustomEvent("n2:drafts-changed", { detail: { kind } }));
        return result.draft.id as string;
      } catch {
        setStatus("local");
        return draftIdRef.current;
      } finally { savingRef.current = null; }
    })();
    savingRef.current = request;
    return request;
  }, [kind, meaningful]);

  useEffect(() => {
    if (!meaningful) return;
    const timer = window.setTimeout(() => { void saveNow(); }, draftIdRef.current ? 800 : 0);
    return () => window.clearTimeout(timer);
  }, [meaningful, payload, saveNow]);

  useEffect(() => {
    void readBufferedDraft(keyRef.current).then(buffered => {
      if (buffered?.payload && buffered.updatedAt > (initialDraft ? new Date(initialDraft.updatedAt).getTime() : 0)) {
        payloadRef.current = buffered.payload as T;
        recoverRef.current?.(buffered.payload as T);
        setStatus("local");
      }
    });
    const retry = () => { if (status === "local") void saveNow(); };
    window.addEventListener("online", retry);
    const flush = () => {
      if (!draftIdRef.current || lastSavedRef.current === JSON.stringify(payloadRef.current)) return;
      const body = JSON.stringify({ payload: payloadRef.current });
      if (body.length < 60_000) void fetch(`/api/drafts/${draftIdRef.current}`, { method: "PATCH", headers: { "content-type": "application/json" }, body, keepalive: true });
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", flush);
    return () => { window.removeEventListener("online", retry); window.removeEventListener("pagehide", flush); document.removeEventListener("visibilitychange", flush); };
  }, [initialDraft, saveNow, status]);

  const forget = useCallback(async () => { await clearBufferedDraft(keyRef.current); draftIdRef.current = ""; setDraftId(""); lastSavedRef.current = ""; setStatus("idle"); }, []);
  return { draftId, status, saveNow, forget };
}

export function DraftSaveIndicator({ status }: { status: DraftSaveStatus }) {
  if (status === "idle") return null;
  return createElement("small", { className: `draft-save-status ${status}`, role: "status" }, status === "saving" ? "Saving…" : status === "local" ? "Saved on this device — retrying" : "Saved");
}
