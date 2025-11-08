// app/listings/[id]/page.tsx
import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";
import MediaViewer, { type MediaItem } from "./MediaViewer"; // sinkron tipe

function normalizeWa(n: any): string | null {
  if (!n) return null;
  const digits = String(n).replace(/[^0-9]/g, "");
  if (!digits) return null;
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  if (digits.startsWith("62")) return digits;
  return digits;
}

async function listPublicUrls(
  buckets: string[],
  folder: string,
  allowedExts?: Set<string>
): Promise<string[]> {
  const urls: string[] = [];
  for (const b of buckets) {
    const { data: files, error } = await supabase.storage.from(b).list(folder, { limit: 100 });
    if (error || !files?.length) continue;

    for (const f of files) {
      const ext = (f.name.split(".").pop() || "").toLowerCase();
      if (!allowedExts || allowedExts.has(ext)) {
        const { data } = supabase.storage.from(b).getPublicUrl(`${folder}/${f.name}`);
        if (data?.publicUrl) urls.push(data.publicUrl);
      }
    }
    if (urls.length) break; // pakai bucket pertama yang berisi
  }
  return urls;
}

export default async function ListingDetail({ params }: { params: { id: string } }) {
  // 1) Data listing
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

  // 2) Ambil foto & video dari beberapa nama bucket (robust)
  const imageBuckets = ["listing-images", "Listing_image", "listing_images"];
  const videoBuckets = ["listing-videos", "Listing_videos", "listing_videos"];
  const imageExts = new Set(["jpg", "jpeg", "png", "webp"]);
  const videoExts = new Set(["mp4", "webm", "mov", "m4v"]);

  const [imageUrls, videoUrls] = await Promise.all([
    listPublicUrls(imageBuckets, params.id, imageExts),
    listPublicUrls(videoBuckets, params.id, videoExts),
  ]);

  // 3) Susun media: video dulu, lalu foto — gunakan properti `type` (bukan `kind`)
  const media: MediaItem[] = [
    ...videoUrls.map((url) => ({ type: "video" as const, url })),
    ...imageUrls.map((url) => ({ type: "image" as const, url })),
  ];

  // 4) Util tampilan
  const rp = (n: any) =>
    typeof n === "number"
      ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n)
      : "—";

  const phoneRaw = (listing as any).whatsapp || (listing as any).contact_whatsapp || null;
  const wa = normalizeWa(phoneRaw);

  return (
    <main style={{ maxWidth: 1100, margin: "40px auto", padding: "0 16px" }}>
      <p><Link href="/listings">← Kembali ke Listings</Link></p>

      {/* Slider foto & video (video tampil pertama bila ada) */}
      <MediaViewer media={media} title={listing.title || "Unit"} />

      <h3 style={{ fontSize: 16, fontWeight: 700, marginTop: 12 }}>Foto &amp; Video Unit</h3>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 18, flexWrap: "wrap" }}>
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

      {/* Maps */}
      {listing.location && (
        <section style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Lokasi Penjual</h3>
          <iframe
            title="Lokasi Penjual"
            style={{ width: "100%", height: 280, border: 0, borderRadius: 12 }}
            loading="lazy"
            src={`https://www.google.com/maps?q=${encodeURIComponent(listing.location)}&output=embed`}
          />
        </section>
      )}
    </main>
  );
}
