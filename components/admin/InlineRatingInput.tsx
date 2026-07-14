"use client";

export function InlineRatingInput({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue?: number | null;
}) {
  return (
    <input
      name={name}
      type="number"
      step="0.5"
      min="0"
      max="10"
      defaultValue={defaultValue ?? ""}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.form?.requestSubmit();
        }
      }}
      className="input text-center text-lg font-bold"
      title="Click to edit. Press Enter to save."
    />
  );
}
