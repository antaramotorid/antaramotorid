import Link from 'next/link';
import { supabase } from '../../../lib/supabaseClient';

type Listing = {
  id: string; // uuid atau string
  title: string;
  brand?: string | null;
  year?: number | null;
  price?: number | null;
  location?: string | null;
  contact_whatsapp?: string | null;
  description?: string | null;
  created_at?: string | null;
};

type ListingImage = {
  id: string | number;
  url: string;
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

  // Ambil data listing
  const { data: item, error: e1 } = await supabase
    .from('listings')
    .select('*')
    .eq('id', idParam)
    .single<Listing>();

  if (e1 || !item) {
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

  // Ambil sampai 6 foto terkait
  const { data: images } = await supabase
    .from('listing_images')
    .select('id,url,created_at')
    .eq('listing_id', idParam)
    .order('created_at', { ascending: true })
    .limit(6) as unknown as { data: ListingImage[] | null };

  const pics = (images || []).map((x) => x.url).filter(Boolean);
  const hero = pics[0] || 'https://via.placeholder.com/1200x800?text=No+Photo';
  const wa = waLink(item.contact_whatsapp);

  return (
    <main style={{ maxWidth: 980, margin: '40px auto' }}>
      <p style={{ marginBottom: 16 }}>
        <Link href="/listings">← Kembali ke Listings</Link>
      </p>

      <div style={{ display: 'grid', gap: 20, gridTemplateColumns: '2fr 1fr' }}>
        {/* LEFT: Gambar + info */}
        <section>
          {/* Hero image */}
          <div style={{ aspectRatio: '3/2', background: '#f3f4f6', borderRadius: 12, overflow: 'hidden' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={hero}
              alt={item.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>

          {/* Thumbnails */}
          {pics.length > 1 && (
            <div
              style={{
                marginTop: 10,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                gap: 8,
              }}
            >
              {pics.slice(1).map((src, i) => (
                <div key={i} style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={`foto-${i + 2}`}
                    style={{ width: '100%', height: 100, objectFit: 'cover', display: 'block' }}
                  />
                </div>
              ))}
            </div>
          )}

          <h1 style={{ fontSize: 28, fontWeight: 800, margin: '14px 0 6px' }}>{item.title}</h1>
          <p style={{ color: '#4b5563', margin: 0 }}>
            {(item.brand || '—')} {item.year ? `• ${item.year}` : ''} {item.location ? `• ${item.location}` : ''}
          </p>

          <p style={{ fontSize: 22, fontWeight: 800, marginTop: 10 }}>{toRupiah(item.price)}</p>

          {item.description && (
            <div style={{ marginTop: 12, whiteSpace: 'pre-wrap' }}>
              {item.description}
            </div>
          )}
        </section>

        {/* RIGHT: Kontak */}
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
