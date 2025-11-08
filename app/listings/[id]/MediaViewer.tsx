"use client";

import { useEffect, useRef, useState } from "react";

export type MediaItem = { type: "image" | "video"; url: string };

export default function MediaViewer({
  media,
  title,
}: {
  media: MediaItem[];
  title: string;
}) {
  const [idx, setIdx] = useState(0);
  const startX = useRef<number | null>(null);

  const go = (to: number) => {
    const n = media.length;
    if (!n) return;
    setIdx(((to % n) + n) % n);
  };

  // swipe (mobile)
  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (startX.current == null) return;
    const dx = e.changedTouches[0].clientX - startX.current;
    if (dx > 40) go(idx - 1);
    if (dx < -40) go(idx + 1);
    startX.current = null;
  };

  if (!media.length) return null;
  const current = media[idx];

  return (
    <div style={{ width: "100%" }}>
      {/* area utama: panah kiri/kanan + swipe */}
      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{
          position: "relative",
          width: "100%",
          borderRadius: 12,
          overflow: "hidden",
          background: "#111",
          display: "grid",
          placeItems: "center",
          minHeight: 260,
        }}
      >
        {current.type === "image" ? (
          <img
            src={current.url}
            alt={title || "foto"}
            style={{ width: "100%", height: "100%", objectFit: "cover", maxHeight: 520 }}
          />
        ) : (
          <video
            key={current.url}
            src={current.url}
            controls
            preload="metadata"
            playsInline
            style={{ width: "100%", height: "100%", objectFit: "cover", maxHeight: 520, background: "#000" }}
          />
        )}

        {/* panah kiri */}
        <button
          aria-label="prev"
          onClick={() => go(idx - 1)}
          style={arrowStyle("left")}
        >
          ‹
        </button>
        {/* panah kanan */}
        <button
          aria-label="next"
          onClick={() => go(idx + 1)}
          style={arrowStyle("right")}
        >
          ›
        </button>
      </div>

      {/* thumbnails: video + foto dalam SATU baris */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginTop: 10,
          overflowX: "auto",
          paddingBottom: 4,
        }}
      >
        {media.map((m, i) => (
          <button
            key={m.url + i}
            onClick={() => setIdx(i)}
            style={{
              width: 72,
              height: 72,
              borderRadius: 10,
              overflow: "hidden",
              border: i === idx ? "2px solid #111827" : "1px solid #e5e7eb",
              padding: 0,
              background: "#111",
              position: "relative",
              flex: "0 0 auto",
              cursor: "pointer",
            }}
            aria-label={`thumb-${i + 1}`}
          >
            {m.type === "image" ? (
              <img
                src={m.url}
                alt="thumb"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <>
                {/* kotak gelap + ikon play -> agar tidak putih */}
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "grid",
                    placeItems: "center",
                    background: "#000",
                    opacity: 0.85,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      width: 0,
                      height: 0,
                      borderLeft: "14px solid white",
                      borderTop: "9px solid transparent",
                      borderBottom: "9px solid transparent",
                    }}
                  />
                </div>
              </>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function arrowStyle(side: "left" | "right"): React.CSSProperties {
  return {
    position: "absolute",
    top: "50%",
    [side]: 8,
    transform: "translateY(-50%)",
    background: "rgba(17,24,39,0.6)",
    color: "white",
    border: "none",
    width: 36,
    height: 36,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    fontSize: 20,
    cursor: "pointer",
  };
}
