"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

/** === TYPE & CONSTANTS YANG SUDAH TERKUNCI === */
type MediaItem = { type: "image" | "video"; url: string };

// Kartu thumbnail yang kompak
const THUMB_W = 180;
const THUMB_ASPECT = "4 / 3";
const GRID_MAX_WIDTH = 620;
const thumbStyle: React.CSSProperties = {
  width: "100%",
  aspectRatio: THUMB_ASPECT,
  border: "1px dashed #D1D5DB",
  borderRadius: 14,
  background: "#FAFAFA",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  position: "relative",
  overflow: "hidden",
  cursor: "pointer",
};
const thumbInnerLabel: React.CSSProperties = {
  fontSize: 13,
  color: "#6B7280",
  textAlign: "center",
  userSelect: "none",
};

// Tahun 1980..current
const YEARS = (() => {
  const arr: number[] = [];
  const now = new Date().getFullYear();
  for (let y = now; y >= 1980; y--) arr.push(y);
  return arr;
})();

// Brand → Type (ringkas untuk start; bisa diperluas)
const BRAND_TYPES: Record<string, string[]> = {
  Honda: ["Vario", "Beat", "Scoopy", "PCX", "CBR 150", "CBR 250", "CRF 150", "ADV", "Sonic", "Revo", "Supra"],
  Yamaha: ["Fazzio", "NMAX", "Aerox", "Lexi", "Mio", "R15", "R25", "XSR 155", "XMAX", "FreeGo", "VEGA"],
  Suzuki: ["Satria F150", "Nex", "Address", "GSX R150", "GSX S150"],
  Kawasaki: ["W175", "KLX 150", "Ninja 250", "ZX25R", "Versys 250"],
  "Motor Listrik": ["Alva One", "Gesits", "Selis", "Viar Q1", "United T1800"],
};

// Warna umum
const COLORS = [
  "Hitam",
  "Putih",
  "Merah",
  "Biru",
  "Kuning",
  "Abu-abu",
  "Hijau",
  "Cokelat",
  "Silver",
  "Gold",
  "Lainnya",
];

/** ========== DATA WILAYAH (SAMPLE TERSTRUKTUR) ==========
 * Mekanisme dropdown berantai siap; cukup tambah struktur REGIONS
 * jika ingin meliputi seluruh Indonesia (bisa kita lanjutkan bertahap).
 */
type Regions = Record<
  string, // Provinsi
  Record<
    string, // Kota/Kab
    Record<
      string, // Kecamatan
      string[] // Kelurahan
    >
  >
>;

// Contoh data awal (DKI & Jabar — termasuk Bekasi, Depok, Bogor, Bandung)
const REGIONS: Regions = {
  "DKI Jakarta": {
    "Jakarta Timur": {
      "Kramat Jati": ["Dukuh", "Cawang", "Kampung Tengah"],
      "Cakung": ["Penggilingan", "Ujung Menteng", "Jatinegara"],
      "Pasar Rebo": ["Gedong", "Baru", "Kalisari"],
    },
    "Jakarta Selatan": {
      "Pasar Minggu": ["Pejaten Timur", "Ragunan", "Jaticempaka"],
      "Cilandak": ["Gandaria Selatan", "Lebak Bulus", "Cilandak Barat"],
    },
  },
  "Jawa Barat": {
    Bekasi: {
      "Bekasi Timur": ["Aren Jaya", "Duren Jaya", "Margahayu"],
      "Bekasi Barat": ["Bintara", "Jakasampurna", "Kranji"],
    },
    Depok: {
      "Beji": ["Kukusan", "Kemiri Muka", "Beji"],
      "Sukmajaya": ["Cisalak", "Mekar Jaya", "Abadijaya"],
    },
    Bogor: {
      "Bogor Utara": ["Cibuluh", "Tegal Gundil", "Bantarjati"],
      "Bogor Selatan": ["Empang", "Ranggamekar", "Batu Tulis"],
    },
    Bandung: {
      "Coblong": ["Dago", "Lebak Gede", "Lebak Siliwangi"],
      "Kiaracondong": ["Sukapura", "Gumuruh", "Kebon Jayanti"],
    },
  },
};

