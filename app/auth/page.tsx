'use client';

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
