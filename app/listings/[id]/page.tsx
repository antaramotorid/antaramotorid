// app/listings/[id]/page.tsx
import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";

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

  // 2) ambil path dari tabel (kalau ada)
  const { data: imgs } = await supabase
    .from("listing_images")
    .select("file_path, sort_order, created_at")
    .eq("listing_id", params.id)
    .order("sort_order", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: true });

  const firstPath = (imgs?.[0]?.file_path || "").replace(/^listing[-_]images\//, "");
  const expectFileName = firstPath.split("/").pop() || null;

  // 3) cari file di Storage (prioritas bucket yang kamu sebutkan)
  const buckets = ["Listing_image", "listing-images", "listing_images"];
  let imageUrl: string | null = null;

  for (const bucket of buckets) {
    // list isi folder <id>/ di bucket
    const { data: files } = await supabase.storage.from(bucket).list(params.id, {
      limit: 100,
      sortBy: { column: "name", order: "asc" },
    });

    if (files && files.length) {
      // kalau kita tahu nama file dari DB, pakai itu; kalau tidak, pakai file pertama
      const chosen =
        (expectFileName && files.find((f) => f.name === expectFileName)?.name) ||
        files[0].name;

      const { data } = supabase
        .storage
        .from(bucket)
        .getPublicUrl(`${params.id}/${chosen}`);

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

  return (
    <main style={{ maxWidth: 1000, margin: "40px auto", padding: "0 16px" }}>
      <p><Link href="/listings">← Kembali ke Listings</Link></p>

      {imageUrl ? (
        <img
          src={imageUrl}
          alt={listing.title || "foto unit"}
          style={{ width: "100%", borderRadius: 12, marginTop: 12 }}
        />
      ) : (
        <div style={{
          width: "100%", aspectRatio: "16/9", background: "#f3f4f6",
          borderRadius: 12, display: "grid", placeItems: "center", color: "#9ca3af", marginTop: 12
        }}>
          Tidak ada foto
        </div>
      )}

      <h1 style={{ fontSize: 28, fontWeight: 800, marginTop: 16 }}>{listing.title}</h1>
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

      {listing.whatsapp && (
        <a
          href={`https://wa.me/${String(listing.whatsapp).replace(/[^0-9]/g, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: "inline-block", marginTop: 18, padding: "10px 14px", border: "1px solid #10b981", borderRadius: 10 }}
        >
          Chat via WhatsApp
        </a>
      )}
    </main>
  );
}
