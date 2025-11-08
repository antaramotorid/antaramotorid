// app/listings/page.tsx
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

type Listing = {
  id: string;
  title: string | null;
  brand: string | null;
  year: number | null;
  price: number | null;
  location: string | null;
  created_at?: string | null;
};

const CANDIDATE_IMAGE_BUCKETS = ["Listing_image", "listing-images", "listing_images"];

async function getCoverUrl(id: string): Promise<string | null> {
  for (const bucket of CANDIDATE_IMAGE_BUCKETS) {
    const { data: files, error } = await supabase.storage
      .from(bucket)
      .list(id, { limit: 1, sortBy: { column: "name", order: "asc" } });

    if (error || !files?.length) continue;

    const file = files[0];
    const { data } = supabase.storage.from(bucket).getPublicUrl(`${id}/${file.name}`);
    if (data?.publicUrl) return data.publicUrl;
  }
  return null;
}

function rp(n: number | null): string {
  if (typeof n !== "number") return "—";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

export default async function ListingsPage() {
  // Ambil semua listing terbaru
  const { data: rows } = await supabase
    .from("listings")
    .select("*")
    .order("created_at", { ascending: false });

  const listings: Listing[] = (rows ?? []) as any[];

  // Ambil URL sampul tiap listing
  const cards = await Promise.all(
    listings.map(async (l) => ({
      ...l,
      cover: await getCoverUrl(l.id),
    }))
  );

  return (
    <main style={{ maxWidth: 1100, margin: "40px auto", padding: "0 16px" }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 16 }}>Listing Terbaru</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 16,
        }}
      >
        {cards.map((l) => (
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
              background: "#fff",
            }}
          >
            {l.cover ? (
              <img
                src={l.cover}
                alt={l.title ?? "foto unit"}
                style={{ width: "100%", height: 180, objectFit: "cover" }}
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
                  fontSize: 14,
                }}
              >
                Tidak ada foto
              </div>
            )}

            <div style={{ padding: 12 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#2563eb" }}>
                {l.title ?? "Unit"}
              </h3>
              <p style={{ margin: "4px 0", color: "#6b7280" }}>
                {(l.brand || "—").toLowerCase()} • {l.year ?? "—"}
              </p>
              <p style={{ margin: "6px 0", fontWeight: 800 }}>{rp(l.price ?? null)}</p>
              {l.location && (
                <p style={{ margin: 0, color: "#9CA3AF", fontSize: 13 }}>{l.location}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
