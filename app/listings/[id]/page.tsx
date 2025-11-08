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

export default async function ListingDetail({ params }: { params: { id: string } }) {
  // 1) Ambil data listing
  const { data: listing } = await supabase
    .from("listings")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!listing) {
    return (
      <main style={{ maxWidth: 960, margin: "40px auto", padding: "0 16px" }}>
        <h1>Listing tidak ditemukan</h1>
        <p><Link href="/listings">← Kembali</Link></p>
      </main>
    );
  }

  // 2) FOTO dari bucket mana pun
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

  // 3) VIDEO – lebih robust: cek folder <id>/ dan root, lalu fallback signed URL
  const videoBuckets = ["listing-videos", "Listing_videos", "listing_videos"];
  const videoUrls: string[] = [];
  const isVideo = (name: string) => {
    const ext = name.split(".").pop()?.toLowerCase() || "";
    return ["mp4", "webm", "mov", "m4v"].includes(ext);
  };

  for (const bucket of videoBuckets) {
    // a) di dalam folder <id>/
    const { data: inFolder } = await supabase.storage.from(bucket).list(params.id, { limit: 50 });
    const candidatesA = (inFolder || []).filter(f => isVideo(f.name)).map(f => `${params.id}/${f.name}`);

    // b) jika kosong, coba root (kadang ter-upload tanpa folder)
    const { data: inRoot } = await supabase.storage.from(bucket).list("", { limit: 200 });
    const candidatesB = (inRoot || [])
      .filter(f => isVideo(f.name))
      // izinkan file yang diawali id_ atau mengandung id sebagai folder lain
      .filter(f => f.name.toLowerCase().includes(params.id.toLowerCase()))
      .map(f => f.name);

    const paths = [...candidatesA, ...candidatesB];

    for (const path of paths) {
      // coba public url dulu
      const pub = supabase.storage.from(bucket).getPublicUrl(path).data?.publicUrl;
      if (pub) {
        videoUrls.push(pub);
        continue;
      }
      // fallback: signed url 7 hari (butuh policy SELECT: createsignedurl)
      const signed = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 7);
      if (signed.data?.signedUrl) videoUrls.push(signed.data.signedUrl);
    }
    if (videoUrls.length) break;
  }

  // 4) Susun media: VIDEO dulu, baru FOTO
  const media: MediaItem[] = [
    ...videoUrls.map((url) => ({ type: "video" as const, url })),
    ...imageUrls.map((url) => ({ type: "image" as const, url })),
  ];

  // 5) Util tampilan & WA
  const rp = (n: any) =>
    typeof n === "number"
      ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n)
      : "—";

  const phoneRaw = (listing as any).whatsapp || (listing as any).contact_whatsapp || null;
  const wa = normalizeWa(phoneRaw);

  // 6) Render
  return (
    <main style={{ maxWidth: 1100, margin: "40px auto", padding: "0 16px" }}>
      <p><Link href="/listings">← Kembali ke Listings</Link></p>

      <MediaViewer media={media} title={listing.title || "Unit"} />

      <h3 style={{ fontSize: 16, fontWeight: 700, marginTop: 12 }}>Foto &amp; Video Unit</h3>

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
    </main>
  );
}
