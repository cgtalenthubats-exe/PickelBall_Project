"use client";

import { useState } from "react";
import Image from "next/image";

export function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(0);

  return (
    <div>
      <div className="relative h-60 md:h-80 rounded-2xl overflow-hidden bg-pine/10">
        <Image
          src={images[active]}
          alt={alt}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 768px"
          className="object-cover"
        />
      </div>
      <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
        {images.map((src, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            aria-label={`รูปที่ ${i + 1}`}
            className={`relative w-20 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-colors ${
              i === active ? "border-pine" : "border-transparent hover:border-line"
            }`}
          >
            <Image src={src} alt="" fill sizes="80px" className="object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}
