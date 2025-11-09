// app/listings/[id]/page.tsx
import { supabase } from "../../../lib/supabaseClient";
import MediaViewer, { type MediaItem } from "./MediaViewer";

type PageProps = { params: { id: string } };

// --- Helpers ambil media dari storage ---
async function getVideoUrls(listingId: string): Promise<string[]> {
  const buckets = ["listing-videos", "listing_videos", "listing-videos-pending"];
  for (const bucket of buckets) {
    const { data: files, error } = await supabase.storage.from(bucket).list(listingId, { limit: 100 });
    if (error || !files?.length) continue;
    const videos = files.filter((f) => /\.(mp4|webm|ogg|mov|m4v)$/i.test(f.name));
    if (!videos.length) continue;

    return videos
      .map((v) => {
        const path = `${listingId}/${v.name}`;
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        return data?.publicUrl ?? "";
      })
      .filter(Boolean);
  }
  return [];
}

async function getImageUrls(listingId: string): Promise<string[]> {
  const buckets = ["listing-images", "listing_image", "listing_images"];
  for (const bucket of buckets) {
    const { data: files, error } = await supabase.storage.from(bucket).list(listingId, { limit: 100 });
    if (error || !files?.length) continue;
    const images = files.filter((f) => /\.(png|jpe?g|webp|gif|bmp)$/i.test(f.name));
    if (!images.length) continue;

    return images
      .map((img) => {
        const path = `${listingId}/${img.name}`;
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        return data?.publicUrl ?? "";
      })
      .filter(Boolean);
  }
  return [];
}

function rp(n: any) {
  if (typeof n !== "number") return "—";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

export default async function ListingDetailPage({ params }: PageProps) {
  const id = params.id;

  // 1) Data listing
  const { data: listing } = await supabase.from("listings").select("*").eq("id", id).single();

  // 2) Media (video dulu agar tampil pertama)
  const [videoUrls, imageUrls] = await Promise.all([getVideoUrls(id), getImageUrls(id)]);
  const media: MediaItem[] = [
    ...videoUrls.map((url) => ({ type: "video" as const, url })),
    ...imageUrls.map((url) => ({ type: "image" as const, url })),
  ];

  // 3) Maps embed (tanpa API key)
  const mapsQuery = encodeURIComponent(
    (listing?.location && String(listing.location).trim()) || "Jakarta, Indonesia"
  );
  const mapsSrc = `https://www.google.com/maps?q=${mapsQuery}&output=embed`;

  return (
    <main style={{ maxWidth: 1100, margin: "24px auto", padding: "0 16px" }}>
      {/* Media slider */}
      <MediaViewer media={media} title={listing?.title || "Unit"} />

      {/* Header & ringkasan */}
      <div style={{ display: "flex", gap: 24, alignItems: "flex-start", marginTop: 16, flexWrap: "wrap" }}>
        <div style={{ minWidth: 260, flex: "1 1 320px" }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>{listing?.title}</h1>
          <p style={{ margin: "6px 0 0", color: "#6b7280", textTransform: "lowercase" }}>
            {(listing?.brand || "").toLowerCase()} {listing?.year ? `• ${listing.year}` : ""}{" "}
            {listing?.location ? `• ${listing.location}` : ""}
          </p>
          <div style={{ fontSize: 22, fontWeight: 900, marginTop: 10 }}>{rp(listing?.price)}</div>

          {/* Spesifikasi tambahan (Warna, Tipe, KM) */}
          <div
            style={{
              marginTop: 10,
              padding: "10px 12px",
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              background: "#fafafa",
              fontSize: 14,
              lineHeight: 1.5,
              color: "#111827",
              maxWidth: 520,
            }}
          >
            <div><b>Warna</b>: {listing?.color || "—"}</div>
            <div><b>Tipe/Model</b>: {listing?.unit_type || "—"}</div>
            <div>
              <b>Kilometer</b>: {typeof listing?.mileage_km === "number" ? `${listing.mileage_km.toLocaleString("id-ID")} km` : "—"}
            </div>
          </div>

          {/* Tombol WA */}
          <div style={{ marginTop: 12 }}>
            <a
              href={listing?.whatsapp ? `https://wa.me/${listing.whatsapp}` : "#"}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-block",
                padding: "8px 12px",
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                textDecoration: "none",
                color: "#111827",
                background: "#fff",
              }}
            >
              Chat via WhatsApp
            </a>
          </div>

          {/* Deskripsi */}
          <div style={{ marginTop: 18 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 6px" }}>Deskripsi</h3>
            <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{listing?.description || "—"}</p>
          </div>

          {/* MAPS — diposisikan DI BAWAH Deskripsi */}
          <div style={{ marginTop: 18 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 10px" }}>Lokasi Penjual</h3>
            <div
              style={{
                width: "100%",
                maxWidth: 700,
                borderRadius: 12,
                overflow: "hidden",
                border: "1px solid #e5e7eb",
                background: "#f8fafc",
              }}
            >
              <iframe
                title="Lokasi Penjual"
                src={mapsSrc}
                style={{ width: "100%", height: 360, border: 0, display: "block" }}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
