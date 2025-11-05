'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) {
      alert(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <main style={{ maxWidth: 428, margin: '40px auto' }}>
      <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 12 }}>Masuk</h1>
      {sent ? (
        <p>Cek email untuk magic link.</p>
      ) : (
        <form onSubmit={login} style={{ display: 'flex', gap: 8 }}>
          <input
            type="email"
            required
            placeholder="email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ border: '1px solid #ccc', padding: 10, flex: 1, borderRadius: 8 }}
          />
          <button type="submit" style={{ border: '1px solid #000', borderRadius: 8, padding: 10 }}>
            Login
          </button>
        </form>
      )}
    </main>
  );
}
