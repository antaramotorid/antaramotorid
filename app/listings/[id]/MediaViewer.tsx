"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type MediaItem =
  | { type: "image"; url: string }
  | { type: "video"; url: string; thumb?: string };

function guessMime(url: string): string | undefined {
  const ext = (url.split("?")[0].split(".").pop() || "").toLowerCase();
  switch (ext) {
    case "mp4":
      return "video/mp4";
    case "mov":
      // banyak MOV dari iPhone: jika H.264 akan jalan; jika HEVC mungkin gagal (ditangani onError)
      return "video/quicktime";
    case "m4v":
      return "video/x-m4v";
    case "webm":
      return "video/webm";
    case "3gp":
      return "video/3gpp";
    default:
      return undefined;
  }
}

export default function MediaViewer({
  media,
  title,
}: {
  media: MediaItem[];
  title: string;
}) {
  const [idx, setIdx] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const current = media[idx];

  // bisa swipe/drag di HP
  const startX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (startX.current == null) return;
    const delta = e.changedTouches[0].clientX - startX.current;
    if (Math.abs(delta) > 40) {
      if (delta < 0) next();
      else prev();
    }
    startX.current = null;
  };

  function prev() {
    setIdx((i) => (i - 1 + media.length) % media.length);
  }
  function next() {
    setIdx((i) => (i + 1) % media.length);
  }

  // jika slide berubah, jeda video
  useEffect(() => {
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      } catch {}
    }
  }, [idx]);

  const thumbStrip = useMemo(() => {
    // tampilkan max 8 thumb supaya ringan
    return media.slice(0, 8);
  }, [media]);

  return (
    <section>
      {/* AREA MEDIA */}
      <div
        style={{
          position: "relative",
          borderRadius: 12,
          overflow: "hidden",
          background: "#f3f4f6",
        }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* tombol panah kiri/kanan */}
        {media.length > 1 && (
          <>
            <button
              aria-label="Sebelumnya"
              onClick={prev}
              style={{
                position: "absolute",
                left: 8,
                top: "50%",
                transform: "translateY(-50%)",
                background: "rgba(0,0,0,0.5)",
                border: "none",
                color: "#fff",
                width: 36,
                height: 36,
                borderRadius: 999,
                cursor: "pointer",
                zIndex: 2,
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
                background: "rgba(0,0,0,0.5)",
                border: "none",
                color: "#fff",
                width: 36,
                height: 36,
                borderRadius: 999,
                cursor: "pointer",
                zIndex: 2,
              }}
            >
              ›
            </button>
          </>
        )}

        {/* konten */}
        <div style={{ width: "100%", maxHeight: 520 }}>
          {current?.type === "image" ? (
            <img
              key={current.url}
              src={current.url}
              alt={title}
              style={{
                width: "100%",
                height: "auto",
                objectFit: "cover",
                display: "block",
              }}
              loading="eager"
            />
          ) : current ? (
            <VideoBox url={current.url} title={title} videoRef={videoRef} />
          ) : null}
        </div>
      </div>

      {/* THUMB STRIP */}
      {thumbStrip.length > 1 && (
        <div
          style={{
            display: "flex",
            gap: 8,
            marginTop: 10,
            overflowX: "auto",
            paddingBottom: 4,
          }}
        >
          {thumbStrip.map((m, i) => (
            <button
              key={i + m.url}
              onClick={() => setIdx(i)}
              title={m.type === "video" ? "Video" : "Foto"}
              style={{
                border:
                  i === idx ? "2px solid #2563eb" : "1px solid #e5e7eb",
                borderRadius: 8,
                padding: 0,
                background: "#fff",
                cursor: "pointer",
              }}
            >
              {m.type === "image" ? (
                <img
                  src={m.url}
                  alt={title}
                  style={{ width: 80, height: 64, objectFit: "cover" }}
                  loading="lazy"
                />
              ) : (
                <div
                  style={{
                    width: 80,
                    height: 64,
                    display: "grid",
                    placeItems: "center",
                    background: "#0f172a",
                    color: "#fff",
                    fontSize: 12,
                  }}
                >
                  ▶ Video
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function VideoBox({
  url,
  title,
  videoRef,
}: {
  url: string;
  title: string;
  videoRef: React.MutableRefObject<HTMLVideoElement | null>;
}) {
  const [failed, setFailed] = useState(false);
  const mime = guessMime(url);

  return (
    <div style={{ position: "relative", background: "#000" }}>
      {!failed ? (
        <video
          key={url}
          ref={videoRef}
          controls
          playsInline
          preload="metadata"
          style={{ width: "100%", maxHeight: 520, display: "block" }}
          onError={() => setFailed(true)}
        >
          <source src={url} {...(mime ? { type: mime } : {})} />
          {/* fallback text */}
          Browser Anda tidak mendukung pemutar video HTML5.
        </video>
      ) : (
        <div
          style={{
            color: "#fff",
            background: "#111827",
            padding: 16,
            height: 260,
            display: "grid",
            placeItems: "center",
            textAlign: "center",
          }}
        >
          <div>
            <p style={{ marginBottom: 8 }}>
              Video tidak dapat diputar di browser (kemungkinan codec HEVC/HEIC).
            </p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "#60a5fa",
                textDecoration: "underline",
                fontWeight: 600,
              }}
            >
              Unduh / buka langsung file video
            </a>
            <p style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
              Disarankan unggah MP4 (H.264) atau WebM agar tampil di semua
              browser.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
