// app/listings/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

type Listing = {
  id: string;
  title: string;
  brand: string | null;
  year: number | null;
  price: number | null;
  location: string | null;
  description: string | null;
  whatsapp: string | null;
};

type ListingImage = {
  id: string;
  file_path: string;   // path relatif di bucket ATAU url penuh
  sort_order: number | null;
};

export default function ListingDetailPage({
  params,
}: { params: { id: string } }) {
  const [listing, setListing] = useState<Listing | null>(null);
  const [images, setImages] = useState<ListingImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Helper: buat URL gambar
  const buildImageSrc = (p: string) => {
    if (!p) return '';
    // kalau user sudah simpan url https langsung, pakai apa adanya
    if (p.startsWith('http')) return p;
    // kalau hanya path relatif, buat public URL-nya
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    // pastikan bucket “listing-images” sudah public (kita sudah buat policy read)
    return `${base}/storage/v1/object/public/listing-images/${p}`;
  };

  useEffect(() => {
    (async () => {
      try {
        // ambil listing
        const { data: l, error: e1 } = await supabase
          .from('listings')
          .select('id, title, brand, year, price, location, description, whatsapp')
          .eq('id', params.id)
          .single();
        if (e1) throw e1;
        setListing(l as Listing);

        // ambil images
        const { data: imgs, error: e2 } = await supabase
          .from('listing_images')
          .select('id, file_path, sort_order')
          .eq('listing_id', params.id)
          .order('sort_order', { ascending: true });
        if (e2) throw e2;
        setImages((imgs || []) as ListingImage[]);
      } catch (e: any) {
        setErr(e?.message || 'Gagal memuat data');
      } finally {
        setLoading(false);
      }
    })();
  }, [params.id]);

  if (loading) return <main style={{ maxWidth: 960, margin: '40px auto' }}>Memuat…</main>;
  if (err) return (
    <main style={{ maxWidth: 960, margin: '40px auto' }}>
      <h1>Terjadi kesalahan</h1>
      <p>{err}</p>
      <p>ID diminta: {params.id}</p>
      <p><Link href="/listings">← Kembali ke Listings</Link></p>
    </main>
  );
  if (!listing) return (
    <main style={{ maxWidth: 960, margin: '40px auto' }}>
      <p>Tidak ditemukan.</p>
      <p><Link href="/listings">← Kembali ke Listings</Link></p>
    </main>
  );

  return (
    <main style={{ maxWidth: 960, margin: '40px auto' }}>
      <p style={{ marginBottom: 16 }}>
        <Link href="/listings">← Kembali ke Listings</Link>
      </p>

      {/* Galeri sederhana */}
      {images.length > 0 && (
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr' }}>
          {images.map((img) => (
            <img
              key={img.id}
              src={buildImageSrc(img.file_path)}
              alt={listing.title}
              style={{ width: '100%', height: 360, objectFit: 'cover', borderRadius: 10, border: '1px solid #eee' }}
            />
          ))}
        </div>
      )}

      <h1 style={{ fontSize: 28, fontWeight: 800, marginTop: 24 }}>{listing.title}</h1>
      <p style={{ color: '#666', marginTop: 4 }}>
        {listing.brand || '-'} • {listing.year ?? '-'}{listing.location ? ` • ${listing.location}` : ''}
      </p>
      {typeof listing.price === 'number' && (
        <p style={{ fontWeight: 800, fontSize: 22, marginTop: 10 }}>
          Rp {listing.price.toLocaleString('id-ID')}
        </p>
      )}
      {listing.description && <p style={{ marginTop: 12 }}>{listing.description}</p>}

      {listing.whatsapp && (
        <p style={{ marginTop: 16 }}>
          <a
            href={`https://wa.me/${listing.whatsapp.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ border: '1px solid #0a9159', padding: '8px 12px', borderRadius: 999 }}
          >
            WhatsApp
          </a>
        </p>
      )}
    </main>
  );
}
