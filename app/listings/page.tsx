'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

type Listing = {
  id: string;
  title: string;
  brand: string | null;
  year: number | null;
  price: number | null;
};

export default function ListingsPage() {
  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('listings')
        .select('id,title,brand,year,price')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) setItems(data as Listing[]);
      setLoading(false);
    })();
  }, []);

  return (
    <main style={{ maxWidth: 800, margin: '40px auto' }}>
      <h1 style={{ fontWeight: 600, fontSize: 22, marginBottom: 12 }}>Listing Terbaru</h1>
      <p style={{ marginBottom: 16 }}>Total data: {items.length}</p>

      {loading ? (
        <p>Memuat…</p>
      ) : items.length === 0 ? (
        <p>Belum ada data.</p>
      ) : (
        <ul style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))' }}>
          {items.map((l) => (
            <li key={l.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
              <h3 style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>{l.title}</h3>
              <p>{l.brand || '-'}</p>
              {typeof l.year === 'number' && <p>Tahun: {l.year}</p>}
              {typeof l.price === 'number' && <p>Rp {l.price.toLocaleString('id-ID')}</p>}
              <Link href={`/listings/${l.id}`}>Lihat detail</Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
