// app/listings/page.tsx
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

// Kandidat nama bucket gambar yang sudah dipakai di project ini
const IMAGE_BUCKETS = ["Listing_image", "listing-images", "listing_images"];

/** Ambil 1 foto pertama untuk sebuah listingId dari bucket yang tersedia */
async function getFirstImageUrl(listingId: string): Promise<string | null> {
  for (const bucket of IMAGE_BUCKETS) {
    // List isi folder {id}/ di bucket
    const { data: files, error } = await supabase.storage
      .from(bucket)
      .list(listingId, { limit: 50, sortBy: { column: "name", order: "asc" } });

    if (error || !files || files.length === 0) continue;

    // Pilih file gambar pertama yang wajar
    const first = files.find(f =>
      /\.(jpg|jpeg|png|webp|gif)$/i.test(f.name)
    ) ?? files[0];

    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(`${listingId}/${first.name}`);

    if (data?.publicUrl) return data.publicUrl;
  }
  return null;
}

type ListingRow = {
  id: string;
  title: string | null;
  price: number | null;
  brand: string | null;
  year: number | null;
  location: string | null;
};

export default async function ListingsPage() {
  // Ambil data listing terbaru
  const { data: listings } = await supabase
    .from("listings")
    .select("id,title,price,brand,year,location")
    .order("created_at", { ascending: false })
    .limit(24);

  const rows: ListingRow[] = listings ?? [];

  // Ambil thumbnail untuk masing-masing listing (server-side)
  const thumbs = await Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      url: await getFirstImageUrl(row.id),
    }))
  );
  const thumbMap = new Map(thumbs.map(t => [t.id, t.url]));

  const toIDR = (n: number | null) =>
    typeof n === "number"
      ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n)
      : "—";

  return (
    <main style={{ maxWidth: 1100, margin: "40px auto", padding: "0 16px" }}>
      <h1 style={{ fontWeight: 700, fontSize: 24, marginBottom: 16 }}>Listing Terbaru</h1>

      {rows.length === 0 && <p>Tidak ada data.</p>}

      <ul
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          listStyle: "none",
          padding: 0,
          margin: 0,
        }}
      >
        {rows.map((l) => {
          const img = thumbMap.get(l.id) || null;
          return (
            <li key={l.id} style={{ border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
              <Link href={`/listings/${l.id}`} style={{ display: "block", textDecoration: "none", color: "inherit" }}>
                {/* Thumbnail */}
                {img ? (
                  <img
                    src={img}
                    alt={l.title ?? "foto unit"}
                    style={{ width: "100%", height: 150, objectFit: "cover", display: "block" }}
                    loading="lazy"
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: 150,
                      background: "#f3f4f6",
                      display: "grid",
                      placeItems: "center",
                      color: "#9ca3af",
                      fontSize: 12,
                    }}
                  >
                    Tidak ada foto
                  </div>
                )}

                {/* Info */}
                <div style={{ padding: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, lineHeight: "18px", marginBottom: 6 }}>
                    {l.title ?? "Unit"}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    {(l.brand ?? "—")} • {(l.year ?? "—")}{l.location ? ` • ${l.location}` : ""}
                  </div>
                  <div style={{ marginTop: 6, fontWeight: 800 }}>{toIDR(l.price)}</div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
