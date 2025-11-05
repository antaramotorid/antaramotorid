'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function SellPage() {
  const r = useRouter();
  const [form, setForm] = useState({
    title: '',
    brand: '',
    year: '',
    price: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);

    const payload = {
      title: form.title.trim(),
      brand: form.brand.trim(),
      year: Number(form.year),
      price: Number(form.price),
    };

    // validasi sederhana
    if (!payload.title || !payload.brand || !payload.year || !payload.price) {
      setSubmitting(false);
      setErrorMsg('Lengkapi semua field.');
      return;
    }

    const { error } = await supabase.from('listings').insert(payload);

    setSubmitting(false);
    if (error) {
      setErrorMsg(error.message);
      return;
    }

    // sukses → kembali ke home
    r.push('/');
  };

  return (
    <main className="p-6 max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">Jual Motor</h1>

      <form onSubmit={onSubmit} className="space-y-3">
        <input
          className="border rounded p-2 w-full"
          placeholder="Judul (contoh: Beat 2019)"
          name="title"
          value={form.title}
          onChange={onChange}
          required
        />
        <input
          className="border rounded p-2 w-full"
          placeholder="Brand (Honda/Yamaha/...)"
          name="brand"
          value={form.brand}
          onChange={onChange}
          required
        />
        <input
          className="border rounded p-2 w-full"
          type="number"
          placeholder="Tahun"
          name="year"
          value={form.year}
          onChange={onChange}
          required
        />
        <input
          className="border rounded p-2 w-full"
          type="number"
          placeholder="Harga (Rp)"
          name="price"
          value={form.price}
          onChange={onChange}
          required
        />

        {errorMsg && <div className="text-red-600 text-sm">{errorMsg}</div>}

        <button
          type="submit"
          disabled={submitting}
          className="bg-black text-white rounded px-4 py-2"
        >
          {submitting ? 'Menyimpan…' : 'Simpan'}
        </button>
      </form>
    </main>
  );
}
