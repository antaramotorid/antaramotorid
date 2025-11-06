// app/listings/[id]/page.tsx
export const revalidate = 0;
export const dynamic = 'force-dynamic';

import { supabase } from '../../../lib/supabaseClient';

type Props = { params: { id: string } };

export default async function ListingDetailPage({ params }: Props) {
  const id = params.id; // akan berupa UUID dari link /listings

  const { data, error } = await supabase
    .from('listings')
    .select('id, title, brand, year, price, created_at')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    return (
      <main style={{ maxWidth: 900, margin: '40px auto' }}>
        <h1>Terjadi kesalahan</h1>
        <p style={{ color: 'crimson' }}>{error.message}</p>
        <p>ID diminta: {id}</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main style={{ maxWidth: 900, margin: '40px auto' }}>
        <h1>Data tidak ditemukan</h1>
        <p>ID: {id}</p>
      </main>
    );
  }

  const l = data;

  return (
    <main
      style={{
        display: 'grid',
        gap: 20,
        gridTemplateColumns: '2fr 1fr',
        maxWidth: 900,
        margin: '40px auto',
      }}
    >
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 10 }}>{l.title ?? '(tanpa judul)'}</h1>
        <div style={{ opacity: 0.8, marginBottom: 12 }}>
          {l.brand ?? '-'} {l.year ? `• ${l.year}` : ''}
        </div>
        {typeof l.price === 'number' && (
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 16 }}>
            Rp {l.price.toLocaleString('id-ID')}
          </div>
        )}
        <p style={{ opacity: 0.7 }}>Detail lengkap akan kita tambah belakangan.</p>
      </div>

      <aside style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 14 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Ringkasan</div>
        <div style={{ display: 'grid', gap: 6 }}>
          <div>Brand: {l.brand ?? '-'}</div>
          <div>Tahun: {l.year ?? '-'}</div>
          <div>
            Harga:{' '}
            {typeof l.price === 'number' ? `Rp ${l.price.toLocaleString('id-ID')}` : '-'}
          </div>
        </div>
      </aside>
    </main>
  );
}
