// app/listings/[id]/page.tsx
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient'; // ← sesuai permintaan

type ImageRow = { file_path: string | null; sort_order: number | null };
type ListingRow = {
  id: string;
  title: string | null;
  brand: string | null;
  year: number | null;
  price: number | null;
  location: string | null;
  description: string | null;
  whatsapp: string | null;
  created_at: string | null;
  listing_images?: ImageRow[] | null;
};

export default async function ListingDetailPage({
  params,
}: { params: { id: string } }) {
  const { data, error } = await supabase
    .from('listings')
    .select(
      'id, title, brand, year, price, location, description, whatsapp, created_at, listing_images(file_path, sort_order)'
    )
    .eq('id', params.id)
    .single();

  if (error) {
    return (
      <main style={{ maxWidth: 960, margin: '40px auto' }}>
        <Link href="/listings">← Kembali ke Listings</Link>
        <h1 style={{ marginTop: 16 }}>Terjadi kesalahan</h1>
        <p style={{ color: '#c00' }}>{error.message}</p>
        <p>ID diminta: {params.id}</p>
      </main>
    );
  }

  const listing = (data as unknown as ListingRow) || null;
  if (!listing) {
    return (
      <main style={{ maxWidth: 960, margin: '40px auto' }}>
        <Link href="/listings">← Kembali ke Listings</Link>
        <p style={{ marginTop: 16 }}>Listing tidak ditemukan.</p>
      </main>
    );
  }

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const images: string[] =
    (listing.listing_images || [])
      .filter((img): img is ImageRow => !!img && !!img.file_path)
      .map((img) => `${base}/storage/v1/object/public/listing-images/${img.file_path}`) || [];

  const fmt = new Intl.NumberFormat('id-ID');

  return (
    <main style={{ maxWidth: 1000, margin: '40px auto', padding: '0 16px' }}>
      <Link href="/listings">← Kembali ke Listings</Link>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginTop: 16 }}>
        <section>
          {images.length > 0 ? (
            <img
              src={images[0]}
              alt={listing.title || 'foto unit'}
              style={{ width: '100%', height: 'auto', borderRadius: 12, display: 'block', background: '#f2f2f2' }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                aspectRatio: '4 / 3',
                borderRadius: 12,
                background: '#f3f4f6',
                display: 'grid',
                placeItems: 'center',
                color: '#9ca3af',
                fontSize: 14,
              }}
            >
              Tidak ada gambar
            </div>
          )}

          {images.length > 1 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              {images.slice(1).map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`foto ${i + 2}`}
                  style={{ width: 100, height: 80, objectFit: 'cover', borderRadius: 8, background: '#f2f2f2' }}
                />
              ))}
            </div>
          )}

          <div style={{ marginTop: 20, color: '#374151', lineHeight: 1.6 }}>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>{listing.title}</h1>
            <p style={{ margin: '6px 0 0 0', color: '#6b7280' }}>
              {listing.brand || '-'} • {listing.year || '-'} {listing.location ? `• ${listing.location}` : ''}
            </p>
            {typeof listing.price === 'number' && (
              <p style={{ marginTop: 12, fontSize: 22, fontWeight: 800 }}>Rp {fmt.format(listing.price)}</p>
            )}

            {listing.description && (
              <>
                <h3 style={{ marginTop: 24, marginBottom: 8, fontSize: 18, fontWeight: 700 }}>Deskripsi</h3>
                <p style={{ whiteSpace: 'pre-wrap' }}>{listing.description}</p>
              </>
            )}
          </div>
        </section>

        <aside>
          <div style={{ position: 'sticky', top: 24, border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
            <h3 style={{ marginTop: 0, marginBottom: 12 }}>Hubungi Penjual</h3>
            {listing.whatsapp ? (
              <a
                href={`https://wa.me/${listing.whatsapp.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'inline-block', padding: '10px 14px', borderRadius: 10, border: '1px solid #10b981' }}
              >
                Chat via WhatsApp
              </a>
            ) : (
              <p style={{ color: '#6b7280' }}>Nomor WhatsApp belum tersedia.</p>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
