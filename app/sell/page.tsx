// app/sell/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

export default function SellPage() {
  const r = useRouter();

  const [title, setTitle] = useState('');
  const [brand, setBrand] = useState('');
  const [year, setYear] = useState<number | ''>('');
  const [price, setPrice] = useState<number | ''>('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [wa, setWa] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    // validasi sederhana
    if (!title || !brand || !year || !price) {
      alert('Judul, merek, tahun, dan harga wajib diisi.');
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from('listings')
      .insert([{
        title,
        brand,
        year: Number(year),
        price: Number(price),
        location,
        description,
        contact_whatsapp: wa,
      }])
      .select('id')
      .single();

    setLoading(false);

    if (error) {
      alert(`Gagal menyimpan: ${error.message}`);
      return;
    }

    alert('Listing tersimpan! Membuka halaman listing…');
    r.push('/listings');
  }

  return (
    <main style={{ maxWidth: 560, margin: '40px auto' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>Jual Motor</h1>

      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
        <label>
          <div>Judul Listing *</div>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 8 }}
          />
        </label>

        <label>
          <div>Merek *</div>
          <input
            type="text"
            required
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            style={{ width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 8 }}
          />
        </label>

        <label>
          <div>Tahun *</div>
          <input
            type="number"
            min={1990}
            max={2099}
            required
            value={year}
            onChange={(e) => setYear(e.target.value ? Number(e.target.value) : '')}
            style={{ width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 8 }}
          />
        </label>

        <label>
          <div>Harga (Rp) *</div>
          <input
            type="number"
            min={0}
            required
            value={price}
            onChange={(e) => setPrice(e.target.value ? Number(e.target.value) : '')}
            style={{ width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 8 }}
          />
        </label>

        <label>
          <div>Lokasi</div>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Kota/Kabupaten"
            style={{ width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 8 }}
          />
        </label>

        <label>
          <div>Deskripsi</div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            style={{ width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 8 }}
          />
        </label>

        <label>
          <div>WhatsApp (opsional)</div>
          <input
            type="text"
            value={wa}
            onChange={(e) => setWa(e.target.value)}
            placeholder="62xxxxxxxxxxx"
            style={{ width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 8 }}
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '12px 16px',
            borderRadius: 10,
            border: '1px solid #ddd',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Menyimpan…' : 'Simpan'}
        </button>
      </form>
    </main>
  );
}
