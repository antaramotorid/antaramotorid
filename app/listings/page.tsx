// app/listings/page.tsx
export const revalidate = 0;            // jangan cache
export const dynamic = 'force-dynamic'; // paksa dinamis

import { supabase } from '../../lib/supabaseClient';

type Row = {
  id: string;
  title: string | null;
  brand: string | null;
  year: number | null;
  price: number | null;
};

export default async function ListingsPage() {
  const { data, error } = await supabase
    .from('listings')
    .select('id, title, brand, year, price')
    .order('created_at', { ascending: false })
    .limit(24);

  if (error) {
    return (
      <main style={{ maxWidth: 800, margin: '40px auto' }}>
        <h1>Listing Terbaru</h1>
        <p style={{ color: 'crimson' }}>Gagal memuat: {error.message}</p>
      </main>
    );
  }

  const listings: Row[] = data ?? [];

  return (
    <main style={{ maxWidth: 800, margin: '40px auto' }}>
      <h1 style={{ fontWeight: 600, fontSize: 22, marginBottom: 20 }}>Listing Terbaru</h1>

      {listings.length === 0 ? (
        <p>Belum ada data.</p>
      ) : (
        <ul style={{ display:'grid', gap:18, gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))' }}>
  { listings.map(x => (
    <li key={x.id} style={{ border:'1px solid #ddd', padding:12, borderRadius:8 }}>
      <Link href={/listings/${x.id}}>{x.title}</Link>
      <p>{x.brand} - {x.year}</p>
      <b>Rp {x.price}</b>
    </li>
  ))}
</ul>
      )}
    </main>
  );
}
