import { supabase } from '../../lib/supabaseClient';

export default async function ListingsPage() {
  const { data: listings, error } = await supabase
    .from('listings')
    .select('id,title,brand,year,price')
    .order('id', { ascending: false })
    .limit(20);

  if (error) return <main><p>Gagal memuat: {error.message}</p></main>;

  return (
    <main style={{ maxWidth: 800, margin: '40px auto' }}>
      <h1 style={{ fontWeight: 600, fontSize: 22, marginBottom: 20 }}>Listing Terbaru</h1>

      {!listings || listings.length === 0 ? (
        <p>Tidak ada data.</p>
      ) : (
        <ul style={{ display: 'grid', gap: 18, gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))' }}>
          {listings.map((l) => (
            <li key={l.id} style={{ border: '1px solid #ddd', padding: 12, borderRadius: 8 }}>
              <a href={/listings/${l.id}} style={{ textDecoration: 'none', color: 'black' }}>
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
