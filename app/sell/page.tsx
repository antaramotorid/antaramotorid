// app/sell/page.tsx
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

type NewListing = {
  title: string;
  brand: string;
  year: number | '';
  price: number | '';
  location: string;
  description: string;
  contact_whatsapp: string;
};

export default function SellPage() {
  const r = useRouter();
  const [form, setForm] = useState<NewListing>({
    title: '',
    brand: '',
    year: '',
    price: '',
    location: '',
    description: '',
    contact_whatsapp: '',
  });
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  const previews = useMemo(() => files.map(f => URL.createObjectURL(f)), [files]);

  const onChange =
    (k: keyof NewListing) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const v = e.target.value;
      setForm(s => ({
        ...s,
        [k]:
          k === 'year' || k === 'price'
            ? (v === '' ? '' : Number(v))
            : v,
      }));
    };

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files ? Array.from(e.target.files) : [];
    // batasi maksimal 6
    const imgs = picked.slice(0, 6).filter(f => f.type.startsWith('image/'));
    setFiles(imgs);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.brand || form.year === '' || form.price === '') {
      alert('Judul, Merek, Tahun, dan Harga wajib diisi.');
      return;
    }
    if (files.length === 0) {
      const ok = confirm('Kamu belum memilih foto. Lanjut tanpa foto?');
      if (!ok) return;
    }

    setLoading(true);

    try {
      // 1) Simpan listing utamanya
      const { data: listing, error: insErr } = await supabase
        .from('listings')
        .insert({
          title: form.title,
          brand: form.brand,
          year: form.year === '' ? null : Number(form.year),
          price: form.price === '' ? null : Number(form.price),
          location: form.location || null,
          description: form.description || null,
          contact_whatsapp: form.contact_whatsapp || null,
        })
        .select('id')
        .single();

      if (insErr) throw insErr;
      if (!listing?.id) throw new Error('Gagal mendapatkan ID listing.');

      const listingId = listing.id as number;

      // 2) Upload hingga 6 gambar (ke bucket: listing-images)
      for (let i = 0; i < Math.min(files.length, 6); i++) {
        const file = files[i];
        const ext = file.name.split('.').pop() || 'jpg';
        const fileName = `${Date.now()}-${i}.${ext}`;
        const path = `${listingId}/${fileName}`;

        const { error: upErr } = await supabase
          .storage
          .from('listing-images')
          .upload(path, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type,
          });

        if (upErr) {
          console.error('Upload gagal:', upErr);
          // lanjut ke foto berikutnya, tapi kita log error
          continue;
        }

        const { data: pub } = supabase
          .storage
          .from('listing-images')
          .getPublicUrl(path);

        const publicUrl = pub.publicUrl;

        // 3) Simpan URL ke tabel listing_images
        const { error: imgErr } = await supabase
          .from('listing_images')
          .insert({
            listing_id: listingId, // <-- integer FK ke listings.id
            url: publicUrl,
          });

        if (imgErr) {
          console.error('Simpan URL gagal:', imgErr);
          // tidak menghentikan proses keseluruhan
        }
      }

      alert('Listing disimpan! Membuka halaman detail…');
      r.push(`/listings/${listingId}`);
    } catch (err: any) {
      console.error(err);
      alert(`Gagal menyimpan: ${err?.message || err}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 760, margin: '40px auto', padding: 16 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 18 }}>Jual Motor</h1>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Judul Listing *</span>
          <input
            value={form.title}
            onChange={onChange('title')}
            placeholder="contoh: Vario 150 kondisi istimewa"
            required
            style={inputStyle}
          />
        </label>

        <div style={{ display: 'grid', gap: 14, gridTemplateColumns: '1fr 1fr' }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Merek *</span>
            <input
              value={form.brand}
              onChange={onChange('brand')}
              placeholder="honda / yamaha / suzuki"
              required
              style={inputStyle}
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span>Tahun *</span>
            <input
              type="number"
              value={form.year}
              onChange={onChange('year')}
              placeholder="2019"
              required
              style={inputStyle}
            />
          </label>
        </div>

        <div style={{ display: 'grid', gap: 14, gridTemplateColumns: '1fr 1fr' }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Harga (Rp) *</span>
            <input
              type="number"
              value={form.price}
              onChange={onChange('price')}
              placeholder="10000000"
              required
              style={inputStyle}
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span>Lokasi</span>
            <input
              value={form.location}
              onChange={onChange('location')}
              placeholder="Kota/Kabupaten"
              style={inputStyle}
            />
          </label>
        </div>

        <label style={{ display: 'grid', gap: 6 }}>
          <span>Deskripsi</span>
          <textarea
            value={form.description}
            onChange={onChange('description')}
            placeholder="Kondisi bagus, pajak hidup, servis rutin…"
            rows={4}
            style={textareaStyle}
          />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span>WhatsApp (opsional)</span>
          <input
            value={form.contact_whatsapp}
            onChange={onChange('contact_whatsapp')}
            placeholder="62xxxxxxxxxx"
            style={inputStyle}
          />
        </label>

        <div style={{ display: 'grid', gap: 8 }}>
          <span>Foto (maksimal 6 gambar)</span>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={onPickFiles}
          />
          {files.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
              {previews.map((src, i) => (
                <div key={i} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 6 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`preview-${i}`} style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 6 }} />
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            border: '1px solid #000',
            background: '#000',
            color: '#fff',
            padding: '12px 16px',
            borderRadius: 8,
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Menyimpan…' : 'Simpan'}
        </button>
      </form>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  border: '1px solid #ccc',
  padding: '10px 12px',
  borderRadius: 8,
  outline: 'none',
};

const textareaStyle: React.CSSProperties = {
  border: '1px solid #ccc',
  padding: '10px 12px',
  borderRadius: 8,
  outline: 'none',
};
