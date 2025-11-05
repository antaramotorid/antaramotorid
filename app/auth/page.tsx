'use client';
import { useState } from 'react';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    alert("Login Supabase belum aktif di tahap ini, nanti kita sambungkan setelah struktur selesai.");
  };

  return (
    <main style={{ maxWidth: 428 }}>
      <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 8 }}>Masuk</h1>
      {sent ? <p>Cek email untuk magic link.</p> : (
        <form onSubmit={login} style={{ display: 'flex', gap: 8 }}>
          <input 
            type="email" 
            required 
            placeholder="email@contoh.com"
            style={{ border: '1px solid #ddd', borderRadius: 8, padding: 10, flex: 1 }}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button style={{ border: '1px solid #ddd', borderRadius: 8, padding: 10 }}>Kirim Link</button>
        </form>
      )}
    </main>
  );
}
