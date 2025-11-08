// app/listings/page.tsx
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

/** Ambil 1 foto pertama (jika ada) untuk sebuah listingId dari bucket `listing-images` */
async function getFirstImagePublicUrl(listingId: string) {
  // List file di folder {listingId} dalam bucket listing-images
  const { data: files, error } = await supabase.storage
    .from("listing-images")
    .list(listingId, {
      limit: 1,
      sortBy: { column: "name", order: "asc" },
    });

  if (error || !files || files.length === 0) return null;

  const path = `${listingId}/${files[0].name}`;
  const { data: pub } = supabase.storage.from("listing-images").getPublicUrl(path);
  return pub?.publicUrl ?? null;
}

type ListingRow = {
  id: string;
  title: string | null;
  brand: string | null;
  year: number | null;
  location: string | null;
  price: number | null;
};

export default async function ListingsPage() {
  // Ambil daftar listing
  const { data: listings, error } = await supabase
    .from("listings")
    .select("id,title,brand,year,location,price")
    .order("created_at", { ascending: false })
    .limit(24);

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Listing Terbaru</h1>
        <p>Gagal memuat data: {error.message}</p>
      </div>
    );
  }

  const withThumbs = await Promise.all(
    (listings ?? []).map(async (l: ListingRow) => {
      const thumb = await getFirstImagePublicUrl(l.id);
      return { ...l, thumb };
    })
  );

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 16 }}>Listing Terbaru</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))",
          gap: 16,
        }}
      >
        {withThumbs.map((l) => (
          <Link
            key={l.id}
            href={`/listings/${l.id}`}
            style={{
              textDecoration: "none",
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              background: "#fff",
            }}
          >
            <div
              style={{
                width: "100%",
                aspectRatio: "4/3",
                borderRadius: 10,
                overflow: "hidden",
                background: "#f3f4f6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {l.thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={l.thumb}
                  alt={l.title ?? "Foto unit"}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <span style={{ color: "#9ca3af", fontSize: 14 }}>Tidak ada foto</span>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <strong style={{ fontSize: 18, color: "#111827" }}>
                {l.title ?? "Tanpa judul"}
              </strong>
              <span style={{ fontSize: 12, color: "#6b7280" }}>
                {(l.brand ?? "").toUpperCase()} • {l.year ?? "-"} • {l.location ?? "-"}
              </span>
              {typeof l.price === "number" && (
                <span style={{ fontWeight: 800 }}>
                  Rp {l.price.toLocaleString("id-ID")}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
