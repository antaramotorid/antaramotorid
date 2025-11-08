// app/listings/page.tsx
import Link from "next/link";
import { noStore } from "next/cache";
import { supabase } from "../../lib/supabaseClient";

/** Cari 1 foto pertama untuk sebuah listingId dari bucket yang tersedia */
async function findFirstImageUrl(listingId: string): Promise<string | null> {
  const buckets = ["Listing_image", "listing-images", "listing_images"];
  for (const bucket of buckets) {
    const { data: files, error } = await supabase.storage
      .from(bucket)
      .list(listingId, { limit: 1, sortBy: { column: "name", order: "asc" } });
    if (error) continue;
    if (files && files.length > 0) {
      const path = `${listingId}/${files[0].name}`;
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      if (data?.publicUrl) return data.publicUrl;
    }
  }
  return null;
}

function rp(n: any) {
  return typeof n === "number"
    ? new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(n)
    : "—";
}

export const revalidate = 0; // pastikan tidak di-prerender/cached
export default async function ListingsPage() {
  noStore(); // matikan cache di level runtime

  // Ambil daftar listing terbaru
  const { data: listings } = await supabase
    .from("listings")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(24);

  return (
    <main style={{ maxWidth: 1100, margin: "40px auto", padding: "0 16px" }}>
      <h1 style={{ fontSize: 34, fontWeight: 800, marginBottom: 18 }}>
        Listing Terbaru
      </h1>

      {!listings?.length && (
        <p style={{ color: "#6b7280" }}>Belum ada listing.</p>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: 16,
        }}
      >
        {await Promise.all(
          (listings || []).map(async (item: any) => {
            const cover = await findFirstImageUrl(item.id);
            return (
              <Link
                key={item.id}
                href={`/listings/${item.id}`}
                style={{
                  display: "block",
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  overflow: "hidden",
                  textDecoration: "none",
                  color: "inherit",
                  background: "#fff",
                }}
              >
                {/* Gambar cover */}
                {cover ? (
                  <img
                    src={cover}
                    alt={item.title || "foto unit"}
                    style={{
                      width: "100%",
                      height: 180,
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: 180,
                      background: "#f3f4f6",
                      display: "grid",
                      placeItems: "center",
                      color: "#9ca3af",
                    }}
                  >
                    tanpa foto
                  </div>
                )}

                {/* Info singkat */}
                <div style={{ padding: 12 }}>
                  <h3
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      margin: "0 0 6px 0",
                      color: "#2563eb",
                    }}
                  >
                    {item.title || "Unit tanpa judul"}
                  </h3>
                  <p style={{ margin: 0, color: "#6b7280" }}>
                    {(item.brand || "—").toLowerCase()} • {item.year ?? "—"}
                    {item.location ? ` • ${item.location.toLowerCase()}` : ""}
                  </p>
                  <p
                    style={{
                      margin: "8px 0 0 0",
                      fontWeight: 800,
                      fontSize: 18,
                      color: "#111827",
                    }}
                  >
                    {rp(item.price)}
                  </p>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </main>
  );
}
