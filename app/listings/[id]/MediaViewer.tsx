// app/listings/[id]/MediaViewer.tsx
"use client";

import { useMemo, useRef, useState } from "react";

export type MediaItem = { type: "video" | "image"; url: string };

export default function MediaViewer({
  media,
  title,
}: {
  media: MediaItem[];
  title: string;
}) {
  const [idx, setIdx] = useState(0);
  const hasMedia = media.length > 0;

  // swipe support
  const startX = useRef<number | null>(null);
  const deltaX = useRef(0);

  const goPrev = () => setIdx((i) => (i > 0 ? i - 1 : media.length - 1));
  const goNext = () => setIdx((i) => (i + 1) % media.length);

  const onPointerDown = (e: React.PointerEvent) => {
    startX.current = e.clientX;
    deltaX.current = 0;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (startX.current == null) return;
    deltaX.current = e.clientX - startX.current;
  };
  const onPointerUp = () => {
    if (startX.current == null) return;
    const dx = deltaX.current;
    startX.current = null;
    deltaX.current = 0;
    if (Math.abs(dx) > 40) (dx < 0 ? goNext : goPrev)();
  };

  const thumbs = useMemo(() => media, [media]);

  return (
    <>
      {/* MAIN VIEWER */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{
          position: "relative",
          borderRadius: 12,
          overflow: "hidden",
          background: "#f3f4f6",
        }}
      >
        {hasMedia ? (
          media[idx].type === "image" ? (
            <img
              src={media[idx].url}
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
              key={media[idx].url}
              src={media[idx].url}
              controls
              playsInline
              style={{ width: "100%", maxHeight: 520, display: "block" }}
            />
          )
        ) : (
          <div
            style={{
              width: "100%",
              aspectRatio: "16/9",
              display: "grid",
              placeItems: "center",
              color: "#9ca3af",
            }}
          >
            Tidak ada media
          </div>
        )}

        {/* ARROWS */}
        {media.length > 1 && (
          <>
            <button
              onClick={goPrev}
              aria-label="Sebelumnya"
              style={arrowStyle("left")}
            >
              ‹
            </button>
            <button
              onClick={goNext}
              aria-label="Berikutnya"
              style={arrowStyle("right")}
            >
              ›
            </button>
          </>
        )}
      </div>

      {/* Label */}
      {thumbs.length > 0 && (
        <h3 style={{ fontSize: 16, fontWeight: 700, marginTop: 12 }}>
          Foto &amp; Video Unit
        </h3>
      )}

      {/* THUMBNAILS BAR */}
      {!!thumbs.length && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(90px,1fr))",
            gap: 10,
          }}
        >
          {thumbs.map((m, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              aria-label={`media-${i + 1}`}
              style={{
                position: "relative",
                border: i === idx ? "2px solid #2563eb" : "1px solid #e5e7eb",
                borderRadius: 10,
                padding: 0,
                overflow: "hidden",
                background: "transparent",
                cursor: "pointer",
              }}
            >
              {m.type === "image" ? (
                <img
                  src={m.url}
                  alt={`thumb-${i + 1}`}
                  style={{ width: "100%", height: 80, objectFit: "cover" }}
                />
              ) : (
                <div style={{ position: "relative" }}>
                  <video
                    src={m.url}
                    muted
                    playsInline
                    preload="metadata"
                    style={{ width: "100%", height: 80, objectFit: "cover" }}
                  />
                  {/* Play icon overlay */}
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
                        width: 28,
                        height: 28,
                        borderRadius: "9999px",
                        background: "rgba(0,0,0,0.55)",
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      <span
                        style={{
                          marginLeft: 2,
                          color: "white",
                          fontSize: 18,
                          lineHeight: 0,
                        }}
                      >
                        ▶
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

function arrowStyle(side: "left" | "right"): React.CSSProperties {
  return {
    position: "absolute",
    top: "50%",
    [side]: 8,
    transform: "translateY(-50%)",
    width: 36,
    height: 36,
    borderRadius: "9999px",
    background: "rgba(0,0,0,0.45)",
    color: "white",
    border: "none",
    fontSize: 22,
    cursor: "pointer",
  } as React.CSSProperties;
}
