// app/listings/[id]/page.tsx
import Link from "next/link";
import dynamic from "next/dynamic";
import { supabase } from "../../../lib/supabaseClient";

// MediaViewer client (versi hijau yang kamu pakai sekarang)
const MediaViewer = dynamic(() => import("./MediaViewer"), { ssr: false });

const IMAGE_BUCKETS = [
  "Listing_image",
  "listing-images",
  "listing_images",
  "listingimages",
  "images",
];
const VIDEO_BUCKET = "listing-videos";

function normalizeWa(n: any): string | null {
  if (!n) return null;
  const digits = String(n).replace(/[^0-9]/g, "");
  if (!digits) return null;
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  if (digits.startsWith("62")) return digits;
  return digits;
}

async function listImages(id: string): Promise<string[]> {
  for (const bucket of IMAGE_BUCKETS) {
    const { data: files, error } = await supabase.storage
      .from(bucket)
      .list(id, { limit: 100, sortBy: { column: "name", order: "asc" } });
    if (error || !files || files.length === 0) continue;

    const imgs = files
      .filter((f) => /\.(jpe?g|png|webp|gif)$/i.test(f.name))
      .map((f) => supabase.storage.from(bucket).getPublicUrl(`${id}/${f.name}`).data.publicUrl)
      .filter(Boolean) as string[];

    if (imgs.length) return imgs;
  }
  // fallback dari tabel listing_images
  const { data: rows } = await supabase
    .from("listing_images")
    .select("file_path")
    .eq("listing_id", id);
  const urls: string[] = [];
  for (const r of rows ?? []) {
    const path = String(r.file_path);
    const slash = path.indexOf("/");
    if (slash < 0) continue;
    const bucket = path.slice(0, slash);
    const objectPath = path.slice(slash + 1);
    const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);
    if (data?.publicUrl) urls.push(data.publicUrl);
  }
  return urls;
}

async function listVideos(id: string): Promise<string[]> {
  const { data: files } = await supabase.storage
    .from(VIDEO_BUCKET)
    .list(id, { limit: 50, sortBy: { column: "name", order: "asc" } });
  return (
    files
      ?.filter((f) => /\.(mp4|webm|mov|m4v)$/i.test(f.name))
      .map((f) => supabase.storage.from(VIDEO_BUCKET).getPublicUrl(`${id}/${f.name}`).data.publicUrl)
      .filter(Boolean) ?? []
  );
}

export default async function ListingDetail({ params }: { params: { id: string } }) {
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

  const imageUrls = await listImages(params.id);
  const videoUrls = await listVideos(params.id);

  // Susun: video dulu bila ada, lalu foto
  const media = [
    ...videoUrls.map((url) => ({ kind: "video" as const, url })),
    ...imageUrls.map((url) => ({ kind: "image" as const, url })),
  ];

  const rp = (n: any) =>
    typeof n === "number"
      ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n)
      : "—";

  const phoneRaw = (listing as any).whatsapp || (listing as any).contact_whatsapp || null;
  const wa = normalizeWa(phoneRaw);

  return (
    <main style={{ maxWidth: 1100, margin: "40px auto", padding: "0 16px" }}>
      <p>
        <Link href="/listings">← Kembali ke Listings</Link>
      </p>

      <MediaViewer media={media} title={listing.title || "Unit"} />

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
    </main>
  );
}
