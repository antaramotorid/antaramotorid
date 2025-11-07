// app/listings/[id]/page.tsx
import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";

function normalizeWa(n: any): string | null {
  if (!n) return null;
  const digits = String(n).replace(/[^0-9]/g, "");
  if (!digits) return null;
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  if (digits.startsWith("62")) return digits;
  return digits;
}

export default async function ListingDetail({ params }: { params: { id: string } }) {
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
        <p><Link href="/listings">← Kembali</Link></p>
      </main>
    );
  }

  // 2) Kumpulkan semua gambar dari bucket mana pun yang tersedia
  const candidateBuckets = ["Listing_image", "listing-images", "listing_images"];
  const imageUrls: string[] = [];

  for (const bucket of candidateBuckets) {
    const { data: files, error } = await supabase.storage.from(bucket).list(params.id, { limit: 50 });
    if (error) continue;
    if (!files?.length) continue;

    for (const f of files) {
      const { data } = supabase.storage.from(bucket).getPublicUrl(`${params.id}/${f.name}`);
      if (data?.publicUrl) imageUrls.push(data.publicUrl);
    }
    if (imageUrls.length) break; // stop di bucket pertama yang punya isi
  }

  // 3) Util format & WA
  const rp = (n: any) =>
    typeof n === "number"
      ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n)
      : "—";

  const phoneRaw = (listing as any).whatsapp || (listing as any).contact_whatsapp || null;
  const wa = normalizeWa(phoneRaw);

  return (
    <main style={{ maxWidth: 1100, margin: "40px auto", padding: "0 16px" }}>
      <p><Link href="/listings">← Kembali ke Listings</Link></p>

      {/* Foto besar */}
      {imageUrls.length ? (
        <img
          src={imageUrls[0]}
          alt={listing.title || "foto unit"}
          style={{ width: "100%", borderRadius: 12, marginTop: 12, objectFit: "cover", maxHeight: 520 }}
        />
      ) : (
        <div style={{ width: "100%", aspectRatio: "16/9", background: "#f3f4f6", borderRadius: 12, display: "grid", placeItems: "center", color: "#9ca3af", marginTop: 12 }}>
          Tidak ada foto
        </div>
      )}

      {/* Thumbnails */}
      {imageUrls.length > 1 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))", gap: 10, marginTop: 10 }}>
          {imageUrls.slice(1).map((url, i) => (
            <img
              key={i}
              src={url}
              alt={`thumb-${i + 2}`}
              style={{ width: "100%", height: 100, objectFit: "cover", borderRadius: 8 }}
            />
          ))}
        </div>
      )}

      {/* Info */}
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
