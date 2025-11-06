import Link from 'next/link';
import { supabase } from '../../../lib/supabaseClient';

type Listing = {
  id: string; // uuid
  title: string;
  brand?: string | null;
  year?: number | null;
  price?: number | null;
  location?: string | null;
  contact_whatsapp?: string | null;
  description?: string | null;
  image_url?: string | null;
  created_at?: string | null;
};

function toRupiah(n?: number | null) {
  if (typeof n !== 'number') return '—';
  return n.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
}

function waLink(raw?: string | null) {
  if (!raw) return '';
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('0')) digits = '62' + digits.slice(1);
  if (!digits.startsWith('62')) digits = '62' + digits;
  return `https://wa.me/${digits}`;
}

export default async function ListingDetailPage({ params }: { params: { id: string } }) {
  const idParam = decodeURIComponent(params.id);

  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('id', idParam)
    .single<Listing>();

  if (error || !data) {
    return (
      <main style={{ maxWidth: 980, margin: '40px auto' }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 12 }}>Tidak ditemukan</h1>
        <p>Listing dengan ID <code>{idParam}</code> tidak ada.</p>
        <p style={{ marginTop: 16 }}>
          <Link href="/listings">← Kembali ke Listings</Link>
        </p>
      </main>
    );
  }

  const wa = waLink(data.contact_whatsapp);
  const img = data.image_url || 'https://via.placeholder.com/1200x800?text=No+Photo';

  return (
    <main style={{ maxWidth: 980, margin: '40px auto' }}>
      <p style={{ marginBottom: 16 }}>
        <Link href="/listings">← Kembali ke Listings</Link>
      </p>

      <div style={{ display: 'grid', gap: 20, gridTemplateColumns: '2fr 1fr' }}>
        <section>
          <div style={{ aspectRatio: '3/2', background: '#f3f4f6', borderRadius: 12, overflow: 'hidden' }}>
            <img
              src={img}
              alt={data.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>

          <h1 style={{ fontSize: 28, fontWeight: 800, margin: '14px 0 6px' }}>{data.title}</h1>
          <p style={{ color: '#4b5563', margin: 0 }}>
            {(data.brand || '—')} {data.year ? `• ${data.year}` : ''} {data.location ? `• ${data.location}` : ''}
          </p>

          <p style={{ fontSize: 22, fontWeight: 800, marginTop: 10 }}>{toRupiah(data.price)}</p>

          {data.description && (
            <div style={{ marginTop: 12, whiteSpace: 'pre-wrap' }}>
              {data.description}
            </div>
          )}
        </section>

        <aside style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 14, height: 'fit-content' }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Hubungi Penjual</div>
          {wa ? (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                padding: '10px 14px',
                borderRadius: 10,
                border: '1px solid #16a34a',
                textDecoration: 'none',
                fontWeight: 700,
              }}
            >
              Chat via WhatsApp
            </a>
          ) : (
            <p style={{ color: '#6b7280' }}>Nomor WhatsApp belum tersedia.</p>
          )}
        </aside>
      </div>
    </main>
  );
}
