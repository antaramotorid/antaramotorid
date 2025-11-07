import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";

function norm(p?: string | null) {
  if (!p) return null;
  return p.replace(/^listing_images\//, "").replace(/^listing-images\//, "");
}

export default async function ListingDetail({
  params,
}: { params: { id: string } }) {
  // 1) Listing
  const { data: listing, error } = await supabase
    .from("listings")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !listing) {
    return (
      <div className="max-w-4xl mx-auto py-10">
        <h1 className="text-xl font-bold mb-3">Terjadi kesalahan</h1>
        <p className="mb-6">ID tidak valid: {params.id}</p>
        <Link href="/listings" className="text-blue-600 underline">
          ← Kembali ke Listings
        </Link>
      </div>
    );
  }

  // 2) Coba ambil path dari tabel listing_images
  const { data: imgs } = await supabase
    .from("listing_images")
    .select("file_path, sort_order, created_at")
    .eq("listing_id", params.id)
    .order("sort_order", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: true });

  // 3) Bangun public URL secara robust:
  // - Support bucket "listing_images" (underscore) ATAU "listing-images" (dash)
  // - Jika file_path tidak ada/invalid, fallback: list isi folder <id>/ di storage
  const candidatesBuckets = ["listing_images", "listing-images"];
  let imageUrl: string | null = null;

  // 3a. Dari kolom file_path
  if (!imageUrl && imgs && imgs.length > 0) {
    const p = norm(imgs[0].file_path || "");
    for (const bucket of candidatesBuckets) {
      if (p) {
        const { data } = supabase.storage.from(bucket).getPublicUrl(p);
        if (data?.publicUrl) {
          imageUrl = data.publicUrl;
          break;
        }
      }
    }
  }

  // 3b. Fallback: scan folder <id>/ dan ambil file pertama yang ada
  if (!imageUrl) {
    for (const bucket of candidatesBuckets) {
      const { data: listRes, error: listErr } = await supabase.storage
        .from(bucket)
        .list(`${params.id}`, { limit: 1, sortBy: { column: "name", order: "asc" } });

      if (!listErr && listRes && listRes.length > 0) {
        const firstName = listRes[0].name;
        const { data } = supabase
          .storage
          .from(bucket)
          .getPublicUrl(`${params.id}/${firstName}`);
        if (data?.publicUrl) {
          imageUrl = data.publicUrl;
          break;
        }
      }
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      <Link href="/listings" className="text-blue-600 underline">
        ← Kembali ke Listings
      </Link>

      {imageUrl ? (
        <img
          src={imageUrl}
          alt={listing.title}
          className="w-full h-auto rounded-lg mt-6"
        />
      ) : (
        <div className="mt-6 w-full aspect-[16/9] bg-gray-100 rounded-lg grid place-items-center text-gray-500">
          Tidak ada foto
        </div>
      )}

      <h1 className="text-3xl font-extrabold mt-6">{listing.title}</h1>
      <p className="text-gray-700 mt-2">
        {listing.brand} • {listing.year} • {listing.location}
      </p>
      <p className="text-2xl font-bold mt-4">
        Rp {Number(listing.price).toLocaleString("id-ID")}
      </p>

      {listing.description && (
        <p className="mt-6 leading-relaxed">{listing.description}</p>
      )}

      {listing.whatsapp && (
        <a
          href={`https://wa.me/${listing.whatsapp}`}
          target="_blank"
          className="inline-block mt-8 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg"
        >
          Chat via WhatsApp
        </a>
      )}
    </div>
  );
}
