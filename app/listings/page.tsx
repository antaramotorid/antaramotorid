'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function ListingsPage() {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('listings').select('*').order('created_at', { ascending: false });
      setListings(data || []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <main style={{ maxWidth: 800, margin: "40px auto" }}>
      <h1 style={{ fontWeight: 600, fontSize: 22, marginBottom: 20 }}>Listing Terbaru</h1>

      {loading ? <p>Sedang memuat...</p> : null}

      {(!loading && listings.length === 0) ? (
        <p>Belum ada data.</p>
      ) : (
        <ul style={{ display:'grid', gap:18, gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))' }}>
          {listings.map((l) => (
            <li key={l.id} style={{ border:'1px solid #ccc', padding: 12 }}>
              <a href={`/listings/${l.id}`}>{l.title}</a>
              <p>{l.brand} - {l.year}</p>
              <b>Rp {l.price}</b>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
