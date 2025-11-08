// app/listings/[id]/page.tsx
import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";
import MediaViewer, { type MediaItem } from "./MediaViewer";

/** --- Util kecil --- */
function normalizeWa(n: any): string | null {
  if (!n) return null;
  const digits = String(n).replace(/[^0-9]/g, "");
  if (!digits) return null;
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  if (digits.startsWith("62")) return digits;
  return digits;
}

const rp = (n: any) =>
  typeof n === "number"
    ? new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(n)
    : "—";

/** --- Helper ambil URL publik gambar & video dari storage --- */
/** Catatan: prioritas bucket ke 'listing-images'. Yang lain tetap dicoba jika ada (aman). */
const IMAGE_BUCKET_CANDIDATES = ["listing-images", "Listing_image", "listing_images"] as const;
const VIDEO_BUCKET = "listing-videos";

async function listFilesFromFirstAvailableBucket(
  folder: string,
  candidates: readonly string[]
): Promise<{ bucket: string; files: { name: string }[] } | null> {
  for (const bucket of candidates) {
    const { data: files, error } = await supabase.storage.from(bucket).list(folder, { limit: 100 });
    if (!error && files && files.length) {
      return { bucket, files };
    }
  }
  return null;
}

async function getImageUrls(listingId: string): Promise<string[]> {
  const found = await listFilesFromFirstAvailableBucket(listingId, IMAGE_BUCKET_CANDIDATES);
  if (!found) return [];
  const { bucket, files } = found;
  return files
    .filter(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f.name))
    .map(f => supabase.storage.from(bucket).getPublicUrl(`${listingId}/${f.name}`).data.publicUrl)
    .filter(Boolean);
}

async function getVideoUrls(listingId: string): Promise<string[]> {
  const { data: files, error } = await supabase.storage.from(VIDEO_BUCKET).list(listingId, { limit: 10 });
  if (error || !files?.length) return [];
  return files
    .filter(f => /\.(mp4|webm|mov|m4v)$/i.test(f.name))
    .map(f => supabase.storage.from(VIDEO_BUCKET).getPublicUrl(`${listingId}/${f.name}`).data.publicUrl)
    .filter(Boolean);
}

/** --- Page --- */
export default async function ListingDetail({ params }: { params: { id: string } }) {
  const id = params.id;

  // 1) Ambil data listing
  const { data: listing } = await supabase.from("listings").select("*").eq("id", id).single();

  if (!listing) {
    return (
      <main style={{ maxWidth: 980, margin: "40px auto", padding: "0 16px" }}>
        <h1>Listing tidak ditemukan</h1>
        <p>
          <Link href="/listings">← Kembali</Link>
        </p>
      </main>
    );
  }

  // 2) Ambil media dari storage (video dulu agar tampil pertama)
  const [videos, images] = await Promise.all([getVideoUrls(id), getImageUrls(id)]);

  // 3) Susun untuk MediaViewer (WAJIB pakai key 'type' sesuai MediaViewer)
  const media: MediaItem[] = [
    ...videos.map(url => ({ type: "video" as const, url })),
    ...images.map(url => ({ type: "image" as const, url })),
  ];

  // 4) Siapkan data kontak & lokasi
  const phoneRaw = (listing as any).whatsapp || (listing as any).contact_whatsapp || null;
  const wa = normalizeWa(phoneRaw);

  const locationStr: string | null =
    (listing as any).location && typeof (listing as any).location === "string"
      ? (listing as any).location
      : null;

  return (
    <main style={{ maxWidth: 1100, margin: "40px auto", padding: "0 16px" }}>
      <p style={{ marginBottom: 12 }}>
        <Link href="/listings">← Kembali ke Listings</Link>
      </p>

      {/* Slider foto & video (video tampil pertama bila ada) */}
      <MediaViewer media={media} title={listing.title || "Unit"} />

      {/* Header + WA */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 18, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>{listing.title}</h1>
        {wa && (
          <a
            href={`https://wa.me/${wa}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: "10px 14px",
              border: "1px solid #10b981",
              borderRadius: 10,
              textDecoration: "none",
            }}
          >
            Chat via WhatsApp
          </a>
        )}
      </div>

      {/* Info ringkas */}
      <p style={{ color: "#6b7280", marginTop: 6 }}>
        {(listing as any).brand || "—"} • {(listing as any).year ?? "—"}{" "}
        {locationStr ? `• ${locationStr}` : ""}
      </p>
      <p style={{ fontSize: 22, fontWeight: 800, marginTop: 10 }}>{rp((listing as any).price)}</p>

      {/* Deskripsi */}
      {(listing as any).description && (
        <>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginTop: 18 }}>Deskripsi</h3>
          <p style={{ whiteSpace: "pre-wrap" }}>{(listing as any).description}</p>
        </>
      )}

      {/* Peta (optional, pakai query alamat) */}
      {locationStr && (
        <>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginTop: 18 }}>Lokasi</h3>
          <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #e5e7eb" }}>
            <iframe
              title="Map Lokasi"
              src={`https://www.google.com/maps?q=${encodeURIComponent(locationStr)}&output=embed`}
              style={{ width: "100%", height: 320, border: 0 }}
              loading="lazy"
            />
          </div>
        </>
      )}
    </main>
  );
}
