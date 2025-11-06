// app/sell/page.tsx
'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

type Form = {
  title: string;
  brand: string;
  year: string;      // input text -> nanti di-number-kan
  price: string;     // input text -> nanti di-number-kan
  location: string;
  description: string;
  contact_whatsapp: string;
};

export default function SellPage() {
  const [form, setForm] = useState<Form>({
    title: '',
    brand: '',
    year: '',
    price: '',
    location: '',
    description: '',
    contact_whatsapp: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    if (!form.title) return alert('Judul wajib diisi');
    if (!form.brand) return alert('Merek wajib diisi');

    setSaving(true);

    // 1) Insert listing -> dapat ID (uuid)
    const { data: inserted, error: e1 } = await supabase
      .from('listings')
      .insert({
        title: form.title,
        brand: form.brand,
        year: form.year ? Number(form.year) : null,
        price: form.price ? Number(form.price) : null,
        location: form.location || null,
        description: form.description || null,
        contact_whatsapp: form.contact_whatsapp || null,
      })
      .select('id')
      .single();

    if (e1 || !inserted) {
      setSaving(false);
      return alert(`Gagal simpan listing: ${e1?.message || 'unknown'}`);
    }

    const listingId = inserted.id as string;

    // 2) Kalau ada file -> upload ke storage lalu simpan ke listing_images
    if (file) {
      const bucket = 'listing-images'; // pastikan nama bucket persis ini
      const path = `${listingId}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;

      // upload
      const { error: upErr } = await supabase.storage
        .from(bucket)
        .upload(path, file, { cacheControl: '3600', upsert: false });

      if (upErr) {
        setSaving(false);
        return alert(`Gagal upload gambar: ${upErr.message}`);
      }

      // ambil public URL
      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
      const publicUrl = pub?.publicUrl;

      if (publicUrl) {
        const { error: e2 } = await supabase
          .from('listing_images')
          .insert({ listing_id: listingId, url: publicUrl });

        if (e2) {
          setSaving(false);
          return alert(`Gagal simpan URL gambar: ${e2.message}`);
        }
      }
    }

    setSaving(false);
    alert('Listing disimpan! Buka /listings untuk melihatnya.');
    // reset form
    setForm({
      title: '',
      brand: '',
      year: '',
      price: '',
      location: '',
      description: '',
      contact_whatsapp: '',
    });
    setFile(null);
  }

  return (
    <main style={{ maxWidth: 720, margin: '40px auto' }}>
      <h1 style={{ fontWeight: 800, fontSize: 24, marginBottom: 16 }}>Jual Motor</h1>

      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
        <label>
          Judul Listing *
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            required
            placeholder="contoh: vario 150 kondisi istimewa"
            style={{ width: '100%', padding: 10, border: '1px solid #e5e7eb', borderRadius: 8 }}
          />
        </label>

        <label>
          Merek *
          <input
            name="brand"
            value={form.brand}
            onChange={handleChange}
            required
            placeholder="honda / yamaha / suzuki ..."
            style={{ width: '100%', padding: 10, border: '1px solid #e5e7eb', borderRadius: 8 }}
          />
        </label>

        <label>
          Tahun
          <input
            name="year"
            value={form.year}
            onChange={handleChange}
            inputMode="numeric"
            placeholder="2019"
            style={{ width: '100%', padding: 10, border: '1px solid #e5e7eb', borderRadius: 8 }}
          />
        </label>

        <label>
          Harga (Rp)
          <input
            name="price"
            value={form.price}
            onChange={handleChange}
            inputMode="numeric"
            placeholder="10000000"
            style={{ width: '100%', padding: 10, border: '1px solid #e5e7eb', borderRadius: 8 }}
          />
        </label>

        <label>
          Lokasi
          <input
            name="location"
            value={form.location}
            onChange={handleChange}
            placeholder="jakarta timur"
            style={{ width: '100%', padding: 10, border: '1px solid #e5e7eb', borderRadius: 8 }}
          />
        </label>

        <label>
          WhatsApp (opsional)
          <input
            name="contact_whatsapp"
            value={form.contact_whatsapp}
            onChange={handleChange}
            placeholder="08xxxxxxxxxx"
            style={{ width: '100%', padding: 10, border: '1px solid #e5e7eb', borderRadius: 8 }}
          />
        </label>

        <label>
          Deskripsi
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={4}
            placeholder="kondisi, pajak, kilometer, dll"
            style={{ width: '100%', padding: 10, border: '1px solid #e5e7eb', borderRadius: 8 }}
          />
        </label>

        <label>
          Foto utama
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>

        <button
          type="submit"
          disabled={saving}
          style={{
            padding: '10px 14px',
            background: '#111827',
            color: '#fff',
            borderRadius: 8,
            fontWeight: 700,
            border: 0,
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? 'Menyimpan...' : 'Simpan'}
        </button>
      </form>
    </main>
  );
}
