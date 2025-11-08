// app/listings/[id]/page.tsx
import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";
import MediaViewer, { MediaItem } from "./MediaViewer";

// ——— utils ———
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
      <main style={{ maxWidth: 960, margin: "40px auto", padding: "0 16px" }}>
        <h1>Listing tidak ditemukan</h1>
        <p>
          <Link href="/listings">← Kembali</Link>
        </p>
      </main>
    );
  }

  // 2) Kumpulkan FOTO dari bucket mana pun yang tersedia
  const imageBuckets = ["Listing_image", "listing-images", "listing_images"];
  const imageUrls: string[] = [];
  for (const bucket of imageBuckets) {
    const { data: files, error } = await supabase.storage
      .from(bucket)
      .list(params.id, { limit: 50 });
    if (error) continue;
    if (!files?.length) continue;
    for (const f of files) {
      const { data } = supabase.storage
        .from(bucket)
        .getPublicUrl(`${params.id}/${f.name}`);
      if (data?.publicUrl) imageUrls.push(data.publicUrl);
    }
    if (imageUrls.length) break; // stop di bucket pertama yang punya isi
  }

  // 3) Kumpulkan VIDEO (mp4/webm/mov/m4v) dari bucket video
  const videoBuckets = ["listing-videos", "Listing_videos", "listing_videos"];
  const videoUrls: string[] = [];
  for (const bucket of videoBuckets) {
    const { data: files, error } = await supabase.storage
      .from(bucket)
      .list(params.id, { limit: 20 });
    if (error) continue;
    if (!files?.length) continue;

    for (const f of files) {
      const ext = f.name.split(".").pop()?.toLowerCase() || "";
      // filter ekstensi umum
      if (!["mp4", "webm", "mov", "m4v"].includes(ext)) continue;

      const { data } = supabase.storage
        .from(bucket)
        .getPublicUrl(`${params.id}/${f.name}`);
      if (data?.publicUrl) videoUrls.push(data.publicUrl);
    }
    if (videoUrls.length) break;
  }

  // 4) Susun media: VIDEO dulu, baru FOTO
  const media: MediaItem[] = [
    ...videoUrls.map((url) => ({ type: "video" as const, url })),
    ...imageUrls.map((url) => ({ type: "image" as const, url })),
  ];

  // 5) Util tampilan & WA
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

  // 6) Render
  return (
    <main style={{ maxWidth: 1100, margin: "40px auto", padding: "0 16px" }}>
      <p>
        <Link href="/listings">← Kembali ke Listings</Link>
      </p>

      {/* Slider foto & video (video tampil pertama bila ada) */}
      <MediaViewer media={media} title={listing.title || "Unit"} />

      <h3 style={{ fontSize: 16, fontWeight: 700, marginTop: 12 }}>
        Foto &amp; Video Unit
      </h3>

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

      {/* MAPS (tetap seperti sebelumnya jika Anda sudah menambahkannya).
          Bila Anda sudah punya komponen Maps terpisah, sisipkan di sini. */}
    </main>
  );
}
