"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  cancelHref: string;
  children: React.ReactNode;
  className?: string;
  submitLabel?: string;
};

export function AdminEditForm({
  action,
  cancelHref,
  children,
  className = "",
  submitLabel = "Save",
}: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty || saving) return;
      event.preventDefault();
      event.returnValue = "";
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const isSave = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s";
      const isNotesSave =
        (event.ctrlKey || event.metaKey) &&
        event.key === "Enter" &&
        document.activeElement?.tagName === "TEXTAREA";

      if (isSave || isNotesSave) {
        event.preventDefault();
        formRef.current?.requestSubmit();
      }

      if (event.key === "Escape" && !saving) {
        event.preventDefault();
        if (!dirty || window.confirm("Discard your unsaved changes?")) {
          router.push(cancelHref);
        }
      }
    };

    window.addEventListener("beforeunload", warnBeforeUnload);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("beforeunload", warnBeforeUnload);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [cancelHref, dirty, router, saving]);

  return (
    <form
      ref={formRef}
      action={action}
      className={className}
      onChange={() => setDirty(true)}
      onSubmit={() => setSaving(true)}
    >
      <div className="sticky top-3 z-40 mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-700 bg-zinc-900/95 px-4 py-3 shadow-xl backdrop-blur">
        <div className="text-sm">
          {saving ? (
            <span className="text-amber-300">Saving…</span>
          ) : dirty ? (
            <span className="text-amber-300">● Unsaved changes</span>
          ) : (
            <span className="text-emerald-300">✓ All changes saved</span>
          )}
          <span className="ml-3 hidden text-zinc-500 sm:inline">
            Ctrl+S save · Esc cancel
          </span>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg border border-zinc-200 bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving…" : submitLabel}
        </button>
      </div>

      {children}
    </form>
  );
}
