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
        <ul
          style={{
            display: 'grid',
            gap: 18,
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            listStyle: 'none',
            padding: 0,
          }}
        >
          {listings.map((l) => (
            <li
              key={l.id}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: 12,
                padding: 14,
              }}
            >
              <a
                href={`/listings/${l.id}`}
                style={{ display: 'inline-block', marginBottom: 8, fontWeight: 600, textDecoration: 'none' }}
              >
                {l.title ?? '(tanpa judul)'}
              </a>
              <div style={{ opacity: 0.75, marginBottom: 6 }}>
                {l.brand ?? '-'} {l.year ? `• ${l.year}` : ''}
              </div>
              {typeof l.price === 'number' && (
                <div style={{ fontWeight: 700 }}>Rp {l.price.toLocaleString('id-ID')}</div>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
