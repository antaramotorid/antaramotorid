// app/listings/[id]/page.tsx
import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";

function normalizeWa(n: any): string | null {
  if (!n) return null;
  const digits = String(n).replace(/[^0-9]/g, "");
  if (!digits) return null;
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  if (digits.startsWith("62")) return digits;
  return digits;
}

export default async function ListingDetail({ params }: { params: { id: string } }) {
  // 1) Ambil data listing
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

  // 2) Gambar (baca dari bucket foto)
  const imageBuckets = ["Listing_image", "listing-images", "listing_images"];
  const imageUrls: string[] = [];
  for (const bucket of imageBuckets) {
    const { data: files, error } = await supabase.storage.from(bucket).list(params.id, { limit: 50 });
    if (error) continue;
    if (!files?.length) continue;
    for (const f of files) {
      const { data } = supabase.storage.from(bucket).getPublicUrl(`${params.id}/${f.name}`);
      if (data?.publicUrl) imageUrls.push(data.publicUrl);
    }
    if (imageUrls.length) break;
  }

  // 3) Video (HANYA dari bucket publik listing-videos)
  const videoBuckets = ["listing-videos"]; // fokus 1 bucket publik
  const videoUrls: string[] = [];
  for (const bucket of videoBuckets) {
    const { data: files, error } = await supabase.storage.from(bucket).list(params.id, { limit: 20 });
    if (error) continue;
    if (!files?.length) continue;
    for (const f of files) {
      const { data } = supabase.storage.from(bucket).getPublicUrl(`${params.id}/${f.name}`);
      if (data?.publicUrl) videoUrls.push(data.publicUrl);
    }
    if (videoUrls.length) break;
  }

  // 4) Util & WA
  const rp = (n: any) =>
    typeof n === "number"
      ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n)
      : "—";

  const phoneRaw = (listing as any).whatsapp || (listing as any).contact_whatsapp || null;
  const wa = normalizeWa(phoneRaw);

  // 5) URL Maps embed dari lokasi (kalau ada)
  const mapEmbed =
    listing.location
      ? `https://www.google.com/maps?q=${encodeURIComponent(listing.location)}&output=embed`
      : null;

  const carouselPhotos = imageUrls.slice(0, 6); // batasi 6 foto seperti OLX

  return (
    <main style={{ maxWidth: 1100, margin: "40px auto", padding: "0 16px" }}>
      <p><Link href="/listings">← Kembali ke Listings</Link></p>

      {/* ====== VIDEO UTAMA (di atas, autoplay mute loop) ====== */}
      {videoUrls.length > 0 && (
        <section style={{ marginTop: 12 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 8px" }}>Video Unit</h3>
          <video
            key={videoUrls[0]}
            src={videoUrls[0]}
            autoPlay
            muted
            loop
            controls
            style={{ width: "100%", borderRadius: 12, background: "#000", maxHeight: 560, objectFit: "cover" }}
          />
        </section>
      )}

      {/* ====== FOTO: Carousel swipe (klik = zoom tab baru) ====== */}
      {carouselPhotos.length > 0 ? (
        <div
          style={{
            overflowX: "auto",
            display: "flex",
            gap: 10,
            scrollSnapType: "x mandatory",
            WebkitOverflowScrolling: "touch",
            borderRadius: 12,
            marginTop: 12,
          }}
        >
          {carouselPhotos.map((url, i) => (
            <a
              key={`img-${i}`}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                flex: "0 0 100%",
                scrollSnapAlign: "center",
                display: "block",
                borderRadius: 12,
                overflow: "hidden",
                background: "#f3f4f6",
              }}
              title="Klik untuk buka ukuran besar"
            >
              <img
                src={url}
                alt={`foto-${i + 1}`}
                style={{ width: "100%", height: 520, objectFit: "cover", display: "block" }}
              />
            </a>
          ))}
        </div>
      ) : (
        <div style={{ width: "100%", aspectRatio: "16/9", background: "#f3f4f6", borderRadius: 12, display: "grid", placeItems: "center", color: "#9ca3af", marginTop: 12 }}>
          Tidak ada foto
        </div>
      )}

      {/* ====== Thumbnail Foto ====== */}
      {imageUrls.length > 0 && (
        <section style={{ marginTop: 12 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: "4px 0 8px" }}>Thumbnail Foto</h3>
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

      {/* ====== Thumbnail Video (jika ada lebih dari 1) ====== */}
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

      {/* ====== Info utama ====== */}
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

      {/* ====== Peta lokasi ====== */}
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
