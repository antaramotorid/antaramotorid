// app/listings/page.tsx
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

/** Ambil 1 foto pertama untuk listingId dari bucket yang tersedia.
 *  Coba publicUrl dulu; jika tidak valid, fallback ke signed URL.
 */
async function fetchFirstImageUrl(listingId: string): Promise<string | null> {
  const buckets = ["listing-images", "Listing_image", "listing_images"];
  const exts = new Set(["jpg", "jpeg", "png", "webp"]);

  for (const bucket of buckets) {
    // List isi folder = nama folder harus persis ID listing
    const { data: files, error } = await supabase.storage.from(bucket).list(listingId, {
      limit: 20,
      sortBy: { column: "name", order: "asc" },
    });
    if (error || !files || files.length === 0) continue;

    // Cari file gambar pertama
    const img = files.find((f) => {
      const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
      return exts.has(ext);
    });
    if (!img) continue;

    const path = `${listingId}/${img.name}`;

    // 1) Coba public URL
    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
    if (pub?.publicUrl && pub.publicUrl.startsWith("http")) {
      return pub.publicUrl;
    }

    // 2) Fallback ke signed URL (7 hari)
    const signed = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 7);
    if (signed.data?.signedUrl) return signed.data.signedUrl;
  }

  return null;
}

export default async function ListingsPage() {
  // Ambil daftar listing terbaru
  const { data: listings, error } = await supabase
    .from("listings")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return (
      <main style={{ maxWidth: 1100, margin: "40px auto", padding: "0 16px" }}>
        <h1>Listing Terbaru</h1>
        <p>Gagal memuat listings.</p>
      </main>
    );
  }

  // Ambil thumbnail untuk tiap listing (paralel)
  const thumbs = await Promise.all(
    (listings ?? []).map((row) => fetchFirstImageUrl(row.id))
  );

  return (
    <main style={{ maxWidth: 1100, margin: "40px auto", padding: "0 16px" }}>
      <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 16 }}>Listing Terbaru</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 16,
        }}
      >
        {(listings ?? []).map((l, i) => {
          const img = thumbs[i];
          return (
            <Link
              key={l.id}
              href={`/listings/${l.id}`}
              style={{
                display: "block",
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                overflow: "hidden",
                textDecoration: "none",
                color: "inherit",
                background: "white",
              }}
            >
              <div style={{ width: "100%", aspectRatio: "16/9", background: "#f3f4f6" }}>
                {img ? (
                  // pakai img biasa agar universal (tanpa konfigurasi domain next/image)
                  <img
                    src={img}
                    alt={l.title ?? "foto"}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "grid",
                      placeItems: "center",
                      color: "#9ca3af",
                      fontSize: 14,
                    }}
                  >
                    tanpa foto
                  </div>
                )}
              </div>

              <div style={{ padding: 12 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#2563eb" }}>
                  {l.title ?? "—"}
                </h3>
                <p style={{ margin: "6px 0 0", color: "#6b7280" }}>
                  {(l.brand || "—").toLowerCase()} • {l.year ?? "—"}
                  {l.location ? ` • ${l.location}` : ""}
                </p>
                <p style={{ margin: "8px 0 0", fontWeight: 800 }}>
                  {typeof l.price === "number"
                    ? new Intl.NumberFormat("id-ID", {
                        style: "currency",
                        currency: "IDR",
                        maximumFractionDigits: 0,
                      }).format(l.price)
                    : "Rp -"}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
