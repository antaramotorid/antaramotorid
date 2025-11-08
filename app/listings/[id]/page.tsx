// app/listings/[id]/page.tsx
import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";
import MediaViewer, { MediaItem } from "./MediaViewer";

function normalizeWa(n: any): string | null {
  if (!n) return null;
  const digits = String(n).replace(/[^0-9]/g, "");
  if (!digits) return null;
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  if (digits.startsWith("62")) return digits;
  return digits;
}

export default async function ListingDetail({
  params,
}: {
  params: { id: string };
}) {
  // 1) data listing
  const { data: listing } = await supabase
    .from("listings")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!listing) {
    return (
      <main style={{ maxWidth: 960, margin: "40px auto" }}>
        <h1>Listing tidak ditemukan</h1>
        <p>
          <Link href="/listings">← Kembali</Link>
        </p>
      </main>
    );
  }

  // 2) Kumpulkan VIDEO dari bucket `listing-videos/<id>/...`
  const videoUrls: string[] = [];
  {
    const { data: files } = await supabase.storage
      .from("listing-videos")
      .list(params.id, { limit: 20, sortBy: { column: "name", order: "asc" } });

    for (const f of files ?? []) {
      const { data } = supabase
        .from("storage.objects")
        .select("*")
        .limit(0) as any; // no-op to keep TS happy on type-only import
      const { data: pub } = supabase.storage
        .from("listing-videos")
        .getPublicUrl(`${params.id}/${f.name}`);
      if (pub?.publicUrl) videoUrls.push(pub.publicUrl);
    }
  }

  // 3) Kumpulkan FOTO dari bucket `Listing_image/<id>/...`
  const imageUrls: string[] = [];
  {
    const { data: files } = await supabase.storage
      .from("Listing_image")
      .list(params.id, { limit: 50, sortBy: { column: "name", order: "asc" } });

    for (const f of files ?? []) {
      const { data: pub } = supabase.storage
        .from("Listing_image")
        .getPublicUrl(`${params.id}/${f.name}`);
      if (pub?.publicUrl) imageUrls.push(pub.publicUrl);
    }
  }

  // 4) Gabungkan untuk MediaViewer (video dulu, lalu foto)
  const media: MediaItem[] = [
    ...videoUrls.map((url) => ({ kind: "video" as const, url })),
    ...imageUrls.map((url) => ({ kind: "image" as const, url })),
  ];

  const rp = (n: any) =>
    typeof n === "number"
      ? new Intl.NumberFormat("id-ID", {
          style: "currency",
          currency: "IDR",
          maximumFractionDigits: 0,
        }).format(n)
      : "—";

  const phoneRaw =
    (listing as any).whatsapp || (listing as any).contact_whatsapp || null;
  const wa = normalizeWa(phoneRaw);

  // 5) lokasi peta (opsional)
  const mapsQuery =
    listing?.location && typeof listing.location === "string"
      ? listing.location
      : "";

  return (
    <main style={{ maxWidth: 1100, margin: "40px auto", padding: "0 16px" }}>
      <p>
        <Link href="/listings">← Kembali ke Listings</Link>
      </p>

      {/* Slider foto & video */}
      <MediaViewer media={media} title={listing.title || "Unit"} />

      {/* Judul + WA */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginTop: 18,
          flexWrap: "wrap",
        }}
      >
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>
          {listing.title}
        </h1>
        {wa && (
          <a
            href={`https://wa.me/${wa}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: "10px 14px",
              border: "1px solid #10b981",
              borderRadius: 10,
            }}
          >
            Chat via WhatsApp
          </a>
        )}
      </div>

      <p style={{ color: "#6b7280", marginTop: 6 }}>
        {listing.brand || "—"} • {listing.year ?? "—"}
        {listing.location ? ` • ${listing.location}` : ""}
      </p>
      <p style={{ fontSize: 22, fontWeight: 800, marginTop: 10 }}>
        {rp(listing.price)}
      </p>

      {listing.description && (
        <>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginTop: 18 }}>
            Deskripsi
          </h3>
          <p style={{ whiteSpace: "pre-wrap" }}>{listing.description}</p>
        </>
      )}

      {/* Peta lokasi (jika ada) */}
      {mapsQuery && (
        <>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginTop: 18 }}>
            Lokasi Penjual
          </h3>
          <iframe
            title="map"
            style={{
              width: "100%",
              height: 280,
              border: 0,
              borderRadius: 12,
              marginTop: 8,
            }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src={`https://www.google.com/maps?q=${encodeURIComponent(
              mapsQuery
            )}&output=embed`}
          />
        </>
      )}
    </main>
  );
}
