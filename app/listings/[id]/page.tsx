// app/listings/[id]/page.tsx
import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";
import MediaCarousel from "../../components/MediaCarousel";

function normalizeWa(n: any): string | null {
  if (!n) return null;
  const digits = String(n).replace(/[^0-9]/g, "");
  if (!digits) return null;
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  if (digits.startsWith("62")) return digits;
  return digits;
}

export default async function ListingDetail({ params }: { params: { id: string } }) {
  const { data: listing } = await supabase
    .from("listings")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!listing) {
    return (
      <main style={{ maxWidth: 960, margin: "40px auto" }}>
        <h1>Listing tidak ditemukan</h1>
        <p><Link href="/listings">← Kembali</Link></p>
      </main>
    );
  }

  // Gambar dari bucket foto
  const imageBuckets = ["Listing_image", "listing-images", "listing_images"];
  const imageUrls: string[] = [];
  for (const bucket of imageBuckets) {
    const { data: files } = await supabase.storage.from(bucket).list(params.id, { limit: 50 });
    if (!files?.length) continue;
    for (const f of files) {
      const { data } = supabase.storage.from(bucket).getPublicUrl(`${params.id}/${f.name}`);
      if (data?.publicUrl) imageUrls.push(data.publicUrl);
    }
    if (imageUrls.length) break;
  }

  // Video HANYA dari bucket publik listing-videos
  const videoUrls: string[] = [];
  {
    const bucket = "listing-videos";
    const { data: files } = await supabase.storage.from(bucket).list(params.id, { limit: 20 });
    if (files?.length) {
      for (const f of files) {
        const { data } = supabase.storage.from(bucket).getPublicUrl(`${params.id}/${f.name}`);
        if (data?.publicUrl) videoUrls.push(data.publicUrl);
      }
    }
  }

  const rp = (n: any) =>
    typeof n === "number"
      ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n)
      : "—";

  const phoneRaw = (listing as any).whatsapp || (listing as any).contact_whatsapp || null;
  const wa = normalizeWa(phoneRaw);

  const mapEmbed = listing.location
    ? `https://www.google.com/maps?q=${encodeURIComponent(listing.location)}&output=embed`
    : null;

  const carouselPhotos = imageUrls.slice(0, 6); // batasi 6 foto

  return (
    <main style={{ maxWidth: 1100, margin: "40px auto", padding: "0 16px" }}>
      <p><Link href="/listings">← Kembali ke Listings</Link></p>

      {/* === MEDIA CAROUSEL: slide 1 video (jika ada), lalu foto-foto === */}
      {(videoUrls.length > 0 || carouselPhotos.length > 0) ? (
        <MediaCarousel videoUrls={videoUrls} images={carouselPhotos} />
      ) : (
        <div style={{ width: "100%", aspectRatio: "16/9", background: "#f3f4f6", borderRadius: 12, display: "grid", placeItems: "center", color: "#9ca3af", marginTop: 12 }}>
          Tidak ada media
        </div>
      )}

      {/* Foto Unit (grid semua foto, opsional untuk zoom cepat) */}
      {imageUrls.length > 0 && (
        <section style={{ marginTop: 12 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: "4px 0 8px" }}>Foto Unit</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))", gap: 10 }}>
            {imageUrls.map((url, i) => (
              <a key={`thumb-${i}`} href={url} target="_blank" rel="noopener noreferrer" title="Klik untuk zoom">
                <img
                  src={url}
                  alt={`thumb-${i + 1}`}
                  style={{ width: "100%", height: 100, objectFit: "cover", borderRadius: 8 }}
                />
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Jika punya >1 video, tampilkan sebagai thumbnail video terpisah (opsional) */}
      {videoUrls.length > 1 && (
        <section style={{ marginTop: 18 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 8px" }}>Thumbnail Video</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 10 }}>
            {videoUrls.slice(1).map((v, idx) => (
              <video
                key={`vthumb-${idx}`}
                src={v}
                muted
                controls
                style={{ width: "100%", borderRadius: 8, background: "#000", height: 120, objectFit: "cover" }}
              />
            ))}
          </div>
        </section>
      )}

      {/* Info utama */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 18, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>{listing.title}</h1>
        {wa && (
          <a
            href={`https://wa.me/${wa}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ padding: "10px 14px", border: "1px solid #10b981", borderRadius: 10 }}
          >
            Chat via WhatsApp
          </a>
        )}
      </div>

      <p style={{ color: "#6b7280", marginTop: 6 }}>
        {listing.brand || "—"} • {listing.year ?? "—"} {listing.location ? `• ${listing.location}` : ""}
      </p>
      <p style={{ fontSize: 22, fontWeight: 800, marginTop: 10 }}>{rp(listing.price)}</p>

      {listing.description && (
        <>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginTop: 18 }}>Deskripsi</h3>
          <p style={{ whiteSpace: "pre-wrap" }}>{listing.description}</p>
        </>
      )}

      {mapEmbed && (
        <section style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Lokasi Penjual</h3>
          <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #e5e7eb" }}>
            <iframe
              src={mapEmbed}
              loading="lazy"
              style={{ width: "100%", height: 360, border: "0" }}
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </section>
      )}
    </main>
  );
}
