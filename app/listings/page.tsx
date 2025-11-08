// app/listings/page.tsx
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

type Listing = {
  id: string;
  title: string;
  brand: string | null;
  year: number | null;
  location: string | null;
  price: number | null;
};

async function getFirstImageUrl(listingId: string) {
  // Ambil 1 foto pertama dari bucket `Listing_image/<id>/...`
  const { data: files, error } = await supabase.storage
    .from("Listing_image")
    .list(listingId, { limit: 1, sortBy: { column: "name", order: "asc" } });

  if (error || !files || files.length === 0) return null;

  const { data } = supabase.storage
    .from("Listing_image")
    .getPublicUrl(`${listingId}/${files[0].name}`);

  return data?.publicUrl ?? null;
}

export default async function ListingsPage() {
  const { data: listings } = await supabase
    .from("listings")
    .select("*")
    .order("created_at", { ascending: false });

  const items: (Listing & { cover?: string | null })[] = await Promise.all(
    (listings ?? []).map(async (l: any) => {
      const cover = await getFirstImageUrl(l.id);
      return { ...l, cover };
    })
  );

  const rp = (n: any) =>
    typeof n === "number"
      ? new Intl.NumberFormat("id-ID", {
          style: "currency",
          currency: "IDR",
          maximumFractionDigits: 0,
        }).format(n)
      : "—";

  return (
    <main style={{ maxWidth: 1100, margin: "40px auto", padding: "0 16px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 16 }}>
        Listing Terbaru
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))",
          gap: 16,
        }}
      >
        {items.map((l) => (
          <Link
            key={l.id}
            href={`/listings/${l.id}`}
            style={{
              display: "block",
              borderRadius: 12,
              padding: 12,
              border: "1px solid #e5e7eb",
              textDecoration: "none",
              color: "inherit",
              background: "#fff",
            }}
          >
            {/* cover */}
            {l.cover ? (
              <img
                src={l.cover}
                alt={l.title || "foto"}
                style={{
                  width: "100%",
                  height: 160,
                  objectFit: "cover",
                  borderRadius: 10,
                  marginBottom: 10,
                }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: 160,
                  background: "#f3f4f6",
                  borderRadius: 10,
                  marginBottom: 10,
                  display: "grid",
                  placeItems: "center",
                  color: "#9ca3af",
                }}
              >
                Tidak ada foto
              </div>
            )}

            <div style={{ fontSize: 18, fontWeight: 700 }}>{l.title}</div>
            <div style={{ color: "#6b7280", fontSize: 13, marginTop: 2 }}>
              {(l.brand || "—").toUpperCase()} • {l.year ?? "—"}
              {l.location ? ` • ${l.location}` : ""}
            </div>
            <div style={{ fontWeight: 800, marginTop: 6 }}>{rp(l.price)}</div>
          </Link>
        ))}
      </div>
    </main>
  );
}
