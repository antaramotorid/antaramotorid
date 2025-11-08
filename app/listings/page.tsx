// app/listings/page.tsx
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Kandidat bucket foto yang pernah kita pakai
const IMAGE_BUCKETS = ["Listing_image", "listing-images", "listing_images"];
// Bucket video yang disepakati
const VIDEO_BUCKET = "listing-videos";

/** Ambil 1 foto pertama untuk listingId dari bucket yang tersedia */
async function getFirstImageFromBuckets(listingId: string): Promise<string | null> {
  for (const bucket of IMAGE_BUCKETS) {
    const { data: files, error } = await supabase.storage
      .from(bucket)
      .list(listingId, { limit: 50, sortBy: { column: "name", order: "asc" } });

    if (error || !files || files.length === 0) continue;

    const first =
      files.find((f) => /\.(jpg|jpeg|png|webp|gif)$/i.test(f.name)) ?? files[0];

    const { data } = supabase.storage.from(bucket).getPublicUrl(`${listingId}/${first.name}`);
    if (data?.publicUrl) return data.publicUrl;
  }
  return null;
}

/** Fallback: ambil 1 path dari tabel listing_images lalu jadikan public URL */
async function getFirstImageFromTable(listingId: string): Promise<string | null> {
  const { data: rows } = await supabase
    .from("listing_images")
    .select("file_path")
    .eq("listing_id", listingId)
    .limit(1);

  const row = rows?.[0];
  if (!row?.file_path) return null;

  // file_path contoh: "Listing_image/07c9.../nama.jpg"
  const path = String(row.file_path);
  const slash = path.indexOf("/");
  if (slash === -1) return null;

  const bucket = path.slice(0, slash);
  const objectPath = path.slice(slash + 1);

  const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);
  return data?.publicUrl ?? null;
}

/** Jika tidak ada foto, coba ambil 1 video agar kartu tetap punya pratinjau */
async function getFirstVideoUrl(listingId: string): Promise<string | null> {
  const { data: files, error } = await supabase.storage
    .from(VIDEO_BUCKET)
    .list(listingId, { limit: 50, sortBy: { column: "name", order: "asc" } });
  if (error || !files || files.length === 0) return null;

  const first =
    files.find((f) => /\.(mp4|webm|mov|m4v)$/i.test(f.name)) ?? files[0];

  const { data } = supabase.storage
    .from(VIDEO_BUCKET)
    .getPublicUrl(`${listingId}/${first.name}`);
  return data?.publicUrl ?? null;
}

/** Wrapper: coba foto dari bucket → tabel; kalau tidak ada, pakai video */
async function getPreviewUrl(listingId: string): Promise<{ type: "image" | "video"; url: string } | null> {
  const img =
    (await getFirstImageFromBuckets(listingId)) ??
    (await getFirstImageFromTable(listingId));
  if (img) return { type: "image", url: img };

  const vid = await getFirstVideoUrl(listingId);
  if (vid) return { type: "video", url: vid };

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

  // Ambil preview (foto lebih dulu, jika kosong pakai video)
  const previews = await Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      preview: await getPreviewUrl(row.id),
    }))
  );
  const previewMap = new Map(previews.map((p) => [p.id, p.preview]));

  const toIDR = (n: number | null) =>
    typeof n === "number"
      ? new Intl.NumberFormat("id-ID", {
          style: "currency",
          currency: "IDR",
          maximumFractionDigits: 0,
        }).format(n)
      : "—";

  return (
    <main style={{ maxWidth: 1100, margin: "40px auto", padding: "0 16px" }}>
      <h1 style={{ fontWeight: 700, fontSize: 24, marginBottom: 16 }}>
        Listing Terbaru
      </h1>

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
          const pv = previewMap.get(l.id) || null;
          return (
            <li
              key={l.id}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                overflow: "hidden",
                background: "#fff",
              }}
            >
              <Link
                href={`/listings/${l.id}`}
                style={{ display: "block", textDecoration: "none", color: "inherit" }}
              >
                {/* Thumbnail: foto prioritas, jika tidak ada tampilkan video muted */}
                {pv ? (
                  pv.type === "image" ? (
                    <img
                      src={pv.url}
                      alt={l.title ?? "foto unit"}
                      style={{ width: "100%", height: 150, objectFit: "cover", display: "block" }}
                      loading="lazy"
                    />
                  ) : (
                    <video
                      src={pv.url}
                      muted
                      playsInline
                      preload="metadata"
                      style={{ width: "100%", height: 150, objectFit: "cover", display: "block", background: "#000" }}
                    />
                  )
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
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 14,
                      lineHeight: "18px",
                      marginBottom: 6,
                    }}
                  >
                    {l.title ?? "Unit"}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    {(l.brand ?? "—")} • {(l.year ?? "—")}
                    {l.location ? ` • ${l.location}` : ""}
                  </div>
                  <div style={{ marginTop: 6, fontWeight: 800 }}>
                    {toIDR(l.price)}
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