/** Reverse geocoding: isi dropdown otomatis dari GPS */
async function reverseGeocode(lat: number, lon: number) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14&accept-language=id`;
  const res = await fetch(url, {
    headers: { "User-Agent": "antaramotorid/1.0 (contact: admin@antaramotor.com)" },
  });
  if (!res.ok) throw new Error("Reverse geocoding gagal");
  const data = await res.json();
  const addr = data?.address || {};
  // Normalisasi beberapa field
  return {
    province:
      addr.state || addr.region || addr.province || addr.county || addr["ISO3166-2-lvl4"] || addr["state_district"],
    city:
      addr.city ||
      addr.town ||
      addr.municipality ||
      addr.village ||
      addr.county ||
      addr["city_district"] ||
      addr.suburb,
    district: addr.suburb || addr.district || addr["city_district"] || addr.borough,
    subdistrict: addr.village || addr.suburb || addr.hamlet || addr.neighbourhood,
  } as { province?: string; city?: string; district?: string; subdistrict?: string };
}

/** =================== KOMPOSISI FORM =================== */
type Form = {
  title: string;
  brand: string;
  unit_type: string;
  year?: number;
  color?: string;
  mileage_km?: number;
  price?: number;
  whatsapp?: string;
  description?: string;

  // Lokasi terstruktur
  province?: string;
  city?: string;
  district?: string;
  subdistrict?: string;

  // koordinat disimpan internal (tanpa input)
  latitude?: number | null;
  longitude?: number | null;
};

export default function SellPage() {
  const [form, setForm] = useState<Form>({
    title: "",
    brand: "",
    unit_type: "",
    year: undefined,
    color: undefined,
    mileage_km: undefined,
    price: undefined,
    whatsapp: "",
    description: "",

    province: undefined,
    city: undefined,
    district: undefined,
    subdistrict: undefined,

    latitude: null,
    longitude: null,
  });

  /** ======== Upload state (6 foto + 1 video) ======== */
  const [imageFiles, setImageFiles] = useState<(File | null)[]>(Array(6).fill(null));
  const [imagePreviews, setImagePreviews] = useState<(string | null)[]>(Array(6).fill(null));
  const [imgProgress, setImgProgress] = useState<(number | null)[]>(Array(6).fill(null));

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [videoProgress, setVideoProgress] = useState<number | null>(null);

  const imgInputs = useRef<HTMLInputElement[]>([]);
  const videoInputRef = useRef<HTMLInputElement>(null);

  /** ======== Derived options untuk dropdown berantai ======== */
  const provinces = useMemo(() => Object.keys(REGIONS), []);
  const cities = useMemo(() => {
    if (!form.province || !REGIONS[form.province]) return [];
    return Object.keys(REGIONS[form.province]);
  }, [form.province]);
  const districts = useMemo(() => {
    if (!form.province || !form.city) return [];
    const branch = REGIONS[form.province]?.[form.city];
    return branch ? Object.keys(branch) : [];
  }, [form.province, form.city]);
  const subdistricts = useMemo(() => {
    if (!form.province || !form.city || !form.district) return [];
    const leaf = REGIONS[form.province]?.[form.city]?.[form.district];
    return leaf || [];
  }, [form.province, form.city, form.district]);

  /** ======== Handlers ======== */
  const onChange =
    (key: keyof Form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = e.target.value;
      setForm((f) => ({ ...f, [key]: key === "year" ? Number(value) : key === "price" || key === "mileage_km" ? Number(value) : value }));
    };

  // Brand -> reset type
  const onBrandChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const brand = e.target.value;
    setForm((f) => ({ ...f, brand, unit_type: "" }));
  };

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0] || null;
    setImageFiles((arr) => {
      const n = [...arr];
      n[index] = file;
      return n;
    });
    setImagePreviews((arr) => {
      const n = [...arr];
      n[index] = file ? URL.createObjectURL(file) : null;
      return n;
    });
  };

  const handleVideoPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setVideoFile(file);
    setVideoPreview(file ? URL.createObjectURL(file) : null);
  };

  /** Gunakan lokasi saya (GPS) */
  const useMyLocation = async () => {
    if (!("geolocation" in navigator)) {
      alert("Geolocation tidak tersedia di peramban ini.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setForm((f) => ({ ...f, latitude: lat, longitude: lon }));

        try {
          const addr = await reverseGeocode(lat, lon);

          // Pastikan opsi ada di dropdown (kalau belum ada, kita sisipkan sementara)
          const ensureOption = <T extends string>(arr: T[], value?: T) =>
            value && !arr.includes(value) ? [value as T, ...arr] : arr;

          // Sisipkan ke dataset runtime (tidak mengubah REGIONS asli)
          if (addr.province) {
            // set langsung, dan biarkan dropdown terisi value ini (walau belum ada di REGIONS)
            setForm((f) => ({
              ...f,
              province: addr.province || f.province,
              city: addr.city || f.city,
              district: addr.district || f.district,
              subdistrict: addr.subdistrict || f.subdistrict,
            }));
          }
        } catch (e) {
          console.error(e);
        }
      },
      (err) => {
        if (err.code === 1) alert("Izin lokasi ditolak. Aktifkan izin lokasi untuk mengisi otomatis.");
        else alert("Tidak bisa mengambil lokasi. Coba lagi.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  /** Submit */
  const onSubmit = async () => {
    // Validasi ringan
    if (!form.title) return alert("Judul wajib diisi.");
    if (!form.brand) return alert("Pilih merk.");
    if (!form.unit_type) return alert("Pilih tipe/model.");
    if (!form.year) return alert("Pilih tahun.");
    if (!form.price) return alert("Isi harga.");
    if (!form.province || !form.city) return alert("Lengkapi lokasi minimal Provinsi & Kab/Kota.");

    // 1) Insert listing
    const payload = {
      title: form.title,
      brand: form.brand,
      unit_type: form.unit_type,
      year: form.year,
      color: form.color || null,
      mileage_km: form.mileage_km ?? null,
      price: form.price,
      whatsapp: form.whatsapp || null,
      description: form.description || null,

      province: form.province || null,
      city: form.city || null,
      district: form.district || null,
      subdistrict: form.subdistrict || null,

      latitude: form.latitude ?? null,
      longitude: form.longitude ?? null,
      created_at: new Date().toISOString(),
    };

    const { data: inserted, error } = await supabase.from("listings").insert(payload).select("id").single();
    if (error || !inserted?.id) {
      console.error(error);
      alert("Gagal menyimpan listing.");
      return;
    }
    const listingId: string = inserted.id;

    // 2) Upload media
    // Foto
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      if (!file) continue;
      try {
        setImgProgress((p) => {
          const n = [...p];
          n[i] = 0;
          return n;
        });

        // Pakai bucket prioritas "listing-images"
        const path = `${listingId}/${Date.now()}-${i}-${file.name}`;
        const { error: upErr } = await supabase.storage
          .from("listing-images")
          .upload(path, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (upErr) throw upErr;
        setImgProgress((p) => {
          const n = [...p];
          n[i] = 100;
          return n;
        });
      } catch (e) {
        console.error(e);
        setImgProgress((p) => {
          const n = [...p];
          n[i] = null;
          return n;
        });
      }
    }

    // Video (opsional)
    if (videoFile) {
      try {
        setVideoProgress(0);
        const vpath = `${listingId}/${Date.now()}-${videoFile.name}`;
        const { error: vErr } = await supabase.storage.from("listing-videos").upload(vpath, videoFile, {
          cacheControl: "3600",
          upsert: false,
        });
        if (vErr) throw vErr;
        setVideoProgress(100);
      } catch (e) {
        console.error(e);
        setVideoProgress(null);
      }
    }

    alert("Iklan berhasil diterbitkan!");
    // Reset ringan
    setForm((f) => ({ ...f, title: "", description: "", price: undefined }));
    setImageFiles(Array(6).fill(null));
    setImagePreviews(Array(6).fill(null));
    setImgProgress(Array(6).fill(null));
    setVideoFile(null);
    setVideoPreview(null);
    setVideoProgress(null);
  };

  return (
    <main style={{ maxWidth: 1100, margin: "24px auto", padding: "0 16px" }}>
      <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 8 }}>Jual Unit</h1>

      {/* ================== UPLOADS DI BAGIAN ATAS ================== */}
      <h2 style={{ fontSize: 20, fontWeight: 800, margin: "16px 0 8px" }}>Foto Unit (maks 6)</h2>
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(3, minmax(0,1fr))", maxWidth: GRID_MAX_WIDTH }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={`img-slot-${i}`} style={{ maxWidth: THUMB_W }}>
            {imagePreviews[i] ? (
              <div style={thumbStyle} onClick={() => imgInputs.current[i]?.click()}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreviews[i] as string}
                  alt={`Foto ${i + 1}`}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                {imgProgress[i] != null && (
                  <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 4, background: "#E5E7EB" }}>
                    <div style={{ width: `${imgProgress[i]}%`, height: "100%", background: "#111827" }} />
                  </div>
                )}
              </div>
            ) : (
              <div style={thumbStyle} onClick={() => imgInputs.current[i]?.click()}>
                <span style={thumbInnerLabel}>Upload Foto</span>
              </div>
            )}
            <input
              ref={(el) => (imgInputs.current[i] = el!)}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => handleImagePick(e, i)}
            />
          </div>
        ))}

        {/* Slot Video */}
        <div style={{ maxWidth: THUMB_W }}>
          <h3 style={{ fontSize: 14, margin: "0 0 6px", color: "#374151" }}>Video Unit (opsional)</h3>
          {videoPreview ? (
            <div style={thumbStyle} onClick={() => videoInputRef.current?.click()}>
              <video src={videoPreview as string} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              {videoProgress != null && (
                <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 4, background: "#E5E7EB" }}>
                  <div style={{ width: `${videoProgress}%`, height: "100%", background: "#111827" }} />
                </div>
              )}
            </div>
          ) : (
            <div style={thumbStyle} onClick={() => videoInputRef.current?.click()}>
              <span style={thumbInnerLabel}>Upload Video</span>
            </div>
          )}
          <input ref={videoInputRef} type="file" accept="video/*" hidden onChange={handleVideoPick} />
        </div>
      </div>

      {/* ================== FORM DETAIL ================== */}
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr", marginTop: 18 }}>
        <div style={{ display: "grid", gap: 8 }}>
          <label>Judul</label>
          <input
            value={form.title}
            onChange={onChange("title")}
            placeholder="Contoh: Yamaha Fazzio 2024 istimewa"
          />
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <label>Tahun</label>
          <select value={form.year ?? ""} onChange={onChange("year")}>
            <option value="">Pilih tahun</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <label>Merk</label>
          <select value={form.brand} onChange={onBrandChange}>
            <option value="">Pilih merk</option>
            {Object.keys(BRAND_TYPES).map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <label>Tipe/Model</label>
          <select value={form.unit_type} onChange={onChange("unit_type")} disabled={!form.brand}>
            <option value="">{form.brand ? "Pilih tipe/model" : "Pilih merk dulu"}</option>
            {(BRAND_TYPES[form.brand] || []).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <label>Warna</label>
          <select value={form.color ?? ""} onChange={onChange("color")}>
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
            value={form.mileage_km ?? ""}
            onChange={onChange("mileage_km")}
            inputMode="numeric"
            placeholder="25000"
          />
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <label>Harga (Rp)</label>
          <input value={form.price ?? ""} onChange={onChange("price")} inputMode="numeric" placeholder="18000000" />
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <label>WhatsApp</label>
          <input value={form.whatsapp ?? ""} onChange={onChange("whatsapp")} placeholder="08xxx" />
        </div>

        <div style={{ gridColumn: "1 / -1", display: "grid", gap: 8 }}>
          <label>Deskripsi</label>
          <textarea
            value={form.description ?? ""}
            onChange={onChange("description")}
            rows={5}
            placeholder="Kondisi mesin, bodi, pajak, servis, alasan jual, dll."
          />
        </div>
      </div>

      {/* ================== LOKASI TERSTRUKTUR ================== */}
      <h2 style={{ fontSize: 20, fontWeight: 800, margin: "16px 0 8px" }}>Lokasi</h2>
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(2, minmax(0,1fr))" }}>
        <div style={{ display: "grid", gap: 8 }}>
          <label>Provinsi</label>
          <select
            value={form.province ?? ""}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                province: e.target.value || undefined,
                city: undefined,
                district: undefined,
                subdistrict: undefined,
              }))
            }
          >
            <option value="">Pilih Provinsi</option>
            {provinces.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
            {/* Jika hasil GPS bukan daftar, tetap tampil */}
            {form.province && !provinces.includes(form.province) && (
              <option value={form.province}>{form.province}</option>
            )}
          </select>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <label>Kab/Kota</label>
          <select
            value={form.city ?? ""}
            onChange={(e) =>
              setForm((f) => ({ ...f, city: e.target.value || undefined, district: undefined, subdistrict: undefined }))
            }
            disabled={!form.province}
          >
            <option value="">{form.province ? "Pilih Kab/Kota" : "Pilih provinsi dulu"}</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            {form.city && !cities.includes(form.city) && <option value={form.city}>{form.city}</option>}
          </select>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <label>Kecamatan</label>
          <select
            value={form.district ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, district: e.target.value || undefined, subdistrict: undefined }))}
            disabled={!form.city}
          >
            <option value="">{form.city ? "Pilih Kecamatan" : "Pilih kab/kota dulu"}</option>
            {districts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
            {form.district && !districts.includes(form.district) && <option value={form.district}>{form.district}</option>}
          </select>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <label>Kelurahan</label>
          <select
            value={form.subdistrict ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, subdistrict: e.target.value || undefined }))}
            disabled={!form.district}
          >
            <option value="">{form.district ? "Pilih Kelurahan" : "Pilih kecamatan dulu"}</option>
            {subdistricts.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
            {form.subdistrict && !subdistricts.includes(form.subdistrict) && (
              <option value={form.subdistrict}>{form.subdistrict}</option>
            )}
          </select>
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <button
            type="button"
            onClick={useMyLocation}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #E5E7EB",
              background: "#111827",
              color: "#fff",
            }}
          >
            Gunakan Lokasi Saya (GPS)
          </button>
          <p style={{ color: "#6B7280", fontSize: 12, marginTop: 6 }}>
            Jika diminta izin lokasi, pilih <b>Allow</b>. Sistem akan mengisi provinsi/kota/kecamatan/kelurahan
            otomatis (bila dikenali).
          </p>
        </div>
      </div>

      {/* ================== TERBITKAN ================== */}
      <div style={{ marginTop: 18 }}>
        <button
          type="button"
          onClick={onSubmit}
          style={{
            padding: "12px 18px",
            background: "#111827",
            color: "white",
            borderRadius: 12,
            border: "1px solid #111827",
            fontWeight: 700,
          }}
        >
          Terbitkan Iklan
        </button>
        <p style={{ color: "#6B7280", fontSize: 12, marginTop: 8 }}>
          *Batasi konten yang melanggar hukum, SARA, atau dewasa — akan ditolak.
        </p>
      </div>
    </main>
  );
}
