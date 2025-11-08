// app/listings/[id]/page.tsx
import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";

export const dynamic = "force-dynamic"; // pastikan tidak tersangkut cache

type MediaItem = { kind: "image" | "video"; url: string; thumb?: string };

function normalizeWa(n: any): string | null {
  if (!n) return null;
  const digits = String(n).replace(/[^0-9]/g, "");
  if (!digits) return null;
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  if (digits.startsWith("62")) return digits;
  return digits;
}

async function listPublicUrls(bucket: string, folder: string): Promise<string[]> {
  const out: string[] = [];
  const { data: files, error } = await supabase.storage.from(bucket).list(folder, {
    limit: 100,
    sortBy: { column: "name", order: "asc" },
  });
  if (error || !files) return out;
  for (const f of files) {
    if (f.name.startsWith(".")) continue;
    const { data } = supabase.storage.from(bucket).getPublicUrl(`${folder}/${f.name}`);
    if (data?.publicUrl) out.push(data.publicUrl);
  }
  return out;
}

export default async function ListingDetail({ params }: { params: { id: string } }) {
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
        <p><Link href="/listings">← Kembali</Link></p>
      </main>
    );
  }

  // 2) Kumpulkan semua foto
  const imageBuckets = ["listing-images", "Listing_image", "listing_images"];
  let imageUrls: string[] = [];
  for (const b of imageBuckets) {
    const urls = await listPublicUrls(b, params.id);
    if (urls.length) { imageUrls = urls; break; }
  }
  // fallback dari table listing_images
  if (imageUrls.length === 0) {
    const { data: imgRows } = await supabase
      .from("listing_images")
      .select("file_path")
      .eq("listing_id", params.id)
      .order("sort_order", { ascending: true })
      .limit(12);
    for (const r of imgRows ?? []) {
      for (const b of imageBuckets) {
        const { data } = supabase.storage.from(b).getPublicUrl(r.file_path);
        if (data?.publicUrl) imageUrls.push(data.publicUrl);
      }
    }
  }

  // 3) Kumpulkan semua video
  let videoUrls: string[] = [];
  const { data: pending } = await supabase
    .from("listing_videos_pending")
    .select("file_path")
    .eq("listing_id", params.id)
    .order("created_at", { ascending: true });

  if (pending?.length) {
    for (const row of pending) {
      const { data } = supabase.storage.from("listing-videos").getPublicUrl(row.file_path);
      if (data?.publicUrl) videoUrls.push(data.publicUrl);
    }
  } else {
    // scan folder id di bucket listing-videos
    const scan = await listPublicUrls("listing-videos", params.id);
    if (scan.length) videoUrls = scan;
  }

  // 4) Susun media: video dulu, lalu foto
  const media: MediaItem[] = [
    ...videoUrls.map((url) => ({ kind: "video" as const, url })),
    ...imageUrls.map((url) => ({ kind: "image" as const, url })),
  ];

  // 5) Util format & WA
  const rp = (n: any) =>
    typeof n === "number"
      ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n)
      : "—";

  const phoneRaw = (listing as any).whatsapp || (listing as any).contact_whatsapp || null;
  const wa = normalizeWa(phoneRaw);

  return (
    <main style={{ maxWidth: 1100, margin: "40px auto", padding: "0 16px" }}>
      <p><Link href="/listings">← Kembali ke Listings</Link></p>

      {/* Media slider */}
      <MediaViewer media={media} title={listing.title || "Unit"} />

      <h3 style={{ fontSize: 16, fontWeight: 700, marginTop: 12 }}>Foto &amp; Video Unit</h3>
      {/* Thumbnail bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {media.map((m, i) => (
          <div key={i} style={{ width: 78, height: 78, borderRadius: 8, overflow: "hidden", border: "1px solid #e5e7eb" }}>
            {m.kind === "image" ? (
              <img src={m.url} alt={`thumb-${i}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", background: "#f3f4f6" }}>▶</div>
            )}
          </div>
        ))}
      </div>

      {/* Info */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>{listing.title}</h1>
        {wa && (
          <a
            href={`https://wa.me/${wa}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ padding: "10px 14px", border: "1px solid #10b981", borderRadius: 10 }}
          >
            Chat via WhatsApp
          </a>
        )}
      </div>

      <p style={{ color: "#6b7280", marginTop: 6 }}>
        {listing.brand || "—"} • {listing.year ?? "—"} {listing.location ? `• ${listing.location}` : ""}
      </p>
      <p style={{ fontSize: 22, fontWeight: 800, marginTop: 10 }}>{rp(listing.price)}</p>

      {listing.description && (
        <>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginTop: 18 }}>Deskripsi</h3>
          <p style={{ whiteSpace: "pre-wrap" }}>{listing.description}</p>
        </>
      )}
    </main>
  );
}

/* -------------------- Client media viewer -------------------- */
"use client";
import { useEffect, useRef, useState } from "react";

function MediaViewer({ media, title }: { media: MediaItem[]; title: string }) {
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
