"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

/** ================== KONSTAN: BRAND → TYPE INDONESIA ================== */
const BRAND_TYPES: Record<string, string[]> = {
  Yamaha: [
    "NMAX","Aerox","Lexi","Fazzio","Gear 125","FreeGo",
    "XMAX","Grand Filano","R15","R25","MT-15","Vixion",
    "XSR 155","Vega","Jupiter Z","Crypton","Fino","Mio"
  ],
  Honda: [
    "Vario 125","Vario 160","PCX 160","ADV 160","Beat","Genio",
    "Scoopy","Forza","CBR150R","CBR250RR","CB150R","CB150X",
    "Revo","Supra","GTR 150","Sonic 150R","Winner","CRF150L"
  ],
  Suzuki: ["Nex II","Address","Satria F150","GSX-R150","GSX-S150","Smash"],
  Kawasaki: ["W175","KLX 150","Ninja 250","Ninja ZX-25R","Z250","D-Tracker"],
  Vespa: ["LX","S","Primavera","Sprint","GTS","Sei Giorni"],
  "SM Sport": ["V16","SM Classic"],
  Viar: ["Q1 (Listrik)","Vortex","Cross X","Vintech"],
  Selis: ["E-Max","Agats (Listrik)"],
  Gesits: ["GESITS (Listrik)"],
  United: ["TX300 (Listrik)","TX1800 (Listrik)"],
  Yadea: ["G6 (Listrik)","T9 (Listrik)"],
  Lainnya: ["Lainnya / Custom / Antik"],
};

const COLORS = [
  "Hitam","Putih","Merah","Biru","Abu-abu","Silver","Hijau",
  "Kuning","Cokelat","Oranye","Krem","Marun","Ungu","Lainnya"
];

const THIS_YEAR = new Date().getFullYear();
const YEARS: number[] = Array.from({ length: THIS_YEAR - 1980 + 1 }, (_, i) => THIS_YEAR - i);

/** Validasi sederhana */
const isImage = (f: File) => /\.(png|jpe?g|webp|gif|bmp)$/i.test(f.name);
const isVideo = (f: File) => /\.(mp4|webm|ogg|mov|m4v)$/i.test(f.name);

/** Batasan */
const MAX_IMAGES = 6;
const MAX_IMAGE_SIZE_MB = 10;
const MAX_VIDEO_SIZE_MB = 300;

type UploadItem = {
  file: File;
  progress: number; // 0..100 (indikator)
  status: "idle" | "uploading" | "done" | "error";
  url?: string;
  error?: string;
};

