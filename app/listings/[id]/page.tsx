// app/listings/[id]/page.tsx
import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";
import MediaViewer, { MediaItem } from "./MediaViewer";

// ------ util server-only ------
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

  // 5) Peta lokasi (embed dari text location bila ada)
  const mapEmbed = listing.location
    ? `https://www.google.com/maps?q=${encodeURIComponent(
        listing.location
      )}&output=embed`
    : null;

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

      {/* Lokasi Penjual (peta) */}
      {mapEmbed && (
        <section style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
            Lokasi Penjual
          </h3>
          <div
            style={{
              borderRadius: 12,
              overflow: "hidden",
              border: "1px solid #e5e7eb",
            }}
          >
            <iframe
              src={mapEmbed}
              loading="lazy"
              style={{ width: "100%", height: 360, border: "0" }}
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </section>
      )}
    </main>
  );
}
