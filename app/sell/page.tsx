// app/sell/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

type FormState = {
  title: string;
  brand: string;
  year: string;        // disimpan sebagai string lalu di-Number saat insert
  price: string;       // disimpan sebagai string lalu di-Number saat insert
  location: string;
  description: string;
  whatsapp: string;

  // >>> Tambahan baru
  mileage_km: string;  // number (pakai input type="number"), di-Number saat insert
  color: string;       // text
  unit_type: string;   // text
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

    // >>> Tambahan baru
    mileage_km: '',
    color: '',
    unit_type: '',
  });

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [videoFiles, setVideoFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const onChange = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    setErrorMsg(null);
    setSubmitting(true);

    try {
      // Validasi ringan
      if (!form.title.trim()) throw new Error('Judul wajib diisi.');
      if (!form.brand.trim()) throw new Error('Merk/Brand wajib diisi.');

      // Normalisasi angka
      const yearNum = form.year ? Number(form.year) : null;
      const priceNum = form.price ? Number(form.price) : null;
      const mileageNum = form.mileage_km ? Number(form.mileage_km) : null;

      // Insert listing dulu
      const { data: inserted, error: insertErr } = await supabase
        .from('listings')
        .insert([{
          title: form.title || null,
          brand: form.brand || null,
          year: Number.isFinite(yearNum) ? yearNum : null,
          price: Number.isFinite(priceNum) ? priceNum : null,
          location: form.location || null,
          description: form.description || null,
          whatsapp: form.whatsapp || null,

          // >>> Tambahan baru
          mileage_km: Number.isFinite(mileageNum) ? mileageNum : null,
          color: form.color || null,
          unit_type: form.unit_type || null,
        }])
        .select('id')
        .single();

      if (insertErr) throw insertErr;
      const listingId = inserted?.id as string;
      if (!listingId) throw new Error('Gagal mendapatkan ID listing.');

      // Upload IMAGES ke bucket listing-images/[id]/<filename>
      if (imageFiles.length > 0) {
        for (let i = 0; i < imageFiles.length; i++) {
          const f = imageFiles[i];
          if (!f.type.startsWith('image/')) continue;

          const filename = `${Date.now()}-${i}-${(f.name || 'image').replace(/\s+/g, '_')}`;
          const path = `${listingId}/${filename}`;

          const { error: upErr } = await supabase
            .storage
            .from('listing-images')
            .upload(path, f, { upsert: true });

          if (upErr) {
            console.warn('Upload image gagal:', upErr.message);
          }
        }
      }

      // Upload VIDEOS ke bucket listing-videos/[id]/<filename>
      if (videoFiles.length > 0) {
        for (let i = 0; i < videoFiles.length; i++) {
          const f = videoFiles[i];
          if (!f.type.startsWith('video/')) continue;

          // Batasan dasar: maksimum 3 menit (opsional — di enforce di UI/UX, server side tetap aman via policy)
          // Catatan: Mengecek durasi video di client butuh memuat metadata <video>. Di sini kita batasi ukuran dasar saja.
          // Silakan sesuaikan jika ingin validasi durasi sebenarnya.
          const maxSizeMB = 200; // contoh batas ukuran (opsional)
          if (f.size > maxSizeMB * 1024 * 1024) {
            console.warn(`Video dilewati karena > ${maxSizeMB}MB: ${f.name}`);
            continue;
          }

          const filename = `${Date.now()}-${i}-${(f.name || 'video').replace(/\s+/g, '_')}`;
          const path = `${listingId}/${filename}`;

          const { error: upErr } = await supabase
            .storage
            .from('listing-videos')
            .upload(path, f, { upsert: true });

          if (upErr) {
            console.warn('Upload video gagal:', upErr.message);
          }
        }
      }

      // Sukses → ke detail
      router.push(`/listings/${listingId}`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Terjadi kesalahan saat menyimpan.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={{ maxWidth: 900, margin: '40px auto', padding: '0 16px' }}>
      <h1 style={{ fontWeight: 800, fontSize: 24, marginBottom: 12 }}>Jual Unit</h1>
      <p style={{ color: '#6b7280', marginBottom: 16 }}>
        Isi data unit Anda dengan lengkap. Foto & video akan diunggah ke storage dan otomatis terhubung ke listing.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
        {/* Baris 1: Judul, Merk */}
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Judul</label>
            <input
              value={form.title}
              onChange={onChange('title')}
              placeholder="Contoh: Yamaha NMAX 2022 Mulus"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Merk</label>
            <input
              value={form.brand}
              onChange={onChange('brand')}
              placeholder="Yamaha / Honda / Suzuki / Kawasaki / dll"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Baris 2: Tahun, Harga */}
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Tahun</label>
            <input
              type="number"
              inputMode="numeric"
              value={form.year}
              onChange={onChange('year')}
              placeholder="2021"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Harga</label>
            <input
              type="number"
              inputMode="numeric"
              value={form.price}
              onChange={onChange('price')}
              placeholder="35000000"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Baris 3: Lokasi, WhatsApp */}
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Lokasi</label>
            <input
              value={form.location}
              onChange={onChange('location')}
              placeholder="Kota/Kabupaten"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>WhatsApp</label>
            <input
              value={form.whatsapp}
              onChange={onChange('whatsapp')}
              placeholder="08xxxxxxxxxx"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Baris 4 (BARU): Kilometer, Warna, Tipe Unit */}
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr 1fr' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Kilometer Pemakaian (KM)</label>
            <input
              type="number"
              inputMode="numeric"
              value={form.mileage_km}
              onChange={onChange('mileage_km')}
              placeholder="contoh: 15000"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Warna Unit</label>
            <input
              value={form.color}
              onChange={onChange('color')}
              placeholder="Hitam / Putih / Merah / Silver / dll"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Tipe Unit / Varian</label>
            <input
              value={form.unit_type}
              onChange={onChange('unit_type')}
              placeholder="Matic / Bebek / Sport / Trail / Listrik (atau varian)"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Deskripsi */}
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Deskripsi</label>
          <textarea
            value={form.description}
            onChange={onChange('description')}
            placeholder="Tulis kondisi unit, alasan jual, pajak, servis, dll."
            rows={5}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        {/* Upload FOTO */}
        <div>
          <label style={{ display: 'block', fontWeight: 700, marginBottom: 6 }}>Foto Unit (bisa banyak)</label>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              setImageFiles(files);
            }}
          />
          {imageFiles.length > 0 && (
            <p style={{ color: '#6b7280', marginTop: 6 }}>
              {imageFiles.length} foto dipilih. (Disimpan ke <code>listing-images/&lt;id&gt;/</code>)
            </p>
          )}
        </div>

        {/* Upload VIDEO */}
        <div>
          <label style={{ display: 'block', fontWeight: 700, marginBottom: 6 }}>Video Unit (opsional, bisa banyak)</label>
          <input
            type="file"
            multiple
            accept="video/*"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              setVideoFiles(files);
            }}
          />
          {videoFiles.length > 0 && (
            <p style={{ color: '#6b7280', marginTop: 6 }}>
              {videoFiles.length} video dipilih. (Disimpan ke <code>listing-videos/&lt;id&gt;/</code>)
            </p>
          )}
          <p style={{ color: '#9ca3af', fontSize: 12, marginTop: 4 }}>
            Hindari konten melanggar hukum/SARA/pornografi. Maks durasi dianjurkan &le; 3 menit / file.
          </p>
        </div>

        {errorMsg && (
          <div style={{ background: '#fee2e2', color: '#991b1b', padding: 12, borderRadius: 8 }}>
            {errorMsg}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            type="submit"
            disabled={submitting}
            style={{
              background: submitting ? '#86efac' : '#10b981',
              color: 'white',
              padding: '10px 16px',
              borderRadius: 10,
              border: 'none',
              fontWeight: 700,
              cursor: submitting ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? 'Menyimpan…' : 'Simpan & Terbitkan'}
          </button>
        </div>
      </form>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid #e5e7eb',
  fontSize: 14,
  outline: 'none',
};
