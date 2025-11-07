// app/sell/page.tsx
'use client';

import { useState, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

type FormState = {
  title: string;
  brand: string;
  year: string;
  price: string;
  location: string;
  description: string;
  whatsapp: string;
};

export default function SellPage() {
  const router = useRouter();

  const [form, setForm] = useState<FormState>({
    title: '',
    brand: '',
    year: '',
    price: '',
    location: '',
    description: '',
    whatsapp: '',
  });

  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<string>('');

  function onChange(
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  }

  function onPickFiles(e: ChangeEvent<HTMLInputElement>) {
    const f = Array.from(e.target.files || []);
    // batasi maksimal 6 file
    const selected = f.slice(0, 6);
    setFiles(selected);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.title || !form.brand || !form.year || !form.price) {
      alert('Judul, Merek, Tahun, dan Harga wajib diisi.');
      return;
    }
    if (files.length === 0) {
      if (!confirm('Belum pilih foto. Lanjut tanpa foto?')) return;
    }
    setSubmitting(true);
    setProgress('Menyimpan listing...');

    // 1) Insert ke tabel listings
    const { data: inserted, error: insertErr } = await supabase
      .from('listings')
      .insert([
        {
          title: form.title.trim(),
          brand: form.brand.trim(),
          year: form.year ? Number(form.year) : null,
          price: form.price ? Number(form.price) : null,
          location: form.location.trim() || null,
          description: form.description.trim() || null,
          whatsapp: form.whatsapp.trim() || null,
        },
      ])
      .select('id')
      .single();

    if (insertErr || !inserted?.id) {
      alert(insertErr?.message || 'Gagal menyimpan listing');
      setSubmitting(false);
      return;
    }

    const listingId = inserted.id as string;

    // 2) Upload semua file (jika ada)
    if (files.length > 0) {
      let idx = 0;
      for (const file of files) {
        idx++;
        setProgress(`Mengunggah foto ${idx}/${files.length}...`);

        // nama file aman: timestamp-index-originalName tanpa spasi
        const safeName = `${Date.now()}-${idx}-${file.name}`
          .replace(/\s+/g, '-')
          .toLowerCase();

        // path di bucket: {listingId}/{safeName}
        const path = `${listingId}/${safeName}`;

        const { error: upErr } = await supabase
          .storage
          .from('listing-images')
          .upload(path, file, { upsert: false });

        if (upErr) {
          alert(`Upload gagal untuk ${file.name}: ${upErr.message}`);
          // lanjut ke file berikutnya; tidak batalkan seluruh proses
          continue;
        }

        // 3) Catat ke tabel listing_images
        const { error: imgErr } = await supabase
          .from('listing_images')
          .insert([{ listing_id: listingId, file_path: path }]);

        if (imgErr) {
          alert(`Gagal mencatat gambar ${file.name}: ${imgErr.message}`);
          // lanjut ke file berikutnya
        }
      }
    }

    setProgress('Selesai. Mengarahkan ke halaman detail...');
    router.push(`/listings/${listingId}`);
  }

  return (
    <main style={{ maxWidth: 820, margin: '32px auto', padding: '0 16px' }}>
      <h1 style={{ fontWeight: 800, fontSize: 28, marginBottom: 16 }}>Jual Motor</h1>

      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 14 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Judul Listing *</span>
          <input
            name="title"
            value={form.title}
            onChange={onChange}
            required
            placeholder="Contoh: Yamaha Fazzio"
            style={{ border: '1px solid #ddd', borderRadius: 8, padding: 10 }}
          />
        </label>

        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr', alignItems: 'start' }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Merek *</span>
            <input
              name="brand"
              value={form.brand}
              onChange={onChange}
              required
              placeholder="honda / yamaha / suzuki"
              style={{ border: '1px solid #ddd', borderRadius: 8, padding: 10 }}
            />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Tahun *</span>
            <input
              name="year"
              value={form.year}
              onChange={onChange}
              required
              inputMode="numeric"
              placeholder="2020"
              style={{ border: '1px solid #ddd', borderRadius: 8, padding: 10 }}
            />
          </label>
        </div>

        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr', alignItems: 'start' }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Harga (Rp) *</span>
            <input
              name="price"
              value={form.price}
              onChange={onChange}
              required
              inputMode="numeric"
              placeholder="19999999"
              style={{ border: '1px solid #ddd', borderRadius: 8, padding: 10 }}
            />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Lokasi</span>
            <input
              name="location"
              value={form.location}
              onChange={onChange}
              placeholder="Kota/Kabupaten"
              style={{ border: '1px solid #ddd', borderRadius: 8, padding: 10 }}
            />
          </label>
        </div>

        <label style={{ display: 'grid', gap: 6 }}>
          <span>Deskripsi</span>
          <textarea
            name="description"
            value={form.description}
            onChange={onChange}
            rows={4}
            placeholder="Kondisi, pajak, KM, dll"
            style={{ border: '1px solid #ddd', borderRadius: 8, padding: 10 }}
          />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span>WhatsApp (opsional)</span>
          <input
            name="whatsapp"
            value={form.whatsapp}
            onChange={onChange}
            placeholder="62xxxxxxxxxxx"
            style={{ border: '1px solid #ddd', borderRadius: 8, padding: 10 }}
          />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span>Foto Unit (maks 6) — bisa pilih banyak sekaligus</span>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={onPickFiles}
          />
          {files.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill,minmax(96px,1fr))',
              gap: 8,
              marginTop: 8
            }}>
              {files.map((f, i) => (
                <div key={i} style={{ border: '1px solid #eee', borderRadius: 8, padding: 6 }}>
                  <div style={{ fontSize: 12, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {f.name}
                  </div>
                  <img
                    src={URL.createObjectURL(f)}
                    alt={f.name}
                    style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 6 }}
                  />
                </div>
              ))}
            </div>
          )}
        </label>

        <button
          type="submit"
          disabled={submitting}
          style={{
            background: '#2563eb',
            color: '#fff',
            border: 0,
            borderRadius: 10,
            padding: '12px 14px',
            fontWeight: 700
          }}
        >
          {submitting ? (progress || 'Menyimpan...') : 'Simpan'}
        </button>
      </form>
    </main>
  );
}
