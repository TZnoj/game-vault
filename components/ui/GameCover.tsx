"use client";

import Image from "next/image";
import { useState } from "react";

const BLUR_DATA_URL =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPScxMicgaGVpZ2h0PScxOCc+PHJlY3Qgd2lkdGg9JzEyJyBoZWlnaHQ9JzE4JyBmaWxsPScjMjcyNzJhJy8+PC9zdmc+";

type GameCoverProps = {
  src: string | null | undefined;
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
};

export function GameCover({ src, alt, sizes, className = "object-cover", priority = false }: GameCoverProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div role="img" aria-label={`${alt} unavailable`} className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950 px-3 text-center text-zinc-500">
        <span className="text-2xl" aria-hidden="true">🎮</span>
        <span className="mt-2 text-xs font-medium">Cover unavailable</span>
      </div>
    );
  }

  return (
    <Image src={src} alt={alt} fill sizes={sizes} priority={priority} loading={priority ? "eager" : "lazy"} placeholder="blur" blurDataURL={BLUR_DATA_URL} className={className} onError={() => setFailed(true)} />
  );
}
