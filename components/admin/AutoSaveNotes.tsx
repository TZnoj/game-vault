"use client";

import { useEffect, useRef, useState, useTransition } from "react";

type Props = {
  defaultValue: string;
  gameId: number;
  copyId: number;
  action: (formData: FormData) => Promise<void>;
};

export function AutoSaveNotes({ defaultValue, gameId, copyId, action }: Props) {
  const [value, setValue] = useState(defaultValue);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [pending, startTransition] = useTransition();
  const initial = useRef(true);

  useEffect(() => {
    if (initial.current) {
      initial.current = false;
      return;
    }

    setState("idle");
    const timer = window.setTimeout(() => {
      setState("saving");
      const data = new FormData();
      data.set("gameId", String(gameId));
      data.set("copyId", String(copyId));
      data.set("notes", value);

      startTransition(async () => {
        try {
          await action(data);
          setState("saved");
        } catch {
          setState("error");
        }
      });
    }, 2000);

    return () => window.clearTimeout(timer);
  }, [action, copyId, gameId, value]);

  return (
    <div>
      <textarea
        name="notes"
        rows={6}
        value={value}
        onChange={(event) => {
          event.stopPropagation();
          setValue(event.target.value);
        }}
        className="input min-h-[180px] w-full resize-y"
      />
      <p className="mt-2 text-xs text-zinc-500">
        {state === "saving" || pending
          ? "Saving notes…"
          : state === "saved"
            ? "Notes saved"
            : state === "error"
              ? "Could not auto-save notes. Use Ctrl+S to save everything."
              : "Notes auto-save 2 seconds after you stop typing. Ctrl+Enter saves the full form."}
      </p>
    </div>
  );
}
