// app/listings/[id]/page.tsx
import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";
import MediaViewer, { type MediaItem } from "./MediaViewer";

// --- helpers ----------------------------------------------------
function normalizeWa(n: any): string | null {
  if (!n) return null;
  const digits = String(n).replace(/[^0-9]/g, "");
  if (!digits) return null;
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  if (digits.startsWith("62")) return digits;
  return digits;
}

// Google Maps embed helper (ADD)
function getMapEmbedUrl(location?: string | null) {
  if (!location) return null;
  const q = encodeURIComponent(location);
  return `https://www.google.com/maps?q=${q}&output=embed`;
}

// Ambil semua URL gambar dari bucket kandidat
async function getImageUrls(id: string): Promise<string[]> {
  const buckets = ["Listing_image", "listing-images", "listing_images"];
  for (const bucket of buckets) {
    const { data: files, error } = await supabase.storage
      .from(bucket)
      .list(id, { limit: 50 });
    if (error || !files?.length) continue;

    const urls: string[] = [];
    for (const f of files) {
      const { data } = supabase.storage
        .from(bucket)
        .getPublicUrl(`${id}/${f.name}`);
      if (data?.publicUrl) urls.push(data.publicUrl);
    }
    if (urls.length) return urls;
  }
  return [];
}

// Ambil semua URL video dari bucket video
async function getVideoUrls(id: string): Promise<string[]> {
  const bucket = "listing-videos";
  const { data: files, error } = await supabase.storage
    .from(bucket)
    .list(id, { limit: 10 });
  if (error || !files?.length) return [];
  const urls: string[] = [];
  for (const f of files) {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(`${id}/${f.name}`);
    if (data?.publicUrl) urls.push(data.publicUrl);
  }
  return urls;
}

// --- page -------------------------------------------------------
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
      <main style={{ maxWidth: 960, margin: "40px auto", padding: "0 16px" }}>
        <h1>Listing tidak ditemukan</h1>
        <p>
          <Link href="/listings">← Kembali ke Listings</Link>
        </p>
      </main>
    );
  }

  // 2) Ambil media dari storage (video dulu agar tampil pertama)
  const [videos, images] = await Promise.all([
    getVideoUrls(params.id),
    getImageUrls(params.id),
  ]);

  // 3) Susun media untuk MediaViewer (type: "video" | "image")
  const media: MediaItem[] = [
    ...videos.map((url) => ({ type: "video" as const, url })),
    ...images.map((url) => ({ type: "image" as const, url })),
  ];

  // 4) Util format & WA
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
  const mapSrc = getMapEmbedUrl(listing.location);

  // 5) Render
  return (
    <main style={{ maxWidth: 1100, margin: "40px auto", padding: "0 16px" }}>
      <p>
        <Link href="/listings">← Kembali ke Listings</Link>
      </p>

      {/* Slider foto & video (video tampil pertama bila ada) */}
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

      {/* Meta singkat */}
      <p style={{ color: "#6b7280", marginTop: 6 }}>
        {listing.brand || "—"} • {listing.year ?? "—"}
        {listing.location ? ` • ${listing.location}` : ""}
      </p>
      <p style={{ fontSize: 22, fontWeight: 800, marginTop: 10 }}>
        {rp(listing.price)}
      </p>

      {/* Lokasi + MAP (ADD) */}
      <h3 style={{ fontSize: 16, fontWeight: 700, marginTop: 18 }}>
        Lokasi Penjual
      </h3>
      <p style={{ margin: "6px 0 12px 0" }}>{listing.location || "-"}</p>
      {mapSrc && (
        <div
          style={{
            width: "100%",
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: "0 1px 6px rgba(0,0,0,.08)",
            marginBottom: 16,
          }}
        >
          <iframe
            title="Lokasi Penjual"
            src={mapSrc}
            width="100%"
            height="240"
            style={{ border: 0, display: "block" }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      )}

      {/* Deskripsi */}
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
