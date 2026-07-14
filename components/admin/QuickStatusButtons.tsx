"use client";

import { useRef, useState } from "react";

const OPTIONS = [
  ["BACKLOG", "Backlog"],
  ["PLAYING", "Playing"],
  ["COMPLETED", "Completed"],
  ["ONHOLD", "On Hold"],
  ["DROPPED", "Dropped"],
  ["REPLAYING", "Replaying"],
] as const;

export function QuickStatusButtons({ defaultValue }: { defaultValue: string }) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <input ref={inputRef} type="hidden" name="status" value={value} />
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map(([status, label]) => {
          const selected = value === status;
          return (
            <button
              key={status}
              type="button"
              onClick={() => {
                setValue(status);
                window.setTimeout(() => {
                  inputRef.current?.dispatchEvent(new Event("change", { bubbles: true }));
                }, 0);
              }}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                selected
                  ? "border-emerald-400 bg-emerald-500/20 text-emerald-200"
                  : "border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-zinc-500"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
