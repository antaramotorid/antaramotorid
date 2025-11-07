'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

type Listing = {
  id: string;
  title: string;
  brand: string | null;
  year: number | null;
  price: number | null;
  location: string | null;
  created_at: string;
  listing_images?: { file_path: string }[];
};

export default function ListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('listings') // <-- cukup "listings", jangan "public.listings"
        .select(
          `
          id, title, brand, year, price, location, created_at,
          listing_images ( file_path )
        `
        )
        .order('created_at', { ascending: false });

      if (!error) setListings(data || []);
      setLoading(false);
    }
    load();
  }, []);

  const pubUrl = (path: string) =>
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listing-images/${path}`;

  if (loading) return <main style={{ maxWidth: 900, margin: '40px auto' }}>Memuat…</main>;

  return (
    <main style={{ maxWidth: 900, margin: '40px auto' }}>
      <h1 style={{ fontWeight: 700, fontSize: 28, marginBottom: 20 }}>Listing Terbaru</h1>

      {listings.length === 0 ? (
        <p>Belum ada data.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {listings.map((item) => {
            const firstPath = item.listing_images?.[0]?.file_path || null;
            const img = firstPath ? pubUrl(firstPath) : null;

            return (
              <Link key={item.id} href={`/listings/${item.id}`}>
                <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 }}>
                  {img && (
                    <img
                      src={img}
                      alt={item.title}
                      style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 10, marginBottom: 10 }}
                    />
                  )}
                  <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>{item.title}</h3>
                  <p style={{ color: '#6b7280', marginBottom: 6 }}>
                    {item.brand || '-'} • {item.year ?? '-'}
                  </p>
                  {typeof item.price === 'number' && (
                    <p style={{ fontWeight: 700, marginBottom: 6 }}>Rp {item.price.toLocaleString('id-ID')}</p>
                  )}
                  {item.location && <p style={{ color: '#6b7280', fontSize: 12 }}>{item.location}</p>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
