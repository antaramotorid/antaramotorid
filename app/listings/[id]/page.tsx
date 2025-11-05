// app/listings/[id]/page.tsx
export const dynamic = 'force-dynamic';

import { supabase } from '@/lib/supabaseClient';

type PageProps = { params: { id: string } };

export default async function ListingDetailPage({ params }: PageProps) {
  const { data: listing, error } = await supabase
    .from('listings')
    .select('*')
    .eq('id', params.id)
    .maybeSingle(); // lebih aman dari .single()

  if (error) {
    return (
      <main style={{ maxWidth: 800, margin: '40px auto' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Terjadi kesalahan</h1>
        <pre>{error.message}</pre>
        <p>ID yang diminta: {params.id}</p>
      </main>
    );
  }

  if (!listing) {
    return (
      <main style={{ maxWidth: 800, margin: '40px auto' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Tidak ditemukan</h1>
        <p>ID yang diminta: {params.id}</p>
      </main>
    );
  }

  return (
    <main style={{ display: 'grid', gap: 20, gridTemplateColumns: '2fr 1fr', maxWidth: 900, margin: '40px auto' }}>
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 700 }}>{listing.title}</h1>
        <div style={{ marginTop: 10, opacity: 0.8 }}>
          <div>{listing.brand} – {listing.year}</div>
          {typeof listing.price === 'number' && <div style={{ marginTop: 8 }}>Rp {listing.price.toLocaleString('id-ID')}</div>}
        </div>
      </div>
      <aside>
        <a href="/listings" style={{ textDecoration: 'none' }}>← Kembali</a>
      </aside>
    </main>
  );
}