export default function SellPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  /** ================== STATE FORM ================== */
  const [form, setForm] = useState({
    title: "",
    brand: "",
    unit_type: "",
    year: "",
    color: "",
    mileage_km: "",
    price: "",
    location: "",
    whatsapp: "",
    description: "",
  });

  const brandTypes = useMemo(() => (form.brand ? BRAND_TYPES[form.brand] ?? [] : []), [form.brand]);

  /** ================== MEDIA STATE ================== */
  const [images, setImages] = useState<UploadItem[]>([]);
  const [videos, setVideos] = useState<UploadItem[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  /** ================== HANDLERS ================== */
  const onChange =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((s) => ({ ...s, [key]: e.target.value }));
      if (key === "brand") setForm((s) => ({ ...s, unit_type: "" }));
    };

  const pickImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const allowed = Math.max(0, MAX_IMAGES - images.length);
    const take = files.slice(0, allowed);

    const clean = take.filter(
      (f) => isImage(f) && f.size <= MAX_IMAGE_SIZE_MB * 1024 * 1024
    );

    if (clean.length < take.length) {
      alert(`Beberapa gambar tidak valid/terlalu besar (> ${MAX_IMAGE_SIZE_MB} MB) dan di-skip.`);
    }

    setImages((prev) => [
      ...prev,
      ...clean.map((f) => ({ file: f, progress: 0, status: "idle" as const })),
    ]);

    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const pickVideos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const clean = files.filter(
      (f) => isVideo(f) && f.size <= MAX_VIDEO_SIZE_MB * 1024 * 1024
    );

    if (clean.length < files.length) {
      alert(`Beberapa video tidak valid/terlalu besar (> ${MAX_VIDEO_SIZE_MB} MB) dan di-skip.`);
    }

    setVideos((prev) => [
      ...prev,
      ...clean.map((f) => ({ file: f, progress: 0, status: "idle" as const })),
    ]);

    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const removeImage = (idx: number) => setImages((arr) => arr.filter((_, i) => i !== idx));
  const removeVideo = (idx: number) => setVideos((arr) => arr.filter((_, i) => i !== idx));

  /** ================== SUBMIT ================== */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!form.title.trim()) return alert("Judul wajib diisi.");
    if (!form.brand) return alert("Pilih brand terlebih dahulu.");
    if (!form.unit_type) return alert("Pilih tipe/model unit.");
    if (!form.year) return alert("Pilih tahun.");
    if (!form.color) return alert("Pilih warna.");
    if (!form.price) return alert("Isi harga.");
    if (!form.whatsapp) return alert("Isi nomor WhatsApp.");

    setSubmitting(true);
    try {
      // 1) Insert listing
      const payload = {
        title: form.title.trim(),
        brand: form.brand,
        unit_type: form.unit_type,
        year: form.year ? Number(form.year) : null,
        color: form.color || null,
        mileage_km: form.mileage_km ? Number(form.mileage_km) : null,
        price: form.price ? Number(form.price) : null,
        location: form.location || null,
        whatsapp: form.whatsapp || null,
        description: form.description || null,
      };

      const { data: inserted, error: insErr } = await supabase
        .from("listings")
        .insert(payload)
        .select("id")
        .single();

      if (insErr || !inserted?.id) throw new Error(insErr?.message || "Gagal membuat listing.");
      const listingId = inserted.id as string;

      // 2) Upload gambar
      for (let i = 0; i < images.length; i++) {
        setImages((arr) => {
          const n = [...arr];
          n[i] = { ...n[i], status: "uploading", progress: 10 };
          return n;
        });

        const name = `${Date.now()}-${i}-${images[i].file.name.replace(/\s+/g, "_")}`;
        const path = `${listingId}/${name}`;
        const { error } = await supabase.storage.from("listing-images").upload(path, images[i].file, { upsert: true });

        if (error) {
          setImages((arr) => {
            const n = [...arr];
            n[i] = { ...n[i], status: "error", progress: 0, error: error.message };
            return n;
          });
          continue;
        }

        const pub = supabase.storage.from("listing-images").getPublicUrl(path);
        setImages((arr) => {
          const n = [...arr];
          n[i] = { ...n[i], status: "done", progress: 100, url: pub.data.publicUrl };
          return n;
        });
      }

      // 3) Upload video
      for (let i = 0; i < videos.length; i++) {
        setVideos((arr) => {
          const n = [...arr];
          n[i] = { ...n[i], status: "uploading", progress: 10 };
          return n;
        });

        const name = `${Date.now()}-${i}-${videos[i].file.name.replace(/\s+/g, "_")}`;
        const path = `${listingId}/${name}`;
        const { error } = await supabase.storage.from("listing-videos").upload(path, videos[i].file, { upsert: true });

        if (error) {
          setVideos((arr) => {
            const n = [...arr];
            n[i] = { ...n[i], status: "error", progress: 0, error: error.message };
            return n;
          });
          continue;
        }

        const pub = supabase.storage.from("listing-videos").getPublicUrl(path);
        setVideos((arr) => {
          const n = [...arr];
          n[i] = { ...n[i], status: "done", progress: 100, url: pub.data.publicUrl };
          return n;
        });
      }

      alert("Listing berhasil dibuat!");
      router.push(`/listings/${listingId}`);
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Terjadi kesalahan saat menyimpan.");
    } finally {
      setSubmitting(false);
    }
  };

  /** ================== RENDER ================== */
  return (
    <main style={{ maxWidth: 980, margin: "24px auto", padding: "0 16px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 16 }}>Jual Motor</h1>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
        {/* ================== (ATAS) UPLOAD FOTO ================== */}
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <label style={{ fontWeight: 700, fontSize: 16 }}>Foto Unit (maks {MAX_IMAGES})</label>
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff" }}
            >
              + Tambah Foto
            </button>
          </div>

          <input ref={imageInputRef} type="file" accept="image/*" multiple onChange={pickImages} hidden />

          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(3, 1fr)" }}>
            {images.map((it, idx) => (
              <div
                key={idx}
                style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 8, display: "grid", gap: 6 }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={it.file.name}
                  src={URL.createObjectURL(it.file)}
                  style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 8 }}
                />
                <div style={{ fontSize: 12, color: "#374151" }}>{it.file.name}</div>
                <div style={{ height: 6, background: "#f3f4f6", borderRadius: 999 }}>
                  <div
                    style={{
                      width: `${it.progress}%`,
                      height: 6,
                      borderRadius: 999,
                      background: it.status === "error" ? "#ef4444" : "#10b981",
                      transition: "width .3s ease",
                    }}
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <span>
                    {it.status === "idle" && "Siap upload"}
                    {it.status === "uploading" && `Mengunggah… ${it.progress}%`}
                    {it.status === "done" && "Selesai"}
                    {it.status === "error" && "Gagal"}
                  </span>
                  <button type="button" onClick={() => removeImage(idx)} style={{ color: "#ef4444" }}>
                    Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ================== (ATAS) UPLOAD VIDEO ================== */}
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <label style={{ fontWeight: 700, fontSize: 16 }}>Video Unit (opsional)</label>
            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff" }}
            >
              + Tambah Video
            </button>
          </div>

          <input ref={videoInputRef} type="file" accept="video/*" multiple onChange={pickVideos} hidden />

          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(3, 1fr)" }}>
            {videos.map((it, idx) => (
              <div
                key={idx}
                style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 8, display: "grid", gap: 6 }}
              >
                <video
                  src={URL.createObjectURL(it.file)}
                  style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 8 }}
                  muted
                  controls
                />
                <div style={{ fontSize: 12, color: "#374151" }}>{it.file.name}</div>
                <div style={{ height: 6, background: "#f3f4f6", borderRadius: 999 }}>
                  <div
                    style={{
                      width: `${it.progress}%`,
                      height: 6,
                      borderRadius: 999,
                      background: it.status === "error" ? "#ef4444" : "#10b981",
                      transition: "width .3s ease",
                    }}
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <span>
                    {it.status === "idle" && "Siap upload"}
                    {it.status === "uploading" && `Mengunggah… ${it.progress}%`}
                    {it.status === "done" && "Selesai"}
                    {it.status === "error" && "Gagal"}
                  </span>
                  <button type="button" onClick={() => removeVideo(idx)} style={{ color: "#ef4444" }}>
                    Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>

          <p style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
            *Batasi konten yang melanggar hukum, SARA, atau dewasa — akan ditolak.
          </p>
        </div>

        {/* ================== FIELD INFORMASI ================ */}
        {/* Judul */}
        <div style={{ display: "grid", gap: 6 }}>
          <label>Judul Iklan</label>
          <input
            value={form.title}
            onChange={onChange("title")}
            placeholder="Contoh: Yamaha NMAX 2022 Mulus"
            required
          />
        </div>

        {/* Brand → Type */}
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
          <div style={{ display: "grid", gap: 6 }}>
            <label>Brand</label>
            <select value={form.brand} onChange={onChange("brand")} required>
              <option value="">— Pilih Brand —</option>
              {Object.keys(BRAND_TYPES).map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <label>Tipe / Model</label>
            <select value={form.unit_type} onChange={onChange("unit_type")} required disabled={!form.brand}>
              <option value="">— Pilih Tipe —</option>
              {brandTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tahun • Warna */}
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
          <div style={{ display: "grid", gap: 6 }}>
            <label>Tahun</label>
            <select value={form.year} onChange={onChange("year")} required>
              <option value="">— Pilih Tahun —</option>
              {YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <label>Warna</label>
            <select value={form.color} onChange={onChange("color")} required>
              <option value="">— Pilih Warna —</option>
              {COLORS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Kilometer • Harga */}
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
          <div style={{ display: "grid", gap: 6 }}>
            <label>Kilometer</label>
            <input value={form.mileage_km} onChange={onChange("mileage_km")} placeholder="cth: 15000" inputMode="numeric" />
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <label>Harga (Rp)</label>
            <input value={form.price} onChange={onChange("price")} placeholder="cth: 24500000" inputMode="numeric" required />
          </div>
        </div>

        {/* Lokasi • WhatsApp */}
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
          <div style={{ display: "grid", gap: 6 }}>
            <label>Lokasi</label>
            <input value={form.location} onChange={onChange("location")} placeholder="Kota/Kecamatan" />
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            <label>WhatsApp</label>
            <input value={form.whatsapp} onChange={onChange("whatsapp")} placeholder="62xxxxxxxxxxx" required />
          </div>
        </div>

        {/* Deskripsi */}
        <div style={{ display: "grid", gap: 6 }}>
          <label>Deskripsi</label>
          <textarea
            value={form.description}
            onChange={onChange("description")}
            placeholder="Kondisi mesin, body, pajak, servis, alasan jual, dll."
            rows={5}
          />
        </div>

        <div>
          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              background: submitting ? "#e5e7eb" : "#111827",
              color: submitting ? "#6b7280" : "#fff",
              fontWeight: 700,
            }}
          >
            {submitting ? "Menyimpan..." : "Terbitkan Iklan"}
          </button>
        </div>
      </form>
    </main>
  );
}
