'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

type Row = {
  id: string;
  title: string | null;
  brand: string | null;
  year: number | null;
  price: number | null;
};

export default function ListingsPage() {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('listings')
        .select('id,title,brand,year,price')
        .order('created_at', { ascending: false })
        .limit(40);

      if (error) setErr(error.message);
      setItems((data ?? []) as Row[]);
      setLoading(false);
    })();
  }, []);

  return (
    <main style={{ maxWidth: 900, margin: '40px auto' }}>
      <h1 style={{ fontWeight: 700, fontSize: 24, marginBottom: 16 }}>Listing Terbaru</h1>

      {loading && <p>Memuat…</p>}
      {err && <p style={{ color: 'crimson' }}>Gagal memuat: {err}</p>}

      {!loading && !err && items.length === 0 && <p>Belum ada data.</p>}

      {!loading && !err && items.length > 0 && (
        <ul
          style={{
            display: 'grid',
            gap: 16,
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            listStyle: 'none',
            padding: 0,
          }}
        >
          {items.map((x) => (
            <li key={x.id} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 12 }}>
              {/* PENTING: encode id asli, BUKAN '<uuid>' atau '[id]' */}
              <a href={/listings/${encodeURIComponent(x.id)}} style={{ textDecoration: 'none', color: '#0b66c3' }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{x.title ?? '(tanpa judul)'}</h3>
              </a>
              <div style={{ opacity: 0.75, marginTop: 6 }}>
                {x.brand ?? '-'} {x.year ? • ${x.year} : ''}
              </div>
              {typeof x.price === 'number' && (
                <div style={{ fontWeight: 700, marginTop: 8 }}>Rp {x.price.toLocaleString('id-ID')}</div>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
