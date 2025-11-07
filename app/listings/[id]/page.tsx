// app/listings/[id]/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../../lib/supabaseClient'; // tanpa alias

type Listing = {
  id: string;
  title: string;
  brand: string | null;
  year: number | null;
  price: number | null;
  location: string | null;
  description: string | null;
  whatsapp: string | null;
  contact_whatsapp?: string | null;
};

function formatPrice(n?: number | null) {
  if (typeof n !== 'number') return '';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
}
function normalizeWa(n: any): string | null {
  if (!n) return null;
  const d = String(n).replace(/\D/g, '');
  if (!d) return null;
  if (d.startsWith('0')) return '62' + d.slice(1);
  return d;
}

export default function ListingDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;

  const [listing, setListing] = useState<Listing | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Carousel state
  const [index, setIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const startX = useRef<number | null>(null);
  const currentTranslate = useRef(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);

      // 1) Ambil listing
      const { data: listingData, error: listingErr } = await supabase
        .from('listings')
        .select('id, title, brand, year, price, location, description, whatsapp, contact_whatsapp')
        .eq('id', id)
        .maybeSingle();

      if (listingErr || !listingData) {
        setListing(null);
        setImages([]);
        setLoading(false);
        return;
      }

      // 2) Ambil daftar file dari TABEL listing_images (BUKAN storage.list)
      const { data: rows, error: imgErr } = await supabase
        .from('listing_images')
        .select('file_path, sort_order')
        .eq('listing_id', id)
        .order('sort_order', { ascending: true, nullsFirst: true })
        .order('file_path', { ascending: true });

      if (imgErr) {
        console.error('listing_images error:', imgErr);
      }

      // 3) Bangun public URL dari bucket yang benar: "Listing_image"
      const urls: string[] = (rows || [])
        .map((r) => {
          const path = (r as any).file_path as string | null;
          if (!path) return null;
          const { data } = supabase.storage.from('Listing_image').getPublicUrl(path);
          return data?.publicUrl || null;
        })
        .filter((u): u is string => !!u);

      if (mounted) {
        const wa = (listingData as any).whatsapp || (listingData as any).contact_whatsapp || null;
        setListing({ ...(listingData as Listing), whatsapp: wa });
        setImages(urls);
        setIndex(0);
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  // Swipe helpers
  const maxIndex = useMemo(() => Math.max(0, images.length - 1), [images.length]);

  const goTo = (i: number) => {
    const clamped = Math.min(Math.max(i, 0), maxIndex);
    setIndex(clamped);
    if (trackRef.current) {
      trackRef.current.style.transition = 'transform 240ms ease';
      trackRef.current.style.transform = `translateX(-${clamped * 100}%)`;
      currentTranslate.current = -clamped * 100;
    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    if (trackRef.current) trackRef.current.style.transition = 'none';
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (startX.current == null || !trackRef.current) return;
    const delta = e.touches[0].clientX - startX.current;
    const percent = (delta / (trackRef.current.clientWidth || 1)) * 100;
    trackRef.current.style.transform = `translateX(${currentTranslate.current + percent}%)`;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (startX.current == null || !trackRef.current) return;
    const delta = e.changedTouches[0].clientX - startX.current;
    const threshold = (trackRef.current.clientWidth || 1) * 0.15;
    if (delta < -threshold) goTo(index + 1);
    else if (delta > threshold) goTo(index - 1);
    else goTo(index);
    startX.current = null;
  };

  // Render
  if (loading) return <main style={{ maxWidth: 980, margin: '40px auto' }}><p>Memuat…</p></main>;
  if (!listing) return <main style={{ maxWidth: 980, margin: '40px auto' }}><p>Tidak ditemukan.</p></main>;

  const waHref = normalizeWa(listing.whatsapp)
    ? `https://wa.me/${normalizeWa(listing.whatsapp)}?text=${encodeURIComponent(`Halo, saya tertarik dengan unit "${listing.title}".`)}`
    : null;

  return (
    <main style={{ maxWidth: 980, margin: '28px auto', padding: '0 12px' }}>
      <Link href="/listings" style={{ display: 'inline-block', marginBottom: 16, color: '#334155' }}>
        ← Kembali ke Listings
      </Link>

      {/* GALLERY - swipe horizontal seperti OLX */}
      <section style={{ marginBottom: 20 }}>
        <div
          style={{
            borderRadius: 14,
            overflow: 'hidden',
            background: '#f1f5f9',
            width: '100%',
            aspectRatio: '16/9',
            position: 'relative',
          }}
        >
          <div
            ref={trackRef}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            style={{
              display: 'flex',
              width: `${(images.length || 1) * 100}%`,
              height: '100%',
              transform: `translateX(-${index * 100}%)`,
              transition: 'transform 240ms ease',
            }}
          >
            {(images.length ? images : ['/no-image.png']).map((src, i) => (
              <div key={i} style={{ flex: '0 0 100%', height: '100%' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={listing.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>
            ))}
          </div>

          {/* Dots */}
          {images.length > 1 && (
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 8,
                display: 'flex',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  aria-label={`goto ${i + 1}`}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    border: 'none',
                    background: i === index ? '#0ea5e9' : '#cbd5e1',
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Thumbnails bar */}
        {images.length > 1 && (
          <div
            style={{
              marginTop: 10,
              display: 'grid',
              gridAutoFlow: 'column',
              gap: 8,
              overflowX: 'auto',
              paddingBottom: 4,
            }}
          >
            {images.map((src, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                style={{
                  border: i === index ? '2px solid #0ea5e9' : '2px solid transparent',
                  borderRadius: 10,
                  padding: 0,
                  width: 82,
                  height: 62,
                  overflow: 'hidden',
                  background: '#f8fafc',
                  cursor: 'pointer',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`thumb-${i + 1}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </button>
            ))}
          </div>
        )}
      </section>

      {/* INFO */}
      <section style={{ display: 'grid', gap: 10 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0 }}>{listing.title}</h1>
        <p style={{ margin: 0, color: '#64748b' }}>
          {listing.brand || '-'} • {listing.year ?? '-'}{listing.location ? ` • ${listing.location}` : ''}
        </p>
        {typeof listing.price === 'number' && (
          <p style={{ margin: '6px 0 0', fontSize: 22, fontWeight: 800 }}>{formatPrice(listing.price)}</p>
        )}

        {waHref && (
          <div style={{ marginTop: 6 }}>
            <a
              href={waHref}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-block',
                padding: '8px 14px',
                border: '1px solid #22c55e',
                color: '#16a34a',
                borderRadius: 999,
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              Chat via WhatsApp
            </a>
          </div>
        )}

        {listing.description && (
          <>
            <h3 style={{ marginTop: 18, marginBottom: 8 }}>Deskripsi</h3>
            <p style={{ whiteSpace: 'pre-line', marginTop: 0 }}>{listing.description}</p>
          </>
        )}
      </section>
    </main>
  );
}
