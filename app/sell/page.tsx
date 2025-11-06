'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function SellPage() {
  const [title, setTitle] = useState('');
  const [brand, setBrand] = useState('');
  const [year, setYear] = useState<number | ''>('');
  const [price, setPrice] = useState<number | ''>('');
  const [location, setLocation] = useState('');
  const [contactWhatsapp, setContactWhatsapp] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !brand || !year || !price) {
      alert('Judul, merek, tahun, dan harga wajib diisi.');
      return;
    }

    setLoading(true);
    const cleanWa = contactWhatsapp ? contactWhatsapp.replace(/\D/g, '') : null;

    const { error } = await supabase.from('listings').insert({
      title,
      brand,
      year: Number(year),
      price: Number(price),
      location: location || null,
      contact_whatsapp: cleanWa, // <- pakai nama kolom di DB
      description: description || null,
      image_url: imageUrl || null,
    });

    setLoading(false);

    if (error) {
      alert(`Gagal menyimpan: ${error.message}`);
      return;
    }

    alert('Listing disimpan! Buka /listings untuk melihatnya.');
    setTitle('');
    setBrand('');
    setYear('');
    setPrice('');
    setLocation('');
    setContactWhatsapp('');
    setDescription('');
    setImageUrl('');
  };

  return (
    <main style={{ maxWidth: 560, margin: '40px auto' }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 16 }}>Jual Motor</h1>

      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Judul *</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required style={{ padding: 10, border: '1px solid #ddd', borderRadius: 8 }} />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span>Merek *</span>
          <input value={brand} onChange={(e) => setBrand(e.target.value)} required style={{ padding: 10, border: '1px solid #ddd', borderRadius: 8 }} />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span>Tahun *</span>
          <input type="number" value={year} onChange={(e) => setYear(e.target.value === '' ? '' : Number(e.target.value))} required style={{ padding: 10, border: '1px solid #ddd', borderRadius: 8 }} />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span>Harga (Rp) *</span>
          <input type="number" value={price} onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))} required style={{ padding: 10, border: '1px solid #ddd', borderRadius: 8 }} />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span>Lokasi</span>
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="contoh: Jakarta Timur" style={{ padding: 10, border: '1px solid #ddd', borderRadius: 8 }} />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span>No WhatsApp</span>
          <input value={contactWhatsapp} onChange={(e) => setContactWhatsapp(e.target.value)} placeholder="contoh: 081234567890" style={{ padding: 10, border: '1px solid #ddd', borderRadius: 8 }} />
          <small style={{ color: '#6b7280' }}>Hanya angka, tanpa +, tanpa spasi. Otomatis dikonversi ke 62.</small>
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span>Deskripsi</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} style={{ padding: 10, border: '1px solid #ddd', borderRadius: 8 }} />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span>Link Foto (opsional)</span>
          <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." style={{ padding: 10, border: '1px solid #ddd', borderRadius: 8 }} />
        </label>

        <button type="submit" disabled={loading} style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #111827' }}>
          {loading ? 'Menyimpan…' : 'Simpan'}
        </button>
      </form>
    </main>
  );
}
