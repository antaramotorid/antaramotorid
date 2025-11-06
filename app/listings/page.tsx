// app/listings/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

type Listing = {
  id: number;
  title: string;
  brand: string;
  year: number | null;
  price: number | null;
  location: string | null;
  contact_whatsapp: string | null;
};

export default function ListingsPage() {
  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('listings')
        .select('id, title, brand, year, price, location, contact_whatsapp')
        .order('id', { ascending: false })
        .limit(40);

      if (!error && data) setItems(data as Listing[]);
      setLoading(false);
    })();
  }, []);

  return (
    <main style={{ maxWidth: 980, margin: '40px auto' }}>
      <h1 style={{ fontWeight: 700, fontSize: 24, marginBottom: 16 }}>Listing Terbaru</h1>

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
          const wa = (l.contact_whatsapp || '').replace(/^\+/, '');
          const waHref = wa ? `https://wa.me/${wa}` : '';
          const price = typeof l.price === 'number' ? `Rp ${l.price.toLocaleString('id-ID')}` : '—';

          return (
            <li key={l.id} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 14 }}>
              <Link href={`/listings/${l.id}`} style={{ textDecoration: 'none' }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{l.title}</h3>
              </Link>

              <p style={{ margin: '8px 0 0 0', color: '#4b5563' }}>
                {l.brand || '—'} {l.year ? `• ${l.year}` : ''}
              </p>

              <p style={{ margin: '6px 0 0 0', fontWeight: 700 }}>{price}</p>

              <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#6b7280' }}>{l.location || 'Lokasi tidak ada'}</span>
                {waHref && (
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      marginLeft: 'auto',
                      fontSize: 12,
                      padding: '6px 10px',
                      border: '1px solid #10b981',
                      borderRadius: 999,
                      textDecoration: 'none',
                    }}
                  >
                    WhatsApp
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
