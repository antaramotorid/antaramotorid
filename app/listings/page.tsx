[04.31, 6/11/2025] BENGKEL ANTARA MOTOR: 'use client';

import { useState } from 'react';

export default function AuthPage() {
  const [email, setEmail] = useState('');

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    alert('Auth akan diaktifkan setelah build sudah hijau.');
  }

  return (
    <main style={{ maxWidth: 428, margin: '40px auto' }}>
      <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 12 }}>Masuk</h1>
      <form onSubmit={onSubmit} style={{ display: 'flex', gap: 8 }}>
        <input
          type="email"
          required
          placeholder="email@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ border: '1px solid #ccc', padding: 10, flex: 1, borderRadius: 8 }}
        />
        <button type="submit" style={{ border: '1px solid #000', borderRadius: 8, padding: 10 }}>
          Kirim
        </button>
      </form>
    </main>
  );
}
[04.33, 6/11/2025] BENGKEL ANTARA MOTOR: 'use client';

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
[04.34, 6/11/2025] BENGKEL ANTARA MOTOR: export default function ListingsPage() {
  const listings: Array<{ id: number; title: string }> = [];

  return (
    <main style={{ maxWidth: 800, margin: '40px auto' }}>
      <h1 style={{ fontWeight: 600, fontSize: 22, marginBottom: 20 }}>
        Listing Terbaru
      </h1>

      {listings.length === 0 ? (
        <p>Tidak ada data (akan disambungkan ke database setelah build hijau).</p>
      ) : (
        <ul style={{ display: 'grid', gap: 18, gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))' }}>
          {listings.map((l) => (
            <li key={l.id} style={{ border: '1px solid #ddd', padding: 12, borderRadius: 8 }}>
              <a href={/listings/${l.id}} style={{ textDecoration: 'none', color: 'black' }}>
                {l.title}
              </a>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
