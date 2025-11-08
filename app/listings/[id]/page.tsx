// app/listings/[id]/page.tsx
import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";
import type { MediaItem } from "./MediaViewer";

export const dynamic = "force-dynamic"; // hindari cache

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

  // 2) Kumpulkan semua foto (cari di beberapa bucket umum)
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
    const scan = await listPublicUrls("listing-videos", params.id);
    if (scan.length) videoUrls = scan;
  }

  // 4) Susun media: video dulu, lalu foto  (PAKAI `type`, BUKAN `kind`)
  const media: MediaItem[] = [
    ...videoUrls.map((url) => ({ type: "video" as const, url })),
    ...imageUrls.map((url) => ({ type: "image" as const, url })),
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

      {/* Slider media (client component) */}
      <MediaViewer media={media} title={listing.title || "Unit"} />

      <h3 style={{ fontSize: 16, fontWeight: 700, marginTop: 12 }}>Foto &amp; Video Unit</h3>
      {/* Bar thumbnail */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {media.map((m, i) => (
          <div key={i} style={{ width: 78, height: 78, borderRadius: 8, overflow: "hidden", border: "1px solid #e5e7eb" }}>
            {m.type === "image" ? (
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

// IMPORT SETELAH EXPORT DEFAULT, tetap server file (tanpa "use client" di sini)
import MediaViewer from "./MediaViewer";
