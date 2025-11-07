'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function ListingsPage() {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const { data: items } = await supabase
        .from('public.listings')
        .select(`
          *,
          listing_images(
            file_path
          )
        `)
        .order('created_at', { ascending: false });

      setListings(items || []);
      setLoading(false);
    }
    loadData();
  }, []);

  function getPublicUrl(path: string) {
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listing-images/${path}`;
  }

  if (loading) return <p>Memuat…</p>;

  return (
    <main style={{ maxWidth: 900, margin: '40px auto' }}>
      <h1 style={{ fontWeight: 700, fontSize: 24, marginBottom: 16 }}>Listing Terbaru</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {listings.map((item) => {
          const firstImage = item.listing_images?.[0]?.file_path
            ? getPublicUrl(item.listing_images[0].file_path)
            : null;

          return (
            <Link key={item.id} href={`/listings/${item.id}`}>
              <div style={{ border: '1px solid #ddd', borderRadius: 12, padding: 12 }}>
                {firstImage && (
                  <img
                    src={firstImage}
                    alt={item.title}
                    style={{ width: '100%', borderRadius: 10, marginBottom: 8 }}
                  />
                )}
                <h3 style={{ fontSize: 18, fontWeight: 600 }}>{item.title}</h3>
                <p>{item.brand} • {item.year}</p>
                <p style={{ fontWeight: 700 }}>Rp {item.price.toLocaleString()}</p>
                {item.location && <p style={{ fontSize: 12, color: '#666' }}>{item.location}</p>}
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
