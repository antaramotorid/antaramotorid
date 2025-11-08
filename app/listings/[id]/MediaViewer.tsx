// app/listings/[id]/MediaViewer.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type MediaItem = {
  type: "image" | "video";
  url: string;
  thumb?: string;
};

export default function MediaViewer({
  media,
  title,
}: {
  media: MediaItem[];
  title: string;
}) {
  const [idx, setIdx] = useState(0);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // jika tak ada media, tampilkan placeholder
  if (!media?.length) {
    return (
      <div
        style={{
          width: "100%",
          aspectRatio: "16/9",
          background: "#f3f4f6",
          borderRadius: 12,
          display: "grid",
          placeItems: "center",
          color: "#9ca3af",
          marginTop: 12,
        }}
      >
        Tidak ada foto / video
      </div>
    );
  }

  // gesture swipe (mobile)
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    let startX = 0;
    const onTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
    };
    const onTouchEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - startX;
      if (dx > 50) prev();
      else if (dx < -50) next();
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [idx, media.length]);

  const next = () => setIdx((i) => (i + 1) % media.length);
  const prev = () => setIdx((i) => (i - 1 + media.length) % media.length);

  const cur = media[idx];

  return (
    <div ref={wrapRef} style={{ position: "relative", marginTop: 12 }}>
      {/* Panah kiri/kanan */}
      <button
        aria-label="Sebelumnya"
        onClick={prev}
        style={{
          position: "absolute",
          left: 8,
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 2,
          background: "rgba(0,0,0,0.45)",
          color: "#fff",
          border: 0,
          borderRadius: 999,
          width: 40,
          height: 40,
          cursor: "pointer",
        }}
      >
        ‹
      </button>
      <button
        aria-label="Berikutnya"
        onClick={next}
        style={{
          position: "absolute",
          right: 8,
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 2,
          background: "rgba(0,0,0,0.45)",
          color: "#fff",
          border: 0,
          borderRadius: 999,
          width: 40,
          height: 40,
          cursor: "pointer",
        }}
      >
        ›
      </button>

      {/* Media utama */}
      <div
        style={{
          width: "100%",
          borderRadius: 12,
          overflow: "hidden",
          background: "#000",
        }}
      >
        {cur.type === "image" ? (
          <img
            src={cur.url}
            alt={title}
            style={{
              width: "100%",
              maxHeight: 520,
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : (
          <video
            key={cur.url}
            src={cur.url}
            controls
            playsInline
            style={{ width: "100%", maxHeight: 520, display: "block" }}
          />
        )}
      </div>

      {/* Thumbnails horizontal */}
      <div
        style={{
          display: "flex",
          gap: 10,
          marginTop: 10,
          overflowX: "auto",
          paddingBottom: 4,
        }}
      >
        {media.map((m, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            style={{
              border: i === idx ? "2px solid #2563eb" : "1px solid #e5e7eb",
              borderRadius: 8,
              padding: 0,
              width: 88,
              height: 66,
              overflow: "hidden",
              flex: "0 0 auto",
              position: "relative",
              background: "#fff",
              cursor: "pointer",
            }}
            aria-label={m.type === "video" ? "Video" : "Foto"}
            title={m.type === "video" ? "Video" : "Foto"}
          >
            {m.type === "image" ? (
              <img
                src={m.thumb || m.url}
                alt={`${title}-${i + 1}`}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <>
                <video
                  src={m.url}
                  muted
                  playsInline
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                {/* badge play */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "grid",
                    placeItems: "center",
                    pointerEvents: "none",
                  }}
                >
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: "rgba(0,0,0,0.55)",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <span
                      style={{
                        marginLeft: 2,
                        color: "#fff",
                        fontSize: 12,
                        lineHeight: 1,
                      }}
                    >
                      ►
                    </span>
                  </div>
                </div>
              </>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
