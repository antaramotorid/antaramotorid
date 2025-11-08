// app/listings/[id]/page.tsx
import Link from "next/link";
import MediaViewer, { MediaItem } from "./MediaViewer";
import { supabase } from "../../../lib/supabaseClient";

/** Format Rp */
function rp(n: any) {
  return typeof n === "number"
    ? new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(n)
    : "—";
}

/** Normalisasi nomor WA ke 62xxxxxxxxx */
function normalizeWa(n: any): string | null {
  if (!n) return null;
  const digits = String(n).replace(/[^0-9]/g, "");
  if (!digits) return null;
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  if (digits.startsWith("62")) return digits;
  return digits;
}

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
      <main style={{ maxWidth: 1080, margin: "40px auto", padding: "0 16px" }}>
        <h1>Listing tidak ditemukan</h1>
        <p>
          <Link href="/listings">← Kembali ke Listings</Link>
        </p>
      </main>
    );
  }

  // 2) Kumpulkan FOTO dari bucket yang mungkin
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
    if (imageUrls.length) break; // stop di bucket pertama yang ada isinya
  }

  // 3) Kumpulkan VIDEO dari bucket yang mungkin
  const videoBuckets = ["listing-videos", "Listing_Videos", "listing_videos"];
  const videoUrls: string[] = [];
  for (const bucket of videoBuckets) {
    const { data: files, error } = await supabase.storage
      .from(bucket)
      .list(params.id, { limit: 10 });
    if (error || !files?.length) continue;
    for (const f of files) {
      const ext = f.name.toLowerCase();
      if (!ext.endsWith(".mp4") && !ext.endsWith(".webm") && !ext.endsWith(".ogg")) continue;
      const { data } = supabase.storage
        .from(bucket)
        .getPublicUrl(`${params.id}/${f.name}`);
      if (data?.publicUrl) videoUrls.push(data.publicUrl);
    }
    if (videoUrls.length) break;
  }

  // 4) Susun media: video dulu, baru foto (PAKAI `type` agar cocok dengan MediaViewer.tsx)
  const media: MediaItem[] = [
    ...videoUrls.map((url) => ({ type: "video" as const, url })),
    ...imageUrls.map((url) => ({ type: "image" as const, url })),
  ];

  const wa =
    normalizeWa((listing as any).whatsapp || (listing as any).contact_whatsapp) ||
    null;

  // 5) Siapkan URL Google Maps embed tanpa API key (aman untuk deploy)
  const mapSrc = listing.location
    ? `https://www.google.com/maps?q=${encodeURIComponent(
        String(listing.location)
      )}&output=embed`
    : null;

  return (
    <main style={{ maxWidth: 1100, margin: "40px auto", padding: "0 16px" }}>
      <p>
        <Link href="/listings">← Kembali ke Listings</Link>
      </p>

      {/* Viewer media (video tampil dulu jika ada) */}
      <MediaViewer media={media} title={listing.title || "Unit"} />

      {/* Judul + WA */}
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
        {(listing.brand as any) || "—"} • {listing.year ?? "—"}
        {listing.location ? ` • ${listing.location}` : ""}
      </p>
      <p style={{ fontSize: 22, fontWeight: 800, marginTop: 10 }}>
        {rp(listing.price)}
      </p>

      {/* Deskripsi */}
      {listing.description && (
        <>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginTop: 18 }}>
            Deskripsi
          </h3>
          <p style={{ whiteSpace: "pre-wrap" }}>{listing.description}</p>
        </>
      )}

      {/* Peta ke lokasi penjual */}
      {mapSrc && (
        <>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginTop: 18 }}>
            Lokasi Penjual
          </h3>
          <div style={{ borderRadius: 12, overflow: "hidden" }}>
            <iframe
              src={mapSrc}
              width="100%"
              height="280"
              loading="lazy"
              style={{ border: 0, display: "block" }}
            />
          </div>
        </>
      )}
    </main>
  );
}
