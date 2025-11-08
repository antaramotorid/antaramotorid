// app/listings/page.tsx
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

// Paksa render dinamis (tanpa cache) agar foto baru langsung muncul
export const dynamic = "force-dynamic";

/** Ambil 1 foto pertama untuk listingId dari bucket yang tersedia */
async function getFirstPhotoUrl(listingId: string): Promise<string | null> {
  const buckets = ["listing-images", "Listing_image", "listing_images"];
  for (const b of buckets) {
    const { data: files, error } = await supabase.storage.from(b).list(listingId, {
      limit: 10,
      sortBy: { column: "name", order: "asc" },
    });
    if (error || !files || files.length === 0) continue;

    const file = files.find((f) => !f.name.startsWith("."));
    if (!file) continue;

    const { data } = supabase.storage.from(b).getPublicUrl(`${listingId}/${file.name}`);
    if (data?.publicUrl) return data.publicUrl;
  }

  // fallback: kalau ada tabel listing_images berisi file_path
  const { data: imgRow } = await supabase
    .from("listing_images")
    .select("file_path")
    .eq("listing_id", listingId)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (imgRow?.file_path) {
    // coba semua bucket untuk path ini
    const candidates = [
      `listing-images/${imgRow.file_path}`,
      `Listing_image/${imgRow.file_path}`,
      `listing_images/${imgRow.file_path}`,
    ];
    for (const full of candidates) {
      const [bucket, ...rest] = full.split("/");
      const pathInBucket = rest.join("/");
      const { data } = supabase.storage.from(bucket).getPublicUrl(pathInBucket);
      if (data?.publicUrl) return data.publicUrl;
    }
  }

  return null;
}

export default async function ListingsPage() {
  const { data: listings } = await supabase
    .from("listings")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(24);

  return (
    <main style={{ maxWidth: 1100, margin: "40px auto", padding: "0 16px" }}>
      <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 20 }}>Listing Terbaru</h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {(listings ?? []).map(async (item) => {
          const photo = await getFirstPhotoUrl(item.id);
          return (
            <Link
              key={item.id}
              href={`/listings/${item.id}`}
              style={{ border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden", display: "block" }}
            >
              <div style={{ width: "100%", aspectRatio: "16/9", background: "#f3f4f6" }}>
                {photo ? (
                  <img
                    src={photo}
                    alt={item.title || "foto unit"}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", color: "#9ca3af" }}>
                    tanpa foto
                  </div>
                )}
              </div>
              <div style={{ padding: 12 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#1f2937" }}>
                  {item.title || "—"}
                </h3>
                <p style={{ margin: "6px 0 0", color: "#6b7280" }}>
                  {(item.brand || "—").toLowerCase()} • {item.year ?? "—"}
                  {item.location ? ` • ${item.location}` : ""}
                </p>
                <p style={{ margin: "8px 0 0", fontWeight: 800 }}>
                  {typeof item.price === "number"
                    ? new Intl.NumberFormat("id-ID", {
                        style: "currency",
                        currency: "IDR",
                        maximumFractionDigits: 0,
                      }).format(item.price)
                    : "—"}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
