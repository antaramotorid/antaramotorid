// app/listings/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

type Listing = {
  id: string; // uuid
  title: string;
  brand?: string | null;
  year?: number | null;
  price?: number | null;
  location?: string | null;
  contact_whatsapp?: string | null;
  created_at?: string | null;
};

type ListingImage = {
  listing_id: string; // uuid
  url: string;
  created_at?: string | null;
};

function toRupiah(n?: number | null) {
  if (typeof n !== 'number') return '—';
  return n.toLocaleString('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  });
}

function waLink(raw?: string | null) {
  if (!raw) return '';
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('0')) digits = '62' + digits.slice(1);
  if (!digits.startsWith('62')) digits = '62' + digits;
  return `https://wa.me/${digits}`;
}

export default function ListingsPage() {
  const [items, setItems] = useState<Listing[]>([]);
  const [heroMap, setHeroMap] = useState<Record<string, string>>({}); // listingId -> first image url
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);

  // gambar default jika tidak ada foto
  const fallbackImg = 'https://via.placeholder.com/480x320?text=No+Photo';

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErrorText(null);

      // 1) ambil daftar listings terbaru
      const { data: listings, error: e1 } = await supabase
        .from('listings')
        .select('id,title,brand,year,price,location,contact_whatsapp,created_at')
        .order('created_at', { ascending: false })
        .limit(24);

      if (e1) {
        setErrorText(e1.message);
        setItems([]);
        setHeroMap({});
        setLoading(false);
        return;
      }

      const list = (listings || []) as Listing[];
      setItems(list);

      // 2) ambil semua foto yang listing_id-nya ada di list, lalu pilih yang paling awal (hero)
      const ids = list.map((l) => l.id);
      if (ids.length > 0) {
        const { data: imgs, error: e2 } = await supabase
          .from('listing_images')
          .select('listing_id,url,created_at')
          .in('listing_id', ids)
          .order('created_at', { ascending: true });

        if (!e2 && imgs) {
          const m: Record<string, string> = {};
          (imgs as ListingImage[]).forEach((img) => {
            if (!m[img.listing_id]) m[img.listing_id] = img.url; // ambil yang pertama
          });
          setHeroMap(m);
        }
      }

      setLoading(false);
    })();
  }, []);

  const cards = useMemo(() => {
    return items.map((l) => {
      const link = `/listings/${encodeURIComponent(l.id)}`;
      const wa = waLink(l.contact_whatsapp);
      const price = toRupiah(l.price);
      const img = heroMap[l.id] || fallbackImg;

      return (
        <li
          key={l.id}
          style={{
            border: '1px solid #e5e7eb',
            borderRadius: 12,
            overflow: 'hidden',
            background: '#fff',
          }}
        >
          <Link href={link} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ aspectRatio: '3/2', background: '#f3f4f6' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img}
                alt={l.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </div>

            <div style={{ padding: 12 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1e40af' }}>
                {l.title}
              </h3>

              <p style={{ margin: '6px 0 0 0', color: '#4b5563' }}>
                {(l.brand || '—')} {l.year ? `• ${l.year}` : ''}
              </p>

              <p style={{ margin: '8px 0 0 0', fontWeight: 800 }}>{price}</p>

              {l.location && (
                <p style={{ margin: '6px 0 0 0', color: '#6b7280', fontSize: 12 }}>
                  {l.location}
                </p>
              )}

              {wa && (
                <div style={{ marginTop: 10 }}>
                  <a
                    href={wa}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-block',
                      padding: '6px 10px',
                      border: '1px solid #16a34a',
                      borderRadius: 999,
                      textDecoration: 'none',
                      color: '#16a34a',
                      fontWeight: 600,
                      fontSize: 12,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    WhatsApp
                  </a>
                </div>
              )}
            </div>
          </Link>
        </li>
      );
    });
  }, [items, heroMap]);

  return (
    <main style={{ maxWidth: 980, margin: '40px auto' }}>
      <h1 style={{ fontWeight: 800, fontSize: 24, marginBottom: 16 }}>Listing Terbaru</h1>

      {loading && <p>Memuat…</p>}
      {errorText && <p style={{ color: 'crimson' }}>Error: {errorText}</p>}
      {!loading && !errorText && items.length === 0 && <p>Belum ada data.</p>}

      <ul
        style={{
          display: 'grid',
          gap: 16,
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          listStyle: 'none',
          padding: 0,
        }}
      >
        {cards}
      </ul>
    </main>
  );
}
