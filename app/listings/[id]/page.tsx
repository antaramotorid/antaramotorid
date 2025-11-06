// app/listings/[id]/page.tsx
import { supabase } from '../../../lib/supabaseClient';

type Props = { params: { id: string } };

export default async function ListingDetailPage({ params }: Props) {
  const idNum = Number(params.id);
  if (!Number.isFinite(idNum)) {
    return (
      <main style={{ maxWidth: 800, margin: '40px auto' }}>
        <h1>Terjadi kesalahan</h1>
        <p>ID harus angka. ID diminta: {params.id}</p>
      </main>
    );
  }

  const { data: listing, error } = await supabase
    .from('listings')
    .select('id, title, brand, year, price, location, description, contact_whatsapp, created_at')
    .eq('id', idNum)
    .single();

  if (error || !listing) {
    return (
      <main style={{ maxWidth: 800, margin: '40px auto' }}>
        <h1>Terjadi kesalahan</h1>
        <p>{error?.message || 'Data tidak ditemukan.'}</p>
      </main>
    );
  }

  const wa = (listing.contact_whatsapp || '').replace(/^\+/, '');
  const waHref = wa ? `https://wa.me/${wa}` : '';
  const price =
    typeof listing.price === 'number' ? `Rp ${listing.price.toLocaleString('id-ID')}` : '—';

  return (
    <main style={{ maxWidth: 900, margin: '40px auto' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>{listing.title}</h1>
      <p style={{ color: '#4b5563', margin: 0 }}>
        {listing.brand || '—'} {listing.year ? `• ${listing.year}` : ''} • {listing.location || 'Lokasi tidak ada'}
      </p>
      <p style={{ marginTop: 8, fontWeight: 700 }}>{price}</p>

      {listing.description && (
        <div style={{ marginTop: 14, whiteSpace: 'pre-wrap' }}>{listing.description}</div>
      )}

      {waHref && (
        <p style={{ marginTop: 16 }}>
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid #10b981',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            Chat via WhatsApp
          </a>
        </p>
      )}
    </main>
  );
}
