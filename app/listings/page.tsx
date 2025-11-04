import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default async function ListingsPage() {
  const { data: listings } = await supabase
    .from('listings')
    .select('id, title, price, brand, year')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(20);

  return (
    <main>
      <h1 style={{ fontWeight: 600, fontSize: 20, marginBottom: 12 }}>Listing Terbaru</h1>
      <ul style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))' }}>
        {listings?.map((l) => (
          <li key={l.id} style={{ border: '1px solid #ddd', borderRadius: 12, padding: 12 }}>
            <Link href={/listings/${l.id}} style={{ display: 'block' }}>
              <div style={{ fontWeight: 600 }}>{l.title}</div>
              <div style={{ opacity: .8, fontSize: 13 }}>{l.brand} • {l.year}</div>
              <div style={{ marginTop: 6, fontWeight: 700 }}>
                Rp {Number(l.price).toLocaleString('id-ID')}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
