// app/listings/[id]/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../../lib/supabaseClient';

type Listing = {
  id: string;
  title: string;
  brand: string | null;
  year: number | null;
  price: number | null;
  location: string | null;
  description: string | null;
  contact_whatsapp: string | null;
};

type ImgRow = {
  id: string | number;
  file_path?: string | null;
  url?: string | null;
  created_at: string | null;
};

function toRupiah(n?: number | null) {
  if (typeof n !== 'number') return '—';
  return n.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
}

function buildSrc(x?: ImgRow) {
  if (!x) return '';
  if (x.url && x.url.startsWith('http')) return x.url; // sudah public url
  if (x.file_path) {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return `${base}/storage/v1/object/public/listing-images/${x.file_path}`;
  }
  return '';
}

export default function ListingDetailPage({ params }: { params: { id: string } }) {
  const [item, setItem] = useState<Listing | null>(null);
  const [images, setImages] = useState<ImgRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);

      const { data: l } = await supabase
        .from('listings')
        .select('id,title,brand,year,price,location,description,contact_whatsapp')
        .eq('id', params.id)
        .maybeSingle();

      const { data: imgs } = await supabase
        .from('listing_images')
        .select('id,file_path,url,created_at')
        .eq('listing_id', params.id)
        .order('created_at', { ascending: true });

      setItem((l as Listing) || null);
      setImages((imgs as ImgRow[]) || []);
      setLoading(false);
    })();
  }, [params.id]);

  const srcs = useMemo(() => images.map(buildSrc).filter(Boolean), [images]);
  const hero = srcs[0] || 'https://via.placeholder.com/1200x800?text=No+Photo';

  if (loading) {
    return <main style={{ maxWidth: 980, margin: '40px auto' }}>Memuat…</main>;
  }

  if (!item) {
    return (
      <main style={{ maxWidth: 980, margin: '40px auto' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>Tidak ditemukan</h1>
        <p>ID: <code>{params.id}</code></p>
        <p><Link href="/listings">← Kembali ke Listings</Link></p>
      </main>
    );
  }

  const wa = item.contact_whatsapp?.replace(/\D/g, '');

  return (
    <main style={{ maxWidth: 980, margin: '40px auto' }}>
      <p style={{ marginBottom: 16 }}>
        <Link href="/listings">← Kembali ke Listings</Link>
      </p>

      <div style={{ display: 'grid', gap: 20, gridTemplateColumns: '2fr 1fr' }}>
        {/* LEFT */}
        <section>
          <div style={{ aspectRatio: '3/2', background: '#f3f4f6', borderRadius: 12, overflow: 'hidden' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={hero} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>

          {srcs.length > 1 && (
            <div style={{ marginTop: 10, display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fill,minmax(120px,1fr))' }}>
              {srcs.slice(1).map((s, i) => (
                <div key={i} style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s} alt={`foto-${i + 2}`} style={{ width: '100%', height: 100, objectFit: 'cover', display: 'block' }} />
                </div>
              ))}
            </div>
          )}

          <h1 style={{ fontSize: 28, fontWeight: 800, margin: '14px 0 6px' }}>{item.title}</h1>
          <p style={{ color: '#4b5563', margin: 0 }}>
            {(item.brand || '—')} {item.year ? `• ${item.year}` : ''} {item.location ? `• ${item.location}` : ''}
          </p>
          <p style={{ fontSize: 22, fontWeight: 800, marginTop: 10 }}>{toRupiah(item.price)}</p>
          {item.description && <div style={{ marginTop: 12, whiteSpace: 'pre-wrap' }}>{item.description}</div>}
        </section>

        {/* RIGHT */}
        <aside style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 14, height: 'fit-content' }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Hubungi Penjual</div>
          {wa ? (
            <a
              href={`https://wa.me/${wa}`}
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
