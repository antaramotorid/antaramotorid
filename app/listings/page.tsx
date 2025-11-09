// app/listings/page.tsx
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

/** Ambil 1 foto pertama untuk sebuah listingId dari bucket yang tersedia */
async function getFirstImageUrl(listingId: string): Promise<string | null> {
  const buckets = ["listing-images", "listing_image", "listing_images"];
  for (const bucket of buckets) {
    const { data: files, error } = await supabase.storage.from(bucket).list(listingId, { limit: 50 });
    if (error || !files?.length) continue;

    // cari file gambar
    const img = files.find((f) =>
      /\.(png|jpe?g|webp|gif|bmp)$/i.test(f.name)
    );
    if (!img) continue;

    const path = `${listingId}/${img.name}`;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    if (data?.publicUrl) return data.publicUrl;
  }
  return null;
}

function rp(n: any) {
  if (typeof n !== "number") return "—";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

export default async function ListingsPage() {
  // Ambil list terbaru
  const { data: listings } = await supabase
    .from("listings")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(24);

  // Ambil thumbnail paralel
  const thumbs = await Promise.all(
    (listings ?? []).map((l) => getFirstImageUrl(l.id))
  );

  return (
    <main style={{ maxWidth: 1100, margin: "40px auto", padding: "0 16px" }}>
      <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 18 }}>Listing Terbaru</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: 18,
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
                borderRadius: 16,
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
                  borderRadius: 12,
                  overflow: "hidden",
                  background: "#f3f4f6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={img}
                    alt={l.title ?? "Unit"}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <span style={{ color: "#9ca3af" }}>Tidak ada foto</span>
                )}
              </div>

              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 20, fontWeight: 800, textTransform: "uppercase" }}>
                  {l.title ?? "Unit"}
                </div>
                <div style={{ color: "#6b7280", marginTop: 2, textTransform: "uppercase", fontSize: 12, letterSpacing: 0.3 }}>
                  {(l.brand || "") + (l.year ? ` • ${l.year}` : "") + (l.location ? ` • ${l.location}` : "")}
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, marginTop: 8 }}>{rp(l.price)}</div>

                {/* Tambahan: Warna • Tipe • KM */}
                <div style={{ marginTop: 6, fontSize: 13, color: "#374151" }}>
                  <span><b>Warna:</b> {l.color || "—"}</span>
                  {" • "}
                  <span><b>Tipe:</b> {l.unit_type || "—"}</span>
                  {" • "}
                  <span>
                    <b>KM:</b>{" "}
                    {typeof l.mileage_km === "number"
                      ? l.mileage_km.toLocaleString("id-ID")
                      : "—"}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
