// app/listings/page.tsx
import { supabase } from '@/lib/supabaseClient';

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
    .limit(50);

  const listings: Row[] = data ?? [];

  return (
    <main style={{ maxWidth: 900, margin: '40px auto' }}>
      <h1 style={{ fontWeight: 700, fontSize: 24, marginBottom: 20 }}>
        Listing Terbaru
      </h1>

      {error && (
        <p style={{ color: 'crimson', marginBottom: 16 }}>
          Gagal memuat data: {error.message}
        </p>
      )}

      {listings.length === 0 ? (
        <p>Belum ada data.</p>
      ) : (
        <ul
          style={{
            display: 'grid',
            gap: 16,
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          }}
        >
          {listings.map((l) => (
            <li
              key={l.id}
              style={{
                border: '1px solid #ddd',
                borderRadius: 10,
                padding: 14,
                background: '#fff',
              }}
            >
              <a
                href={`/listings/${l.id}`}
                style={{ textDecoration: 'none', color: '#0b66c3' }}
              >
                <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
                  {l.title ?? '(Tanpa judul)'}
                </h2>
              </a>

              <p style={{ margin: '8px 0 0 0', color: '#555' }}>
                {(l.brand ?? '-').toLowerCase()} — {l.year ?? '-'}
              </p>

              {typeof l.price === 'number' && (
                <p style={{ margin: '10px 0 0 0', fontWeight: 700 }}>
                  Rp {l.price.toLocaleString('id-ID')}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
