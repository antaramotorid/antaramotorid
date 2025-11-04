'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function SellPage() {
  const r = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    brand: '',
    year: '',
    price: '',
    location: '',
    description: '',
    contact_whatsapp: '',
  });

  const onChange =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      title: form.title.trim(),
      brand: form.brand.trim(),
      year: Number(form.year || 0),
      price: Number(form.price || 0),
      location: form.location.trim(),
      description: form.description.trim(),
      contact_whatsapp: form.contact_whatsapp.trim(),
      is_published: true,
    };

    const { data, error } = await supabase
      .from('listings')
      .insert(payload)
      .select('id')
      .single();

    setLoading(false);
    if (error) {
      alert(error.message);
      return;
    }
    if (data?.id) r.push(/listings/${data.id});
  };

  return (
    <main>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>Jual Motor</h1>

      <form onSubmit={submit} style={{ display: 'grid', gap: 8, maxWidth: 560 }}>
        <input placeholder="title" required onChange={onChange('title')}
          style={{ border: '1px solid #ddd', borderRadius: 8, padding: 10 }} />
        <input placeholder="brand" required onChange={onChange('brand')}
          style={{ border: '1px solid #ddd', borderRadius: 8, padding: 10 }} />
        <input placeholder="year" type="number" required onChange={onChange('year')}
          style={{ border: '1px solid #ddd', borderRadius: 8, padding: 10 }} />
        <input placeholder="price" type="number" required onChange={onChange('price')}
          style={{ border: '1px solid #ddd', borderRadius: 8, padding: 10 }} />
        <input placeholder="location" required onChange={onChange('location')}
          style={{ border: '1px solid #ddd', borderRadius: 8, padding: 10 }} />
        <input placeholder="contact_whatsapp" required onChange={onChange('contact_whatsapp')}
          style={{ border: '1px solid #ddd', borderRadius: 8, padding: 10 }} />
        <textarea placeholder="description" rows={5} onChange={onChange('description')}
          style={{ border: '1px solid #ddd', borderRadius: 8, padding: 10 }} />
        <button disabled={loading}
          style={{ border: '1px solid #ddd', borderRadius: 8, padding: 10 }}>
          {loading ? 'Menyimpan…' : 'Simpan'}
        </button>
      </form>
    </main>
  );
}
