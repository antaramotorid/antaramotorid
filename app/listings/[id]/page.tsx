// app/listings/[id]/page.tsx
import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";
import MediaViewer, { MediaItem } from "./MediaViewer";

function normalizeWa(n: any): string | null {
  if (!n) return null;
  const digits = String(n).replace(/[^0-9]/g, "");
  if (!digits) return null;
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  if (digits.startsWith("62")) return digits;
  return digits;
}

export default async function ListingDetail({ params }: { params: { id: string } }) {
  // 1) data listing
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

  // 2) ambil FOTO dari bucket `listing-images`
  const imageUrls: string[] = [];
  {
    const { data: files } = await supabase.storage
      .from("listing-images")
      .list(params.id, { limit: 50 });
    for (const f of files || []) {
      const { data } = supabase.storage
        .from("listing-images")
        .getPublicUrl(`${params.id}/${f.name}`);
      if (data?.publicUrl) imageUrls.push(data.publicUrl);
    }
  }

  // 3) ambil VIDEO dari bucket `listing-videos`
  const videoUrls: string[] = [];
  {
    const { data: files } = await supabase.storage
      .from("listing-videos")
      .list(params.id, { limit: 10 });
    for (const f of files || []) {
      const { data } = supabase.storage
        .from("listing-videos")
        .getPublicUrl(`${params.id}/${f.name}`);
      if (data?.publicUrl) videoUrls.push(data.publicUrl);
    }
  }

  // 4) gabung: video dulu, lalu foto (TETAP type: "video"/"image")
  const media: MediaItem[] = [
    ...videoUrls.map((url) => ({ type: "video" as const, url })),
    ...imageUrls.map((url) => ({ type: "image" as const, url })),
  ];

  // 5) format & WA
  const rp = (n: any) =>
    typeof n === "number"
      ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n)
      : "—";
  const wa = normalizeWa((listing as any).whatsapp);

  // 6) render
  return (
    <main style={{ maxWidth: 1100, margin: "40px auto", padding: "0 16px" }}>
      <p><Link href="/listings">← Kembali ke Listings</Link></p>

      {/* media slider */}
      <MediaViewer media={media} title={listing.title || "Unit"} />

      {/* judul + WA */}
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
          <h3 style={{ fontSize: 16, fontWeight: 700, marginTop: 14 }}>Deskripsi</h3>
          <p style={{ whiteSpace: "pre-wrap" }}>{listing.description}</p>
        </>
      )}

      {/* MAPS dikembalikan */}
      {listing.location && (
        <>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginTop: 16 }}>Lokasi Penjual</h3>
          <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #e5e7eb" }}>
            <iframe
              title="maps"
              src={`https://www.google.com/maps?q=${encodeURIComponent(
                listing.location
              )}&hl=id&z=13&output=embed`}
              style={{ width: "100%", height: 320, border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </>
      )}
    </main>
  );
}
