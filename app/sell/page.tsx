'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function SellPage() {
  const r = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '', brand: '', year: 0, price: 0, location: '',
    description: '', contact_whatsapp: ''
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.from('listings').insert({
      title: form.title, brand: form.brand, year: Number(form.year), price: Number(form.price),
      location: form.location, description: form.description, contact_whatsapp: form.contact_whatsapp
    }).select('id').single();
    setLoading(false);
    if (!error && data) r.push(/listings/${data.id});
  };

  return (
    <main>
      <h1 style={{fontSize:20, fontWeight:600, marginBottom:12}}>Jual Motor</h1>
      <form onSubmit={submit} style={{display:'grid', gap:8, maxWidth:560}}>
        {['title','brand','year','price','location','contact_whatsapp'].map((k) => (
          <input key={k} required placeholder={k}
            style={{border:'1px solid #ddd', borderRadius:8, padding:10}}
            onChange={(e)=>setForm({...form,[k]: (k==='year'||k==='price') ? Number(e.target.value) : e.target.value})} />
        ))}
        <textarea placeholder="description" rows={5}
          style={{border:'1px solid #ddd', borderRadius:8, padding:10}}
          onChange={(e)=>setForm({...form, description: e.target.value})} />
        <button disabled={loading} style={{border:'1px solid #ddd', borderRadius:8, padding:10}}>
          {loading? 'Menyimpan…' : 'Simpan'}
        </button>
      </form>
    </main>
  );
}
