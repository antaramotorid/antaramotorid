'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function SellPage() {
  const [title, setTitle] = useState('');
  const [brand, setBrand] = useState('');
  const [year, setYear] = useState('');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.from('listings').insert({
      title,
      brand,
      year: Number(year) || null,
      price: Number(price) || null,
    });

    setLoading(false);

    if (error) { alert(error.message); return; }

    setTitle(''); setBrand(''); setYear(''); setPrice('');
    alert('Listing Disimpan! Buka /listings untuk melihatnya.');
  }

  return (
    <main style={{ maxWidth: 400, margin: '40px auto' }}>
      <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 12 }}>Jual Motor</h1>
      <form onSubmit={submitForm} style={{ display: 'grid', gap: 12 }}>
        <input placeholder="Judul" required value={title} onChange={(e) => setTitle(e.target.value)} />
        <input placeholder="Brand" required value={brand} onChange={(e) => setBrand(e.target.value)} />
        <input placeholder="Tahun (angka)" value={year} onChange={(e) => setYear(e.target.value)} />
        <input placeholder="Harga (angka)" value={price} onChange={(e) => setPrice(e.target.value)} />
        <button type="submit" disabled={loading}>{loading ? 'Menyimpan…' : 'Simpan'}</button>
      </form>
    </main>
  );
}
