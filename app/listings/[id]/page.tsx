import { supabase } from '../../../lib/supabaseClient';
import Link from 'next/link';

function toBucketPath(filePath: string) {
  // Jika tersimpan "listing_images/xxx/yyy.jpg" → buang prefix bucket
  return filePath.replace(/^listing_images\//, '').replace(/^listing-images\//, '');
}

export default async function ListingDetail({ params }: { params: { id: string } }) {
  // ambil data listing
  const { data: listing, error } = await supabase
    .from('listings')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !listing) {
    return (
      <div className="max-w-3xl mx-auto py-10">
        <h1 className="text-xl font-bold mb-4">Terjadi kesalahan</h1>
        <p>ID tidak valid: {params.id}</p>
        <Link className="text-blue-600 underline" href="/listings">
          ← Kembali ke Listings
        </Link>
      </div>
    );
  }

  // ambil foto utama
  const { data: images } = await supabase
    .from('listing_images')
    .select('file_path, sort_order')
    .eq('listing_id', params.id)
    .order('sort_order', { ascending: true });

  let imageUrl: string | null = null;
  if (images && images.length > 0 && images[0].file_path) {
    const pathInBucket = toBucketPath(images[0].file_path);
    const { data: pub } = supabase.storage.from('listing_images').getPublicUrl(pathInBucket);
    imageUrl = pub?.publicUrl ?? null;
  }

  return (
    <div className="max-w-3xl mx-auto py-10">
      <Link className="text-blue-600 underline" href="/listings">
        ← Kembali ke Listings
      </Link>

      {imageUrl && (
        <img
          src={imageUrl}
          alt={listing.title}
          className="w-full h-auto rounded-lg mt-6"
        />
      )}

      <h1 className="text-3xl font-bold mt-6">{listing.title}</h1>
      <p className="text-gray-700 mt-2">
        {listing.brand} • {listing.year} • {listing.location}
      </p>
      <p className="font-bold text-2xl mt-4">Rp {Number(listing.price).toLocaleString('id-ID')}</p>
      <p className="mt-6">{listing.description}</p>

      {listing.whatsapp && (
        <a
          href={`https://wa.me/${listing.whatsapp}`}
          target="_blank"
          className="inline-block mt-10 bg-green-500 text-white px-6 py-3 rounded-lg"
        >
          Chat via WhatsApp
        </a>
      )}
    </div>
  );
}
