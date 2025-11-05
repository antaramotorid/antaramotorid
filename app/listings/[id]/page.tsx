'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

type Listing = {
  id: string;
  title: string;
  brand: string | null;
  year: number | null;
  price: number | null;
  created_at: string;
};

export default function ListingDetailPage() {
  const { id } = useParams() as { id: string };
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase
        .from('listings')
        .select('*')
        .eq('id', id)
        .single();
      setListing(data as Listing | null);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <main style={{ maxWidth: 800, margin: '40px auto' }}>Memuat…</main>;
  if (!listing) return <main style={{ maxWidth: 800, margin: '40px auto' }}>Tidak ditemukan.</main>;

  return (
    <main style={{ maxWidth: 900, margin: '40px auto' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>{listing.title}</h1>
      <p style={{ marginBottom: 16 }}>
        {listing.brand} • {listing.year} • <b>Rp {listing.price}</b>
      </p>
      <a href="/listings">← Kembali ke daftar</a>
    </main>
  );
}
