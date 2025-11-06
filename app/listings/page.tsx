'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('listings')
        .select('id,title,brand,year,price')
        .order('created_at', { ascending: false })
        .limit(50);

      setItems(data ?? []);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <main style={{ maxWidth: 900, margin: '40px auto' }}>
      <h1 style={{ fontWeight: 700, fontSize: 24, marginBottom: 16 }}>Listing Terbaru</h1>

      {loading && <p>Memuat...</p>}

      {!loading && items.length === 0 && <p>Belum ada data.</p>}

      {!loading && items.length > 0 && (
        <ul style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', listStyle: 'none', padding: 0 }}>
          {items.map((x) => (
            <li key={x.id} style={{ border: '1px solid #ddd', padding: 12, borderRadius: 10 }}>
              <Link href={`/listings/${encodeURIComponent(x.id)}`}>{x.title ?? '(tanpa judul)'}</Link>
              <div style={{ opacity: .8 }}>{x.brand ?? '-'} {x.year ?? ''}</div>
              <b>Rp {x.price?.toLocaleString('id-ID')}</b>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
