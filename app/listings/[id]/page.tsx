// app/listings/[id]/page.tsx
import { supabase } from "../../../lib/supabaseClient";
import MediaViewer, { MediaItem } from "./MediaViewer";

type Listing = {
  id: string;
  title: string | null;
  brand: string | null;
  year: number | null;
  location: string | null;
  price: number | null;
  description: string | null;
  whatsapp: string | null;
};

async function getImageUrls(listingId: string) {
  const { data: files, error } = await supabase.storage
    .from("listing-images")
    .list(listingId, { limit: 20, sortBy: { column: "name", order: "asc" } });

  if (error || !files) return [];
  return files
    .filter((f) => f.name) // basic guard
    .map((f) => {
      const path = `${listingId}/${f.name}`;
      const { data: pub } = supabase.storage.from("listing-images").getPublicUrl(path);
      return pub?.publicUrl;
    })
    .filter(Boolean) as string[];
}

async function getVideoUrls(listingId: string) {
  const { data: files, error } = await supabase.storage
    .from("listing-videos")
    .list(listingId, { limit: 5, sortBy: { column: "name", order: "asc" } });

  if (error || !files) return [];
  return files
    .filter((f) => f.name)
    .map((f) => {
      const path = `${listingId}/${f.name}`;
      const { data: pub } = supabase.storage.from("listing-videos").getPublicUrl(path);
      return pub?.publicUrl;
    })
    .filter(Boolean) as string[];
}

export default async function ListingDetail({
  params,
}: {
  params: { id: string };
}) {
  const id = params.id;

  // Ambil data listing
  const { data: listing, error } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .single<Listing>();

  if (error || !listing) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Listing tidak ditemukan</h1>
        {error && <p>{error.message}</p>}
      </div>
    );
  }

  // Ambil media dari storage (video dulu agar tampil pertama)
  const [videos, images] = await Promise.all([getVideoUrls(id), getImageUrls(id)]);
  const media: MediaItem[] = [
    ...videos.map((url) => ({ type: "video" as const, url })),
    ...images.map((url) => ({ type: "image" as const, url })),
  ];

  return (
    <div style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
      {/* Viewer media */}
      <MediaViewer media={media} title={listing.title ?? "Unit"} />

      {/* Judul + harga + meta */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>
          {listing.title ?? "Tanpa judul"}
        </h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 12, color: "#6b7280" }}>
            {(listing.brand ?? "").toUpperCase()} • {listing.year ?? "-"} •{" "}
            {listing.location ?? "-"}
          </span>
          {typeof listing.price === "number" && (
            <strong style={{ fontSize: 22 }}>
              Rp {listing.price.toLocaleString("id-ID")}
            </strong>
          )}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginTop: 12, marginBottom: 6 }}>
              Deskripsi
            </h3>
            <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>
              {listing.description ?? "-"}
            </p>
          </div>
        </div>

        {/* Thumbnail bar sederhana (opsional, MediaViewer sudah ada thumb) */}
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
            Foto &amp; Video Unit
          </h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {media.length === 0 && (
              <div
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: 10,
                  border: "1px dashed #e5e7eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#9ca3af",
                  fontSize: 12,
                }}
              >
                Tidak ada media
              </div>
            )}
            {media.map((m, i) =>
              m.kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={m.url}
                  alt={`foto-${i + 1}`}
                  style={{
                    width: 88,
                    height: 88,
                    objectFit: "cover",
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                  }}
                />
              ) : (
                <div
                  key={i}
                  style={{
                    width: 88,
                    height: 88,
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    background: "#f9fafb",
                  }}
                  title="Video"
                >
                  🎬
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
