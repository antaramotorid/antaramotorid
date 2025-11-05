// app/listings/page.tsx
import { supabase } from '../../lib/supabaseClient';

export default async function ListingsPage() {
  const { data: listings, error } = await supabase
    .from('listings')
    .select('id,title,brand,year,price')
    .order('id', { ascending: false })
    .limit(20);

  if (error) return <main><p>Gagal memuat: {error.message}</p></main>;

  return (
    <main>
      <h1 style={{ fontWeight: 600, fontSize: 20, marginBottom: 12 }}>
        Listing Terbaru
      </h1>

      {!listings || listings.length === 0 ? (
        <p>Tidak ada data.</p>
      ) : (
        <ul style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))' }}>
          {listings.map((l) => (
            <li key={l.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 10 }}>
              <a href={/listings/${l.id}} style={{ textDecoration: 'none' }}>
                <h2 style={{ fontWeight: 600 }}>{l.title}</h2>
                {l.brand && <p>Brand: {l.brand}</p>}
                {l.year && <p>Tahun: {l.year}</p>}
                {typeof l.price === 'number' && <p>Rp {l.price.toLocaleString('id-ID')}</p>}
              </a>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
