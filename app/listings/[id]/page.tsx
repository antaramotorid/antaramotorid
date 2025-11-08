// app/listings/[id]/page.tsx
import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";
import MediaViewer, { type MediaItem } from "./MediaViewer";

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
        <p><Link href="/listings">← Kembali</Link></p>
      </main>
    );
  }

  // 2) Kumpulkan FOTO dari bucket yang ada
  const imageBuckets = ["Listing_image", "listing-images", "listing_images"];
  const imageUrls: string[] = [];
  for (const bucket of imageBuckets) {
    const { data: files, error } = await supabase.storage
      .from(bucket)
      .list(params.id, { limit: 50 });
    if (error || !files?.length) continue;

    for (const f of files) {
      const { data } = supabase
        .storage
        .from(bucket)
        .getPublicUrl(`${params.id}/${f.name}`);
      if (data?.publicUrl) imageUrls.push(data.publicUrl);
    }
    if (imageUrls.length) break; // stop di bucket pertama yang berisi
  }

  // 3) Kumpulkan VIDEO dari bucket listing-videos (ekstensi umum)
  const videoUrls: string[] = [];
  {
    const { data: vfiles } = await supabase.storage
      .from("listing-videos")
      .list(params.id, { limit: 20 });

    if (vfiles?.length) {
      for (const f of vfiles) {
        const ext = f.name.split(".").pop()?.toLowerCase();
        if (ext && ["mp4", "webm", "mov", "m4v"].includes(ext)) {
          const { data } = supabase.storage
            .from("listing-videos")
            .getPublicUrl(`${params.id}/${f.name}`);
          if (data?.publicUrl) videoUrls.push(data.publicUrl);
        }
      }
    }
  }

  // 4) Susun media: video dulu, lalu foto (sesuai tipe MediaViewer)
  const media: MediaItem[] = [
    ...videoUrls.map((url) => ({ type: "video" as const, url })),
    ...imageUrls.map((url) => ({ type: "image" as const, url })),
  ];

  // Util tampilan & WA
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

  return (
    <main style={{ maxWidth: 1100, margin: "40px auto", padding: "0 16px" }}>
      <p><Link href="/listings">← Kembali ke Listings</Link></p>

      {/* Slider foto & video (video tampil pertama bila ada) */}
      <MediaViewer media={media} title={listing.title || "Unit"} />

      <h3 style={{ fontSize: 16, fontWeight: 700, marginTop: 12 }}>
        Foto &amp; Video Unit
      </h3>

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
      <p style={{ fontSize: 22, fontWeight: 800, marginTop: 10 }}>
        {rp(listing.price)}
      </p>

      {listing.description && (
        <>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginTop: 18 }}>Deskripsi</h3>
          <p style={{ whiteSpace: "pre-wrap" }}>{listing.description}</p>
        </>
      )}

      {listing.location && (
        <section style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
            Lokasi Penjual
          </h3>
          <div style={{ borderRadius: 12, overflow: "hidden" }}>
            <iframe
              title="Lokasi penjual"
              width="100%"
              height="320"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://www.google.com/maps?q=${encodeURIComponent(String(listing.location))}&output=embed`}
            />
          </div>
        </section>
      )}
    </main>
  );
}
