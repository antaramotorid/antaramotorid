'use client';

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import MediaPicker from "./MediaPicker";

// Progress helper: upload via Signed URL + XMLHttpRequest agar bisa % progress
async function uploadWithProgress(
  bucket: string,
  path: string,
  file: File,
  onProgress: (pct: number) => void
): Promise<void> {
  // Buat signed upload URL untuk path tujuan
  const { data: signed, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path);
  if (error || !signed) throw error || new Error("Gagal createSignedUploadUrl");

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (evt) => {
      if (!evt.lengthComputable) return;
      const pct = Math.round((evt.loaded / evt.total) * 100);
      onProgress(pct);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
      } else {
        reject(new Error(`Upload gagal (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error("Upload error"));
    xhr.open("PUT", signed.signedUrl);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.send(file);
  });
}

type FormState = {
  title: string;
  brand: string;
  year: string;            // string -> di-convert Number(nilai) saat submit
  price: string;           // string -> di-convert Number(nilai) saat submit
  location: string;
  description: string;
  whatsapp: string;
  color: string;
  unit_type: string;
  mileage_km: string;      // string -> Number
};

export default function SellPage() {
  const router = useRouter();

  // —— Form
  const [form, setForm] = useState<FormState>({
    title: "",
    brand: "",
    year: "",
    price: "",
    location: "",
    description: "",
    whatsapp: "",
    color: "",
    unit_type: "",
    mileage_km: "",
  });

  const onChange = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((s) => ({ ...s, [k]: e.target.value }));
  };

  // —— Media dari MediaPicker (Model C: max 6 foto + 1 video)
  const [pickedImages, setPickedImages] = useState<File[]>([]);
  const [pickedVideo, setPickedVideo] = useState<File | null>(null);

  const handleMediaChange = useCallback((payload: { images: File[]; video: File | null }) => {
    setPickedImages(payload.images);
    setPickedVideo(payload.video);
  }, []);

  // —— Progress state
  const [imageProgress, setImageProgress] = useState<number[]>([]); // per foto
  const [videoProgress, setVideoProgress] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const totalUploads = useMemo(
    () => pickedImages.length + (pickedVideo ? 1 : 0),
    [pickedImages.length, pickedVideo]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    // Validasi minimal
    if (!form.title.trim()) {
      alert("Judul wajib diisi");
      return;
    }

    try {
      setSubmitting(true);

      // 1) Insert listing untuk dapatkan ID
      const { data: inserted, error: insertErr } = await supabase
        .from("listings")
        .insert({
          title: form.title || null,
          brand: form.brand || null,
          year: form.year ? Number(form.year) : null,
          price: form.price ? Number(form.price) : null,
          location: form.location || null,
          description: form.description || null,
          whatsapp: form.whatsapp || null,
          color: form.color || null,
          unit_type: form.unit_type || null,
          mileage_km: form.mileage_km ? Number(form.mileage_km) : null,
        })
        .select("id")
        .single();

      if (insertErr || !inserted?.id) {
        console.error(insertErr);
        alert("Gagal menyimpan data listing.");
        setSubmitting(false);
        return;
      }

      const listingId: string = inserted.id;

      // 2) Upload media dengan progress
      // Foto (maks 6)
      setImageProgress(new Array(pickedImages.length).fill(0));
      await Promise.all(
        pickedImages.map(async (file, idx) => {
          const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
          const filename = `${Date.now()}-${idx}.${ext}`;
          const path = `${listingId}/${filename}`;

          await uploadWithProgress("listing-images", path, file, (pct) => {
            setImageProgress((arr) => {
              const next = arr.slice();
              next[idx] = pct;
              return next;
            });
          });
        })
      );

      // Video (maks 1)
      if (pickedVideo) {
        const vext = (pickedVideo.name.split(".").pop() || "mp4").toLowerCase();
        const vname = `${Date.now()}-0.${vext}`;
        const vpath = `${listingId}/${vname}`;
        setVideoProgress(0);
        await uploadWithProgress("listing-videos", vpath, pickedVideo, setVideoProgress);
      }

      // 3) Selesai — arahkan ke halaman detail
      alert("Listing berhasil dibuat!");
      router.push(`/listings/${listingId}`);
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Terjadi kesalahan saat upload.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={{ maxWidth: 960, margin: "24px auto", padding: "0 16px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 16 }}>Jual Unit</h1>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
        {/* Media */}
        <section>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Foto & Video Unit</h3>
          <MediaPicker maxImages={6} maxVideo={1} onChange={handleMediaChange} />

          {/* Progress upload (live ketika submit) */}
          {submitting && totalUploads > 0 && (
            <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
              {pickedVideo && (
                <div>
                  <div style={{ fontSize: 12, marginBottom: 4 }}>Upload Video: {videoProgress}%</div>
                  <div style={{ width: "100%", height: 8, background: "#f3f4f6", borderRadius: 999 }}>
                    <div
                      style={{
                        width: `${videoProgress}%`,
                        height: "100%",
                        background: "#10b981",
                        borderRadius: 999,
                        transition: "width .2s",
                      }}
                    />
                  </div>
                </div>
              )}

              {pickedImages.map((_, i) => (
                <div key={i}>
                  <div style={{ fontSize: 12, marginBottom: 4 }}>Upload Foto {i + 1}: {imageProgress[i] || 0}%</div>
                  <div style={{ width: "100%", height: 8, background: "#f3f4f6", borderRadius: 999 }}>
                    <div
                      style={{
                        width: `${imageProgress[i] || 0}%`,
                        height: "100%",
                        background: "#3b82f6",
                        borderRadius: 999,
                        transition: "width .2s",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Informasi dasar */}
        <section style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <label>Judul</label>
            <input value={form.title} onChange={onChange("title")} placeholder="Contoh: Yamaha Fazzio 2023 Mulus" />
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <label>Brand / Merk</label>
            <input value={form.brand} onChange={onChange("brand")} placeholder="Yamaha / Honda / Suzuki" />
          </div>

          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(3, 1fr)", rowGap: 8 }}>
            <div style={{ display: "grid", gap: 8 }}>
              <label>Tahun</label>
              <input value={form.year} onChange={onChange("year")} placeholder="2021" inputMode="numeric" />
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              <label>Harga (Rp)</label>
              <input value={form.price} onChange={onChange("price")} placeholder="15000000" inputMode="numeric" />
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              <label>Kilometer</label>
              <input value={form.mileage_km} onChange={onChange("mileage_km")} placeholder="12000" inputMode="numeric" />
            </div>
          </div>

          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(2, 1fr)", rowGap: 8 }}>
            <div style={{ display: "grid", gap: 8 }}>
              <label>Warna</label>
              <input value={form.color} onChange={onChange("color")} placeholder="Hitam, Putih, dll" />
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              <label>Tipe / Model</label>
              <input value={form.unit_type} onChange={onChange("unit_type")} placeholder="Fazzio, Vario, Nmax..." />
            </div>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <label>Lokasi</label>
            <input value={form.location} onChange={onChange("location")} placeholder="Kota/Kecamatan" />
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <label>No. WhatsApp</label>
            <input value={form.whatsapp} onChange={onChange("whatsapp")} placeholder="62xxxxxxxxxxx" inputMode="numeric" />
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <label>Deskripsi</label>
            <textarea value={form.description} onChange={onChange("description")} placeholder="Kondisi mulus, siap pakai..." rows={5} />
          </div>
        </section>

        <div style={{ display: "flex", gap: 12 }}>
          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: "10px 14px",
              border: "1px solid #111827",
              borderRadius: 10,
              background: submitting ? "#f3f4f6" : "#111827",
              color: "white",
              cursor: submitting ? "not-allowed" : "pointer",
              fontWeight: 700,
            }}
          >
            {submitting ? "Mengunggah..." : "Pasang Iklan"}
          </button>
        </div>
      </form>
    </main>
  );
}
