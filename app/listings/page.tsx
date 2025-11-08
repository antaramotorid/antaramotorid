// app/listings/page.tsx
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

/** Ambil 1 foto pertama untuk sebuah listingId dari bucket yang tersedia */
async function getFirstImageUrl(listingId: string): Promise<string | null> {
  const buckets = ["listing-images", "Listing_image", "listing_images"]; // prioritas urutan
  for (const bucket of buckets) {
    const listRes = await supabase.storage.from(bucket).list(listingId, {
      limit: 50,
    });
    if (listRes.error || !listRes.data?.length) continue;

    // ambil file bergambar duluan
    const firstImg = listRes.data.find((f) =>
      /\.(png|jpe?g|webp|gif|bmp|heic)$/i.test(f.name)
    );
    const file = firstImg ?? listRes.data[0];
    if (!file) continue;

    const { data } = supabase
      .storage
      .from(bucket)
      .getPublicUrl(`${listingId}/${file.name}`);

    if (data?.publicUrl) return data.publicUrl;
  }
  return null;
}

export default async function ListingsPage() {
  // Ambil daftar listing (urut terbaru)
  const { data: listings } = await supabase
    .from("listings")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <main style={{ maxWidth: 1100, margin: "40px auto", padding: "0 16px" }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 18 }}>
        Listing Terbaru
      </h1>

      {!listings?.length && <p>Belum ada data.</p>}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 18,
        }}
      >
        {await Promise.all(
          (listings ?? []).map(async (l) => {
            const thumb = await getFirstImageUrl(l.id);
            return (
              <Link
                key={l.id}
                href={`/listings/${l.id}`}
                style={{
                  display: "block",
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  padding: 12,
                  textDecoration: "none",
                  color: "inherit",
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
                    marginBottom: 12,
                  }}
                >
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumb}
                      alt={l.title ?? "Foto unit"}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <span style={{ color: "#9ca3af" }}>Tidak ada foto</span>
                  )}
                </div>

                <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 6 }}>
                  {l.title ?? "Tanpa judul"}
                </div>
                <div style={{ color: "#6b7280", fontSize: 12, marginBottom: 6 }}>
                  {(l.brand ?? "").toString().toUpperCase() || "—"} • {l.year ?? "—"}
                  {l.location ? ` • ${l.location}` : ""}
                </div>
                <div style={{ fontWeight: 800 }}>
                  {typeof l.price === "number"
                    ? new Intl.NumberFormat("id-ID", {
                        style: "currency",
                        currency: "IDR",
                        maximumFractionDigits: 0,
                      }).format(l.price)
                    : "Rp —"}
                </div>
              </Link>
            );
          })
        )}
      </div>
    </main>
  );
}
