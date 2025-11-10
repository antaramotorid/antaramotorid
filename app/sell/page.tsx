// app/sell/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

// ==== KONFIGURASI TETAP (LOCKED GREEN) ====
// - 6 slot foto + 1 video
// - Uploads section di PALING ATAS
// - Brand → Type dropdown (Indonesia)
// - Year dropdown 1980..sekarang
// - Color dropdown
// - Fields: km (mileage), unit_type, color tetap
// - Bucket WRITE: images -> listing-images, video -> listing-videos

const MAX_IMAGES = 6;

// Brand → Type (contoh ringkas, bisa dilengkapi bertahap)
const BRAND_TYPES: Record<string, string[]> = {
  honda: ["Vario", "Beat", "Scoopy", "CBR 150", "CBR 250"],
  yamaha: ["NMAX", "Aerox", "Fazzio", "R15", "R25"],
  suzuki: ["GSX R150", "Satria F150", "Nex", "Address"],
  kawasaki: ["Ninja 250", "W175", "ZX-25R"],
  vespa: ["Primavera", "Sprint", "GTS 300"],
  "motor listrik": ["Gesits", "Polytron Fox", "Smoot", "ALVA One"],
};

// Warna umum (bisa ditambah sewaktu-waktu)
const COLORS = [
  "Hitam",
  "Putih",
  "Merah",
  "Biru",
  "Abu-abu",
  "Silver",
  "Kuning",
  "Hijau",
  "Cokelat",
  "Oranye",
];

// Tahun 1980..current
const YEARS = (() => {
  const arr: number[] = [];
  const now = new Date().getFullYear();
  for (let y = now; y >= 1980; y--) arr.push(y);
  return arr;
})();

// Daftar provinsi (static)
const PROVINCES = [
  "DKI Jakarta",
  "Jawa Barat",
  "Jawa Tengah",
  "DI Yogyakarta",
  "Jawa Timur",
  "Banten",
  "Bali",
  "Nusa Tenggara Barat",
  "Nusa Tenggara Timur",
  "Aceh",
  "Sumatera Utara",
  "Sumatera Barat",
  "Riau",
  "Kep. Riau",
  "Jambi",
  "Sumatera Selatan",
  "Bangka Belitung",
  "Bengkulu",
  "Lampung",
  "Kalimantan Barat",
  "Kalimantan Tengah",
  "Kalimantan Selatan",
  "Kalimantan Timur",
  "Kalimantan Utara",
  "Sulawesi Utara",
  "Sulawesi Tengah",
  "Sulawesi Selatan",
  "Sulawesi Tenggara",
  "Gorontalo",
  "Sulawesi Barat",
  "Maluku",
  "Maluku Utara",
  "Papua",
  "Papua Barat",
  "Papua Selatan",
  "Papua Tengah",
  "Papua Pegunungan",
  "Papua Barat Daya",
];

type UploadProgress = { filename: string; percent: number };

type FormState = {
  title: string;
  brand: string;
  unit_type: string;
  year: number | "";
  price: number | "";
  color: string;
  mileage_km: number | "";
  whatsapp: string;
  description: string;

  // Lokasi lama (tetap dipertahankan)
  location: string; // ringkas (kota/kabupaten) — tetap ada

  // Lokasi baru (tambahan)
  province: string;
  regency: string;
  district: string;
  subdistrict: string;

  latitude: string;
  longitude: string;
};

