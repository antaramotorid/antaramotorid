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
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Judul wajib diisi');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('listings')
      .insert([
        {
          title: title.trim(),
          brand: brand.trim() || null,
          year: year === '' ? null : Number(year),
          price: price === '' ? null : Number(price),
        },
      ])
      .select('id')
      .single();

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    if (data?.id) {
      // Redirect ke halaman detail
      r.push(`/listings/${data.id}`);
    } else {
      // Fallback: kembali ke daftar
      r.push('/listings');
    }
  };

  return (
    <main style={{ maxWidth: 520, margin: '40px auto' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>Jual Motor</h1>

      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
        <label>
          <div style={{ marginBottom: 6 }}>Judul</div>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="contoh: Vario 125 2019"
            style={{ width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 8 }}
          />
        </label>

        <label>
          <div style={{ marginBottom: 6 }}>Merek</div>
          <input
            type="text"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="honda / yamaha / suzuki"
            style={{ width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 8 }}
          />
        </label>

        <label>
          <div style={{ marginBottom: 6 }}>Tahun</div>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="2019"
            style={{ width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 8 }}
          />
        </label>

        <label>
          <div style={{ marginBottom: 6 }}>Harga (Rp)</div>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="15000000"
            style={{ width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 8 }}
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '12px 14px',
            border: '1px solid #ddd',
            borderRadius: 10,
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Menyimpan…' : 'Simpan'}
        </button>
      </form>

      <div style={{ marginTop: 16 }}>
        <a href="/listings">← Kembali ke daftar</a>
      </div>
    </main>
  );
}
