// app/sell/page.tsx
'use client';

import { useState, useRef } from 'react';
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
  const r = useRouter();
  const [form, setForm] = useState<FormState>({
    title: '',
    brand: '',
    year: '',
    price: '',
    location: '',
    description: '',
    whatsapp: '',
  });

  const [images, setImages] = useState<File[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const videoProbe = useRef<HTMLVideoElement | null>(null);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(s => ({ ...s, [e.target.name]: e.target.value }));
  };

  // Cek durasi video <= 180 detik saat user pilih file
  const onPickVideo = async (f: File | null) => {
    setVideo(null);
    if (!f) return;

    // Batasi tipe
    const okType = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v'];
    if (!okType.includes(f.type)) {
      alert('Format video harus mp4 / webm / mov / m4v');
      return;
    }

    // Cek durasi
    const url = URL.createObjectURL(f);
    const probe = document.createElement('video');
    videoProbe.current = probe;
    const duration = await new Promise<number>((resolve, reject) => {
      probe.preload = 'metadata';
      probe.onloadedmetadata = () => {
        resolve(probe.duration || 0);
        URL.revokeObjectURL(url);
      };
      probe.onerror = () => {
        reject(new Error('Gagal membaca metadata video'));
        URL.revokeObjectURL(url);
      };
      probe.src = url;
    }).catch(() => 0);

    if (!duration) {
      alert('Tidak bisa membaca durasi video. Coba file lain.');
      return;
    }
    if (duration > 180) {
      alert('Durasi video maksimal 3 menit (180 detik).');
      return;
    }

    setVideo(f);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      // 1) Insert listing untuk dapatkan ID
      const { data: inserted, error: insErr } = await supabase
        .from('listings')
        .insert({
          title: form.title || null,
          brand: form.brand || null,
          year: form.year ? Number(form.year) : null,
          price: form.price ? Number(form.price) : null,
          location: form.location || null,
          description: form.description || null,
          whatsapp: form.whatsapp || null,
        })
        .select('id')
        .single();

      if (insErr || !inserted?.id) {
        console.error(insErr);
        alert('Gagal menyimpan listing.');
        setLoading(false);
        return;
      }

      const listingId: string = inserted.id;

      // 2) Upload FOTO (opsional)
      if (images.length) {
        for (const f of images) {
          // nama file unik
          const filename = `${Date.now()}-${f.name}`.replace(/\s+/g, '-');
          const { error: upErr } = await supabase
            .storage
            .from('Listing_image') // kamu pakai bucket ini; jika berbeda, sesuaikan
            .upload(`${listingId}/${filename}`, f, {
              cacheControl: '3600',
              upsert: true,
            });
          if (upErr) {
            console.warn('Upload foto gagal:', upErr.message);
          }
        }
      }

      // 3) Upload VIDEO (opsional)
      if (video) {
        const vname = `${Date.now()}-${video.name}`.replace(/\s+/g, '-');
        const { error: vErr } = await supabase
          .storage
          .from('listing-videos') // bucket video
          .upload(`${listingId}/${vname}`, video, {
            cacheControl: '3600',
            upsert: true,
          });
        if (vErr) {
          console.warn('Upload video gagal:', vErr.message);
          alert('Upload video gagal. Coba lagi atau pakai file lain.');
        }
      }

      // 4) Beres → ke halaman detail
      r.push(`/listings/${listingId}`);
    } catch (err: any) {
      console.error(err);
      alert('Terjadi kesalahan tak terduga.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: 720, margin: '40px auto', padding: '0 16px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>Jual Unit</h1>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
        <div>
          <label>Judul</label>
          <input
            name="title"
            value={form.title}
            onChange={onChange}
            placeholder="Contoh: Yamaha Fazio 125 2023"
            required
            style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 8 }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label>Merk</label>
            <input
              name="brand"
              value={form.brand}
              onChange={onChange}
              placeholder="Yamaha / Honda / dll"
              style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 8 }}
            />
          </div>
          <div>
            <label>Tahun</label>
            <input
              name="year"
              value={form.year}
              onChange={onChange}
              inputMode="numeric"
              placeholder="2022"
              style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 8 }}
            />
          </div>
        </div>

        <div>
          <label>Harga (Rp)</label>
          <input
            name="price"
            value={form.price}
            onChange={onChange}
            inputMode="numeric"
            placeholder="15000000"
            style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 8 }}
          />
        </div>

        <div>
          <label>Lokasi</label>
          <input
            name="location"
            value={form.location}
            onChange={onChange}
            placeholder="Jakarta Selatan"
            style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 8 }}
          />
        </div>

        <div>
          <label>WhatsApp</label>
          <input
            name="whatsapp"
            value={form.whatsapp}
            onChange={onChange}
            placeholder="08xxxxxxxxxx"
            style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 8 }}
          />
        </div>

        <div>
          <label>Deskripsi</label>
          <textarea
            name="description"
            value={form.description}
            onChange={onChange}
            rows={4}
            placeholder="Kondisi mulus, pajak panjang, tangan pertama…"
            style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 8 }}
          />
        </div>

        <div>
          <label>Foto Unit (boleh beberapa)</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setImages(Array.from(e.target.files || []))}
          />
        </div>

        <div>
          <label>Video Unit (maks 3 menit, mp4/webm/mov/m4v)</label>
          <input
            type="file"
            accept="video/mp4,video/webm,video/quicktime,video/x-m4v"
            onChange={(e) => onPickVideo((e.target.files && e.target.files[0]) || null)}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '10px 14px',
            borderRadius: 10,
            border: '1px solid #111827',
            background: loading ? '#e5e7eb' : '#111827',
            color: '#fff',
            fontWeight: 700,
          }}
        >
          {loading ? 'Menyimpan…' : 'Terbitkan Listing'}
        </button>
      </form>
    </main>
  );
}