export default function SellPage() {
  // ======== STATE FORM ========
  const [form, setForm] = useState<FormState>({
    title: "",
    brand: "",
    unit_type: "",
    year: "",
    price: "",
    color: "",
    mileage_km: "",
    whatsapp: "",
    description: "",
    location: "",

    province: "",
    regency: "",
    district: "",
    subdistrict: "",

    latitude: "",
    longitude: "",
  });

  // ======== STATE MEDIA (6 foto + 1 video) ========
  const [images, setImages] = useState<(File | null)[]>(Array(MAX_IMAGES).fill(null));
  const [imagePreviews, setImagePreviews] = useState<(string | null)[]>(Array(MAX_IMAGES).fill(null));
  const [imageProgress, setImageProgress] = useState<UploadProgress[]>(
    Array(MAX_IMAGES).fill(null).map((_, i) => ({ filename: `foto-${i + 1}`, percent: 0 }))
  );

  const [video, setVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [videoProgress, setVideoProgress] = useState<UploadProgress | null>(null);

  const imgInputs = useRef<(HTMLInputElement | null)[]>([]);
  const vidInput = useRef<HTMLInputElement | null>(null);

  // ==== derived types dari brand ====
  const typeOptions = useMemo(() => {
    const key = (form.brand || "").toLowerCase();
    return BRAND_TYPES[key] || [];
  }, [form.brand]);

  // ==== Handlers umum ====
  const onChange =
    <K extends keyof FormState>(key: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const v = e.target.value;
      setForm((f) => ({ ...f, [key]: key === "price" || key === "mileage_km" ? (v === "" ? "" : Number(v)) : v }));
    };

  // ==== Image slot handlers ====
  const handlePickImage = (i: number) => {
    const el = imgInputs.current[i];
    if (el) el.click();
  };

  const handleImageSelected = (i: number, file: File | null) => {
    const nextImages = [...images];
    nextImages[i] = file;
    setImages(nextImages);

    const nextPrev = [...imagePreviews];
    nextPrev[i] = file ? URL.createObjectURL(file) : null;
    setImagePreviews(nextPrev);

    // reset progress
    setImageProgress((p) => {
      const c = [...p];
      c[i] = { filename: file?.name || `foto-${i + 1}`, percent: file ? 1 : 0 };
      return c;
    });
  };

  // ==== Video handlers ====
  const handlePickVideo = () => {
    vidInput.current?.click();
  };

  const handleVideoSelected = (file: File | null) => {
    setVideo(file || null);
    setVideoPreview(file ? URL.createObjectURL(file) : null);
    setVideoProgress(file ? { filename: file.name, percent: 1 } : null);
  };

  // ==== Lokasi (GPS) ====
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      alert("Peramban tidak mendukung Geolocation.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setForm((f) => ({
          ...f,
          latitude: String(latitude),
          longitude: String(longitude),
        }));
      },
      (err) => {
        if (err.code === 1) {
          alert("Akses lokasi ditolak. Aktifkan izin lokasi untuk browser Anda.");
        } else if (err.code === 2) {
          alert("Sinyal GPS tidak tersedia. Coba aktifkan lokasi atau pindah ke area terbuka.");
        } else {
          alert("Gagal mendapatkan lokasi. Coba lagi.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // ==== Submit ====
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (submitting) return;
    try {
      setSubmitting(true);

      // 1) Buat row listing utama
      const insertPayload = {
        title: form.title || null,
        brand: (form.brand || "").toLowerCase() || null,
        unit_type: form.unit_type || null,
        year: form.year === "" ? null : Number(form.year),
        price: form.price === "" ? null : Number(form.price),
        color: form.color || null,
        mileage_km: form.mileage_km === "" ? null : Number(form.mileage_km),
        whatsapp: form.whatsapp || null,
        description: form.description || null,

        // Lokasi ringkas (lama) masih disimpan agar kompatibel
        location: form.location || null,

        // Lokasi detail (baru)
        province: form.province || null,
        regency: form.regency || null,
        district: form.district || null,
        subdistrict: form.subdistrict || null,

        latitude: form.latitude || null,
        longitude: form.longitude || null,
      };

      const { data: created, error: insertErr } = await supabase
        .from("listings")
        .insert(insertPayload)
        .select("id")
        .single();

      if (insertErr || !created?.id) {
        console.error(insertErr);
        alert("Gagal menyimpan data listing. Coba lagi.");
        setSubmitting(false);
        return;
      }

      const listingId = created.id as string;

      // 2) Upload FOTO (ke bucket listing-images)
      for (let i = 0; i < images.length; i++) {
        const file = images[i];
        if (!file) continue;

        const path = `${listingId}/${Date.now()}-${i + 1}-${file.name.replace(/\s+/g, "_")}`;
        // progress simulasi (karena Supabase Storage tidak expose progress upload di SDK)
        setImageProgress((prev) => {
          const c = [...prev];
          c[i] = { filename: file.name, percent: 25 };
          return c;
        });
        const { error: upErr } = await supabase.storage.from("listing-images").upload(path, file, {
          upsert: false,
        });
        if (upErr) {
          console.error(upErr);
          setImageProgress((prev) => {
            const c = [...prev];
            c[i] = { filename: file.name, percent: 0 };
            return c;
          });
          continue;
        }
        setImageProgress((prev) => {
          const c = [...prev];
          c[i] = { filename: file.name, percent: 100 };
          return c;
        });
      }

      // 3) Upload VIDEO (opsional) ke bucket listing-videos
      if (video) {
        const vpath = `${listingId}/${Date.now()}-${video.name.replace(/\s+/g, "_")}`;
        setVideoProgress({ filename: video.name, percent: 25 });
        const { error: vErr } = await supabase.storage.from("listing-videos").upload(vpath, video, {
          upsert: false,
        });
        if (vErr) {
          console.error(vErr);
          setVideoProgress({ filename: video.name, percent: 0 });
        } else {
          setVideoProgress({ filename: video.name, percent: 100 });
        }
      }

      alert("Iklan berhasil diterbitkan!");
      // reset ringan
      setForm((f) => ({
        ...f,
        title: "",
        unit_type: "",
        year: "",
        price: "",
        mileage_km: "",
        whatsapp: "",
        description: "",
        location: "",
        province: "",
        regency: "",
        district: "",
        subdistrict: "",
        latitude: "",
        longitude: "",
      }));
      setImages(Array(MAX_IMAGES).fill(null));
      setImagePreviews(Array(MAX_IMAGES).fill(null));
      setImageProgress(Array(MAX_IMAGES).fill(null).map((_, i) => ({ filename: `foto-${i + 1}`, percent: 0 })));
      setVideo(null);
      setVideoPreview(null);
      setVideoProgress(null);
    } finally {
      setSubmitting(false);
    }
  }

  // ==== UI ====
  return (
    <main style={{ maxWidth: 1100, margin: "24px auto", padding: "0 16px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 16 }}>Jual Unit</h1>

      {/* =================== UPLOADS SECTION (PALING ATAS) =================== */}
      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontWeight: 800, fontSize: 22, margin: "0 0 12px" }}>Foto Unit (maks {MAX_IMAGES})</h2>

        {/* GRID 3x2 THUMBNAILS */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
          {Array.from({ length: MAX_IMAGES }).map((_, i) => (
            <div
              key={i}
              style={{
                position: "relative",
                width: "100%",
                aspectRatio: "1 / 1",
                border: "1px dashed #D1D5DB",
                borderRadius: 12,
                overflow: "hidden",
                background: "#F9FAFB",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
              onClick={() => handlePickImage(i)}
            >
              {/* preview */}
              {imagePreviews[i] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imagePreviews[i] as string}
                  alt={`foto-${i + 1}`}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#9CA3AF",
                    fontWeight: 700,
                    fontSize: 14,
                    userSelect: "none",
                  }}
                >
                  Upload Foto
                </div>
              )}

              {/* overlay progress */}
              {imageProgress[i]?.percent ? (
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: 6,
                    background: "#E5E7EB",
                  }}
                >
                  <div
                    style={{
                      width: `${imageProgress[i].percent}%`,
                      height: "100%",
                      background: "#10B981",
                      transition: "width .2s",
                    }}
                  />
                </div>
              ) : null}

              {/* input hidden */}
              <input
                ref={(el) => {
                  imgInputs.current[i] = el;
                }}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => handleImageSelected(i, e.target.files?.[0] || null)}
              />
            </div>
          ))}
        </div>

        {/* VIDEO */}
        <div style={{ marginTop: 18 }}>
          <h3 style={{ fontWeight: 800, fontSize: 18, margin: "0 0 8px" }}>Video Unit (opsional)</h3>
          <div
            onClick={handlePickVideo}
            style={{
              position: "relative",
              width: "100%",
              maxWidth: 360,
              aspectRatio: "16 / 9",
              border: "1px dashed #D1D5DB",
              borderRadius: 12,
              overflow: "hidden",
              background: "#F9FAFB",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            {videoPreview ? (
              <video src={videoPreview} style={{ width: "100%", height: "100%", objectFit: "cover" }} controls />
            ) : (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#9CA3AF",
                  fontWeight: 700,
                  fontSize: 14,
                  userSelect: "none",
                }}
              >
                Upload Video
              </div>
            )}

            {videoProgress ? (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: 6,
                  background: "#E5E7EB",
                }}
              >
                <div
                  style={{
                    width: `${videoProgress.percent}%`,
                    height: "100%",
                    background: "#10B981",
                    transition: "width .2s",
                  }}
                />
              </div>
            ) : null}

            <input
              ref={vidInput}
              type="file"
              accept="video/*"
              hidden
              onChange={(e) => handleVideoSelected(e.target.files?.[0] || null)}
            />
          </div>
        </div>
      </section>

      {/* =================== FORM DATA UNIT =================== */}
      <section style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gap: 8 }}>
          <label>Judul</label>
          <input value={form.title} onChange={onChange("title")} placeholder="Contoh: Yamaha Fazzio 2023 istimewa" />
        </div>

        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr", gapRow: 8 } as any}>
          <div style={{ display: "grid", gap: 8 }}>
            <label>Merk</label>
            <select value={form.brand} onChange={onChange("brand")}>
              <option value="">Pilih merk</option>
              {Object.keys(BRAND_TYPES).map((b) => (
                <option key={b} value={b}>
                  {b.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            <label>Tipe/Model</label>
            <select value={form.unit_type} onChange={onChange("unit_type")}>
              <option value="">Pilih tipe/model</option>
              {typeOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr 1fr", gapRow: 8 } as any}>
          <div style={{ display: "grid", gap: 8 }}>
            <label>Tahun</label>
            <select value={form.year as any} onChange={onChange("year")}>
              <option value="">Pilih tahun</option>
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <label>Warna</label>
            <select value={form.color} onChange={onChange("color")}>
              <option value="">Pilih warna</option>
              {COLORS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <label>Kilometer</label>
            <input
              value={form.mileage_km as any}
              onChange={onChange("mileage_km")}
              placeholder="25.000"
              inputMode="numeric"
            />
          </div>
        </div>

        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr", gapRow: 8 } as any}>
          <div style={{ display: "grid", gap: 8 }}>
            <label>Harga (Rp)</label>
            <input value={form.price as any} onChange={onChange("price")} placeholder="18.000.000" inputMode="numeric" />
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            <label>WhatsApp</label>
            <input value={form.whatsapp} onChange={onChange("whatsapp")} placeholder="08xxx" />
          </div>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <label>Deskripsi</label>
          <textarea
            value={form.description}
            onChange={onChange("description")}
            placeholder="Kondisi mesin, body, pajak, servis, alasan jual, dll."
            rows={5}
          />
        </div>

        {/* =================== LOKASI (BARU + LAMA TETAP) =================== */}
        <div style={{ marginTop: 8 }}>
          <h3 style={{ fontWeight: 800, margin: "0 0 8px" }}>Lokasi</h3>

          {/* Lokasi ringkas (lama) tetap dipertahankan */}
          <div style={{ display: "grid", gap: 8, marginBottom: 8 }}>
            <label>Lokasi (label singkat)</label>
            <input
              value={form.location}
              onChange={onChange("location")}
              placeholder="Kota/Kabupaten (contoh: Jakarta Timur)"
            />
          </div>

          {/* Lokasi detail (tambahan) */}
          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr", gapRow: 8 } as any}>
            <div style={{ display: "grid", gap: 8 }}>
              <label>Provinsi</label>
              <select value={form.province} onChange={onChange("province")}>
                <option value="">Pilih provinsi</option>
                {PROVINCES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              <label>Kab/Kota</label>
              <input value={form.regency} onChange={onChange("regency")} placeholder="Contoh: Jakarta Timur / Bekasi" />
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              <label>Kecamatan</label>
              <input value={form.district} onChange={onChange("district")} placeholder="Contoh: Kramat Jati" />
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              <label>Kelurahan</label>
              <input value={form.subdistrict} onChange={onChange("subdistrict")} placeholder="Contoh: Dukuh" />
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
            <div style={{ display: "grid", gap: 6, flex: "1 1 150px" }}>
              <label>Latitude</label>
              <input
                value={form.latitude}
                onChange={onChange("latitude")}
                placeholder="-6.2"
                inputMode="decimal"
              />
            </div>
            <div style={{ display: "grid", gap: 6, flex: "1 1 150px" }}>
              <label>Longitude</label>
              <input
                value={form.longitude}
                onChange={onChange("longitude")}
                placeholder="106.8"
                inputMode="decimal"
              />
            </div>
            <button
              type="button"
              onClick={handleUseMyLocation}
              style={{
                alignSelf: "end",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #E5E7EB",
                background: "#111827",
                color: "#fff",
                fontWeight: 700,
              }}
            >
              Gunakan Lokasi Saya (GPS)
            </button>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            style={{
              padding: "12px 18px",
              borderRadius: 14,
              border: "1px solid #E5E7EB",
              background: submitting ? "#9CA3AF" : "#111827",
              color: "#fff",
              fontWeight: 800,
              cursor: submitting ? "not-allowed" : "pointer",
            }}
          >
            {submitting ? "Menerbitkan..." : "Terbitkan Iklan"}
          </button>
        </div>

        <p style={{ color: "#6B7280", fontSize: 12, marginTop: 8 }}>
          *Batasi konten yang melanggar hukum, SARA, atau dewasa — akan ditolak.
        </p>
      </section>
    </main>
  );
}
