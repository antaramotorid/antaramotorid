// app/listings/page.tsx
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

/** Ambil 1 foto pertama untuk sebuah listingId dari bucket yang tersedia */
async function getFirstImageUrl(listingId: string): Promise<string | null> {
  // PRIORITAS BARU: listing-images (hyphen)
  const candidateBuckets = ["listing-images", "Listing_image", "listing_images"];

  for (const bucket of candidateBuckets) {
    const { data: files, error } = await supabase.storage
      .from(bucket)
      .list(listingId, { limit: 50 });

    if (error) continue;
    if (!files?.length) continue;

    // cari file gambar duluan
    const firstImage =
      files.find((f) => /\.(jpg|jpeg|png|webp)$/i.test(f.name)) ?? files[0];

    if (firstImage) {
      const { data } = supabase.storage
        .from(bucket)
        .getPublicUrl(`${listingId}/${firstImage.name}`);
      if (data?.publicUrl) return data.publicUrl;
    }
  }
  return null;
}

const rp = (n: any) =>
  typeof n === "number"
    ? new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(n)
    : "—";

export default async function ListingsPage() {
  const { data: listings } = await supabase
    .from("listings")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(24);

  return (
    <main style={{ maxWidth: 1100, margin: "40px auto", padding: "0 16px" }}>
      <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 16 }}>
        Listing Terbaru
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 16,
        }}
      >
        {(listings ?? []).map(async (item) => {
          const img = await getFirstImageUrl(item.id);
          return (
            <Link
              key={item.id}
              href={`/listings/${item.id}`}
              style={{
                display: "block",
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 12,
                textDecoration: "none",
                color: "inherit",
                background: "white",
              }}
            >
              <div
                style={{
                  width: "100%",
                  aspectRatio: "4/3",
                  borderRadius: 10,
                  overflow: "hidden",
                  background: "#f3f4f6",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={img}
                    alt={item.title ?? "foto"}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <span style={{ color: "#9ca3af" }}>Tidak ada foto</span>
                )}
              </div>

              <h3 style={{ fontSize: 18, fontWeight: 800, margin: "10px 0 4px" }}>
                {item.title ?? "tanpa judul"}
              </h3>
              <p style={{ color: "#6b7280", margin: 0 }}>
                {(item.brand || "—").toUpperCase()} • {item.year ?? "—"}
                {item.location ? ` • ${item.location}` : ""}
              </p>
              <p style={{ fontWeight: 800, marginTop: 6 }}>{rp(item.price)}</p>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
