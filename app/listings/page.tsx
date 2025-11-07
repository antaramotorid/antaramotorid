// app/listings/page.tsx
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
  created_at: string | null;
};

type ImgRow = {
  listing_id: string;
  file_path?: string | null; // path relatif di bucket (contoh: "<listingId>/foto1.jpg")
  url?: string | null;       // kalau kamu menyimpan full URL di kolom ini
  created_at: string | null;
};

function toRupiah(n?: number | null) {
  if (typeof n !== 'number') return '—';
  return n.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
}

export default function ListingsPage() {
  const [items, setItems] = useState<Listing[]>([]);
  const [hero, setHero] = useState<Record<string, string>>({}); // listingId -> src
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);

      // 1) ambil listing terbaru
      const { data: listings, error: e1 } = await supabase
        .from('listings')
        .select('id,title,brand,year,price,location,created_at')
        .order('created_at', { ascending: false })
        .limit(24);

      if (e1 || !listings) {
        setItems([]);
        setHero({});
        setLoading(false);
        return;
      }

      const list = listings as Listing[];
      setItems(list);

      // 2) ambil foto pertama untuk tiap listing (kalau ada)
      const ids = list.map((l) => l.id);
      if (ids.length) {
        const { data: imgs } = await supabase
          .from('listing_images')
          .select('listing_id,file_path,url,created_at')
          .in('listing_id', ids)
          .order('created_at', { ascending: true }); // foto paling awal jadi cover

        const mapping: Record<string, string> = {};

        for (const row of (imgs as ImgRow[] | null) || []) {
          // kalau belum ada cover utk listing ini, set sekarang
          if (!mapping[row.listing_id]) {
            // 2.a kalau kolom url sudah berisi full URL, pakai itu
            if (row.url && row.url.startsWith('http')) {
              mapping[row.listing_id] = row.url;
              continue;
            }
            // 2.b kalau ada file_path, minta public URL dari Supabase Storage
            if (row.file_path) {
              const { data } = supabase
                .storage
                .from('listing-images')
                .getPublicUrl(row.file_path);
              if (data?.publicUrl) {
                mapping[row.listing_id] = data.publicUrl;
              }
            }
          }
        }

        setHero(mapping);
      }

      setLoading(false);
    })();
  }, []);

  return (
    <main style={{ maxWidth: 980, margin: '40px auto' }}>
      <h1 style={{ fontWeight: 800, fontSize: 24, marginBottom: 16 }}>Listing Terbaru</h1>
      {loading && <p>Memuat…</p>}
      {!loading && items.length === 0 && <p>Belum ada data.</p>}

      <ul
        style={{
          display: 'grid',
          gap: 16,
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          listStyle: 'none',
          padding: 0,
        }}
      >
        {items.map((l) => {
          const img = hero[l.id] || 'https://via.placeholder.com/480x320?text=No+Photo';
          return (
            <li key={l.id} style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
              <Link href={`/listings/${encodeURIComponent(l.id)}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ aspectRatio: '3/2', background: '#f3f4f6' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img}
                    alt={l.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    loading="lazy"
                  />
                </div>
                <div style={{ padding: 12 }}>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1e40af' }}>{l.title}</h3>
                  <p style={{ margin: '6px 0 0 0', color: '#4b5563' }}>
                    {l.brand || '—'} {l.year ? `• ${l.year}` : ''}
                  </p>
                  <p style={{ margin: '8px 0 0 0', fontWeight: 800 }}>{toRupiah(l.price)}</p>
                  {l.location && <p style={{ margin: '6px 0 0 0', color: '#6b7280', fontSize: 12 }}>{l.location}</p>}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
