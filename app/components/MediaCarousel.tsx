'use client';

import React, { useRef } from 'react';

export default function MediaCarousel({
  videoUrls,
  images,
}: {
  videoUrls: string[];
  images: string[];
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const scrollByPage = (dir: 'left' | 'right') => {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = dir === 'left' ? -el.clientWidth : el.clientWidth;
    el.scrollBy({ left: amount, behavior: 'smooth' });
  };

  const hasVideo = videoUrls && videoUrls.length > 0;
  const firstVideo = hasVideo ? videoUrls[0] : null;

  // Susunan: [video pertama (jika ada), ...images]
  return (
    <div style={{ position: 'relative', marginTop: 12 }}>
      {/* Panah kiri (tebal, selalu tampil) */}
      <button
        aria-label="Sebelumnya"
        onClick={() => scrollByPage('left')}
        style={{
          position: 'absolute',
          left: 8,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 5,
          width: 44,
          height: 44,
          borderRadius: 999,
          border: 'none',
          background: '#111',
          color: '#fff',
          boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
          cursor: 'pointer',
          opacity: 0.95,
        }}
      >
        ‹
      </button>

      {/* Panah kanan */}
      <button
        aria-label="Berikutnya"
        onClick={() => scrollByPage('right')}
        style={{
          position: 'absolute',
          right: 8,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 5,
          width: 44,
          height: 44,
          borderRadius: 999,
          border: 'none',
          background: '#111',
          color: '#fff',
          boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
          cursor: 'pointer',
          opacity: 0.95,
        }}
      >
        ›
      </button>

      {/* Track: tetap support touch swipe + scroll-snap */}
      <div
        ref={scrollerRef}
        style={{
          overflowX: 'auto',
          display: 'flex',
          gap: 10,
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          borderRadius: 12,
        }}
      >
        {/* Slide 1: Video (jika ada) */}
        {firstVideo && (
          <div
            style={{
              flex: '0 0 100%',
              scrollSnapAlign: 'center',
              borderRadius: 12,
              overflow: 'hidden',
              background: '#000',
            }}
          >
            <video
              key={firstVideo}
              src={firstVideo}
              autoPlay
              muted
              loop
              controls
              style={{ width: '100%', height: 520, objectFit: 'cover', display: 'block' }}
            />
          </div>
        )}

        {/* Slide berikutnya: Foto-foto */}
        {images.map((url, i) => (
          <a
            key={i}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            title="Klik untuk buka ukuran besar"
            style={{
              flex: '0 0 100%',
              scrollSnapAlign: 'center',
              display: 'block',
              borderRadius: 12,
              overflow: 'hidden',
              background: '#f3f4f6',
            }}
          >
            <img
              src={url}
              alt={`foto-${i + 1}`}
              style={{ width: '100%', height: 520, objectFit: 'cover', display: 'block' }}
            />
          </a>
        ))}
      </div>
    </div>
  );
}
