// app/listings/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

type Listing = {
  id: number;
  title: string;
  brand: string | null;
  year: number | null;
  price: number | null;
  location: string | null;
  whatsapp: string | null;
};

function toRupiah(n?: number | null) {
  if (typeof n !== 'number') return '-';
  return n.toLocaleString('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  });
}

function waLink(raw?: string | null) {
  if (!raw) return '';
  // Hanya angka
  let digits = raw.replace(/\D/g, '');
  // 08xxxx -> 62xxxx
  if (digits.startsWith('0')) digits = '62' + digits.slice(1);
  // 8xxxx -> 62xxxx (kalau user lupa tulis 0/62)
  if (!digits.startsWith('62')) digits = '62' + digits;
  return `https://wa.me/${digits}`;
}

export default function ListingsPage() {
  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('listings')
        .select('id,title,brand,year,price,location,whatsapp')
        .order('created_at', { ascending: false })
        .limit(24);

      if (!error && data) setItems(data as Listing[]);
      setLoading(false);
    })();
  }, []);

  return (
    <main style={{ maxWidth: 900, margin: '40px auto' }}>
      <h1 style={{ fontWeight: 700, fontSize: 24, marginBottom: 16 }}>
        Listing Terbaru
      </h1>

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
          const link = `/listings/${l.id}`;
          const wa = waLink(l.whatsapp);
          return (
            <li
              key={l.id}
              style={{
                border: '1px solid #ddd',
                borderRadius: 10,
                padding: 14,
              }}
            >
              <Link href={link} style={{ textDecoration: 'none' }}>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 18,
                    fontWeight: 700,
                    color: '#1e40af',
                  }}
                >
                  {l.title}
                </h3>
              </Link>

              <p style={{ margin: '6px 0 0 0', color: '#444' }}>
                {l.brand || '-'} • {l.year ?? '-'}
              </p>

              <p
                style={{
                  margin: '8px 0 0 0',
                  fontWeight: 800,
                }}
              >
                {toRupiah(l.price)}
              </p>

              {l.location && (
                <p style={{ margin: '4px 0 0 0', color: '#6b7280' }}>
                  {l.location}
                </p>
              )}

              {wa && (
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-block',
                    marginTop: 10,
                    padding: '8px 12px',
                    border: '1px solid #16a34a',
                    borderRadius: 8,
                    textDecoration: 'none',
                    color: '#16a34a',
                    fontWeight: 600,
                  }}
                >
                  WhatsApp
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
