"use client";

import { useEffect, useState } from "react";

const TOAST_MESSAGES: Record<string, string> = {
  "game-saved": "Game saved successfully",
  "game-created": "Game added successfully",
  "copy-saved": "Game copy saved successfully",
  "copy-added": "Game copy added successfully",
  "copy-deleted": "Game copy deleted successfully",
  "game-deleted": "Game deleted successfully",
};

export function SaveToast() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    const toastKey = url.searchParams.get("toast");

    if (!toastKey) return;

    const nextMessage = TOAST_MESSAGES[toastKey];
    if (!nextMessage) return;

    setMessage(nextMessage);
    url.searchParams.delete("toast");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);

    const timeout = window.setTimeout(() => setMessage(null), 3000);
    return () => window.clearTimeout(timeout);
  }, []);

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-[100] flex max-w-sm items-center gap-3 rounded-xl border border-emerald-500/40 bg-zinc-900 px-4 py-3 text-sm font-medium text-white shadow-2xl shadow-black/40"
    >
      <span
        aria-hidden="true"
        className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400"
      >
        ✓
      </span>
      {message}
    </div>
  );
}
