// app/listings/[id]/page.tsx
import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";

function normalizeWa(n: any): string | null {
  if (!n) return null;
  const digits = String(n).replace(/[^0-9]/g, "");
  if (!digits) return null;
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  if (digits.startsWith("62")) return digits;
  return digits; // fallback
}

export default async function ListingDetail({ params }: { params: { id: string } }) {
  // — Fetch listing
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

  // — Try to get image from bucket(s)
  const buckets = ["Listing_image", "listing-images", "listing_images"];
  let imageUrl: string | null = null;

  for (const bucket of buckets) {
    const { data: files } = await supabase.storage.from(bucket).list(params.id, { limit: 50 });
    if (files?.length) {
      const chosen = files[0].name;
      const { data } = supabase.storage.from(bucket).getPublicUrl(`${params.id}/${chosen}`);
      if (data?.publicUrl) {
        imageUrl = data.publicUrl;
        break;
      }
    }
  }

  const rp = (n: any) =>
    typeof n === "number"
      ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n)
      : "—";

  // — Handle WA from either column
  const phoneRaw = (listing as any).whatsapp || (listing as any).contact_whatsapp || null;
  const wa = normalizeWa(phoneRaw);

  return (
    <main style={{ maxWidth: 1000, margin: "40px auto", padding: "0 16px" }}>
      <p><Link href="/listings">← Kembali ke Listings</Link></p>

      {imageUrl ? (
        <img src={imageUrl} alt={listing.title || "foto unit"} style={{ width: "100%", borderRadius: 12, marginTop: 12 }} />
      ) : (
        <div style={{ width: "100%", aspectRatio: "16/9", background: "#f3f4f6", borderRadius: 12, display: "grid", placeItems: "center", color: "#9ca3af", marginTop: 12 }}>
          Tidak ada foto
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>{listing.title}</h1>
        {wa && (
          <a
            href={`https://wa.me/${wa}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ padding: "8px 12px", border: "1px solid #10b981", borderRadius: 10 }}
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
