// app/listings/[id]/MediaViewer.tsx
"use client";

import { useEffect, useRef, useState } from "react";

export type MediaItem = { kind: "image" | "video"; url: string; thumb?: string };

export default function MediaViewer({ media, title }: { media: MediaItem[]; title: string }) {
  const [idx, setIdx] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const startX = useRef<number | null>(null);

  const current = media[idx];

  // swipe (touch)
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onStart = (e: TouchEvent) => (startX.current = e.touches[0].clientX);
    const onMove = (e: TouchEvent) => {
      if (startX.current == null) return;
      const dx = e.touches[0].clientX - startX.current;
      if (Math.abs(dx) > 60) {
        if (dx < 0) setIdx((v) => Math.min(v + 1, media.length - 1));
        else setIdx((v) => Math.max(v - 1, 0));
        startX.current = null;
      }
    };
    const onEnd = () => (startX.current = null);
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: true });
    el.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
    };
  }, [media.length]);

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%", borderRadius: 12, overflow: "hidden", background: "#000" }}>
      {/* panah kiri */}
      {idx > 0 && (
        <button
          onClick={() => setIdx((v) => Math.max(v - 1, 0))}
          style={{
            position: "absolute",
            left: 8,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 10,
            background: "rgba(0,0,0,0.45)",
            color: "#fff",
            border: "none",
            width: 40,
            height: 40,
            borderRadius: 999,
          }}
          aria-label="Sebelumnya"
        >
          ‹
        </button>
      )}

      {/* panah kanan */}
      {idx < media.length - 1 && (
        <button
          onClick={() => setIdx((v) => Math.min(v + 1, media.length - 1))}
          style={{
            position: "absolute",
            right: 8,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 10,
            background: "rgba(0,0,0,0.45)",
            color: "#fff",
            border: "none",
            width: 40,
            height: 40,
            borderRadius: 999,
          }}
          aria-label="Berikutnya"
        >
          ›
        </button>
      )}

      <div style={{ width: "100%", aspectRatio: "16/9" }}>
        {current?.kind === "video" ? (
          <video
            key={current.url}
            src={current.url}
            controls
            playsInline
            style={{ width: "100%", height: "100%", objectFit: "contain", background: "#000" }}
          />
        ) : current ? (
          <img
            src={current.url}
            alt={title}
            style={{ width: "100%", height: "100%", objectFit: "contain", background: "#000" }}
          />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", color: "#9ca3af", background: "#111827" }}>
            Tidak ada media
          </div>
        )}
      </div>
    </div>
  );
}
