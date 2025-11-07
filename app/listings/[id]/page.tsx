// app/listings/[id]/page.tsx
import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";

// ------ util server-only ------
function normalizeWa(n: any): string | null {
  if (!n) return null;
  const digits = String(n).replace(/[^0-9]/g, "");
  if (!digits) return null;
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  if (digits.startsWith("62")) return digits;
  return digits;
}

type MediaItem = { type: "video" | "image"; url: string };

export default async function ListingDetail({
  params,
}: {
  params: { id: string };
}) {
  // 1) Ambil data listing
  const { data: listing } = await supabase
    .from("listings")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!listing) {
    return (
      <main style={{ maxWidth: 960, margin: "40px auto" }}>
        <h1>Listing tidak ditemukan</h1>
        <p>
          <Link href="/listings">← Kembali</Link>
        </p>
      </main>
    );
  }

  // 2) Kumpulkan foto dari bucket yang tersedia
  const imageBuckets = ["Listing_image", "listing-images", "listing_images"];
  const imageUrls: string[] = [];
  for (const bucket of imageBuckets) {
    const { data: files, error } = await supabase.storage
      .from(bucket)
      .list(params.id, { limit: 50 });
    if (error || !files?.length) continue;
    for (const f of files) {
      const { data } = supabase.storage
        .from(bucket)
        .getPublicUrl(`${params.id}/${f.name}`);
      if (data?.publicUrl) imageUrls.push(data.publicUrl);
    }
    if (imageUrls.length) break;
  }

  // 3) Kumpulkan video (mp4/webm/mov/m4v) dari bucket video
  const videoBuckets = ["listing-videos", "listing_videos"];
  const videoUrls: string[] = [];
  for (const bucket of videoBuckets) {
    const { data: files, error } = await supabase.storage
      .from(bucket)
      .list(params.id, { limit: 10 });
    if (error || !files?.length) continue;
    for (const f of files) {
      const ext = f.name.split(".").pop()?.toLowerCase();
      if (!ext || !["mp4", "webm", "mov", "m4v"].includes(ext)) continue;
      const { data } = supabase.storage
        .from(bucket)
        .getPublicUrl(`${params.id}/${f.name}`);
      if (data?.publicUrl) videoUrls.push(data.publicUrl);
    }
    if (videoUrls.length) break;
  }

  // 4) Susun media: video (jika ada) selalu di depan
  const media: MediaItem[] = [
    ...videoUrls.map((u) => ({ type: "video" as const, url: u })),
    ...imageUrls.map((u) => ({ type: "image" as const, url: u })),
  ];

  const rp = (n: any) =>
    typeof n === "number"
      ? new Intl.NumberFormat("id-ID", {
          style: "currency",
          currency: "IDR",
          maximumFractionDigits: 0,
        }).format(n)
      : "—";

  const phoneRaw =
    (listing as any).whatsapp || (listing as any).contact_whatsapp || null;
  const wa = normalizeWa(phoneRaw);

  return (
    <main style={{ maxWidth: 1100, margin: "40px auto", padding: "0 16px" }}>
      <p>
        <Link href="/listings">← Kembali ke Listings</Link>
      </p>

      {/* Viewer & thumbs (client) */}
      <MediaViewer media={media} title={listing.title || "unit"} />

      {/* Info */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginTop: 18,
          flexWrap: "wrap",
        }}
      >
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>
          {listing.title}
        </h1>
        {wa && (
          <a
            href={`https://wa.me/${wa}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: "10px 14px",
              border: "1px solid #10b981",
              borderRadius: 10,
            }}
          >
            Chat via WhatsApp
          </a>
        )}
      </div>

      <p style={{ color: "#6b7280", marginTop: 6 }}>
        {listing.brand || "—"} • {listing.year ?? "—"}{" "}
        {listing.location ? `• ${listing.location}` : ""}
      </p>
      <p style={{ fontSize: 22, fontWeight: 800, marginTop: 10 }}>
        {rp(listing.price)}
      </p>

      {listing.description && (
        <>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginTop: 18 }}>
            Deskripsi
          </h3>
          <p style={{ whiteSpace: "pre-wrap" }}>{listing.description}</p>
        </>
      )}
    </main>
  );
}

/* -------------------- Client media viewer -------------------- */
"use client";
import { useEffect, useMemo, useRef, useState } from "react";

function MediaViewer({ media, title }: { media: MediaItem[]; title: string }) {
  const [idx, setIdx] = useState(0);
  const hasMedia = media.length > 0;

  // swipe support
  const startX = useRef<number | null>(null);
  const deltaX = useRef(0);
  const wrapRef = useRef<HTMLDivElement | null>(null);

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
    if (Math.abs(dx) > 40) {
      dx < 0 ? goNext() : goPrev();
    }
  };

  // gabungan thumbnails: video (dengan play icon) + foto
  const thumbs = useMemo(() => media, [media]);

  return (
    <>
      {/* MAIN VIEWER */}
      <div
        ref={wrapRef}
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

      {/* TITLE THUMBS */}
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
