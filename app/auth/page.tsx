'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

export default function SellPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase
      .from('listings')
      .insert({ title })
      .select('id')
      .single();

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    if (data?.id) router.push(/listings/${data.id});
  }

  return (
    <main style={{ maxWidth: 428 }}>
      <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 8 }}>Jual Motor</h1>

      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 8 }}>
        <input
          type="text"
          required
          placeholder="Judul Listing"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ border: '1px solid #ddd', borderRadius: 8, padding: 10 }}
        />
        <button
          disabled={loading}
          style={{ border: '1px solid #ddd', borderRadius: 8, padding: 10 }}
        >
          {loading ? 'Menyimpan…' : 'Simpan'}
        </button>
      </form>
    </main>
  );
}
