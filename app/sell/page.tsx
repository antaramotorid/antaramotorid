'use client';

import { useState } from 'react';

export default function SellPage() {
  const [title, setTitle] = useState('');
  const [brand, setBrand] = useState('');
  const [year, setYear] = useState('');
  const [price, setPrice] = useState('');

  function submitForm(e: React.FormEvent) {
    e.preventDefault();
    alert('Form akan disambungkan ke database setelah build hijau.');
  }

  return (
    <main style={{ maxWidth: 400, margin: '40px auto' }}>
      <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 12 }}>Jual Motor</h1>
      <form onSubmit={submitForm} style={{ display: 'grid', gap: 12 }}>
        <input placeholder="Judul" required value={title} onChange={(e) => setTitle(e.target.value)} />
        <input placeholder="Brand" required value={brand} onChange={(e) => setBrand(e.target.value)} />
        <input placeholder="Tahun" required value={year} onChange={(e) => setYear(e.target.value)} />
        <input placeholder="Harga" required value={price} onChange={(e) => setPrice(e.target.value)} />
        <button type="submit">Simpan</button>
      </form>
    </main>
  );
}
