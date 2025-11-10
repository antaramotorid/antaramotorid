"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

/** === TYPE & CONSTANTS YANG TERKUNCI (tidak diubah) === */
type MediaItem = { type: "image" | "video"; url: string };

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

const YEARS = (() => {
  const arr: number[] = [];
  const now = new Date().getFullYear();
  for (let y = now; y >= 1980; y--) arr.push(y);
  return arr;
})();

const BRAND_TYPES: Record<string, string[]> = {
  Honda: ["Vario", "Beat", "Scoopy", "PCX", "CBR 150", "CBR 250", "CRF 150", "ADV", "Sonic", "Revo", "Supra"],
  Yamaha: ["Fazzio", "NMAX", "Aerox", "Lexi", "Mio", "R15", "R25", "XSR 155", "XMAX", "FreeGo", "VEGA"],
  Suzuki: ["Satria F150", "Nex", "Address", "GSX R150", "GSX S150"],
  Kawasaki: ["W175", "KLX 150", "Ninja 250", "ZX25R", "Versys 250"],
  "Motor Listrik": ["Alva One", "Gesits", "Selis", "Viar Q1", "United T1800"],
};

const COLORS = [
  "Hitam","Putih","Merah","Biru","Kuning","Abu-abu","Hijau","Cokelat","Silver","Gold","Lainnya",
];

/** ====== TIPE DATASET WILAYAH & HELPERS LOADER ====== */
type Option = { id: string; name: string };
async function fetchJSON<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(path, { cache: "force-cache" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function loadProvinces(): Promise<Option[]> {
  return (await fetchJSON<Option[]>("/regions/provinces.json")) ?? [];
}
async function loadCities(provinceId: string): Promise<Option[]> {
  if (!provinceId) return [];
  return (await fetchJSON<Option[]>(`/regions/cities/${provinceId}.json`)) ?? [];
}
async function loadDistricts(cityId: string): Promise<Option[]> {
  if (!cityId) return [];
  return (await fetchJSON<Option[]>(`/regions/districts/${cityId}.json`)) ?? [];
}
async function loadSubdistricts(districtId: string): Promise<Option[]> {
  if (!districtId) return [];
  return (await fetchJSON<Option[]>(`/regions/subdistricts/${districtId}.json`)) ?? [];
}

/** Reverse geocoding → best-effort map ke nama (tanpa ID) */
async function reverseGeocode(lat: number, lon: number) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14&accept-language=id`;
  const res = await fetch(url, {
    headers: { "User-Agent": "antaramotorid/1.0 (contact: admin@antaramotor.com)" },
  });
  if (!res.ok) throw new Error("Reverse geocoding gagal");
  const data = await res.json();
  const a = data?.address || {};
  // Nama yang paling sering cocok dengan dataset lokal
  return {
    provinceName: a.state || a.region || a.province,
    cityName: a.city || a.town || a.municipality || a.county,
    districtName: a.suburb || a.district || a["city_district"],
    subdistrictName: a.village || a.hamlet || a.neighbourhood,
  } as { provinceName?: string; cityName?: string; districtName?: string; subdistrictName?: string };
}

/** =================== FORM =================== */
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

  province_id?: string; province_name?: string;
  city_id?: string; city_name?: string;
  district_id?: string; district_name?: string;
  subdistrict_id?: string; subdistrict_name?: string;

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

  /** ======== OPTIONS wilayah ======== */
  const [provOptions, setProvOptions] = useState<Option[]>([]);
  const [cityOptions, setCityOptions] = useState<Option[]>([]);
  const [districtOptions, setDistrictOptions] = useState<Option[]>([]);
  const [subdistrictOptions, setSubdistrictOptions] = useState<Option[]>([]);

  useEffect(() => {
    loadProvinces().then(setProvOptions);
  }, []);

  useEffect(() => {
    if (!form.province_id) {
      setCityOptions([]); setDistrictOptions([]); setSubdistrictOptions([]);
      setForm(f => ({ ...f, city_id: undefined, city_name: undefined, district_id: undefined, district_name: undefined, subdistrict_id: undefined, subdistrict_name: undefined }));
      return;
    }
    loadCities(form.province_id).then(setCityOptions);
  }, [form.province_id]);

  useEffect(() => {
    if (!form.city_id) {
      setDistrictOptions([]); setSubdistrictOptions([]);
      setForm(f => ({ ...f, district_id: undefined, district_name: undefined, subdistrict_id: undefined, subdistrict_name: undefined }));
      return;
    }
    loadDistricts(form.city_id).then(setDistrictOptions);
  }, [form.city_id]);

  useEffect(() => {
    if (!form.district_id) {
      setSubdistrictOptions([]);
      setForm(f => ({ ...f, subdistrict_id: undefined, subdistrict_name: undefined }));
      return;
    }
    loadSubdistricts(form.district_id).then(setSubdistrictOptions);
  }, [form.district_id]);

  /** ======== Handlers ======== */
  const onChange =
    (key: keyof Form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = e.target.value;
      setForm((f) => ({
        ...f,
        [key]:
          key === "year"
            ? Number(value)
            : key === "price" || key === "mileage_km"
            ? Number(value)
            : value,
      }));
    };

  const onBrandChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const brand = e.target.value;
    setForm((f) => ({ ...f, brand, unit_type: "" }));
  };

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0] || null;
    setImageFiles((arr) => { const n = [...arr]; n[index] = file; return n; });
    setImagePreviews((arr) => { const n = [...arr]; n[index] = file ? URL.createObjectURL(file) : null; return n; });
  };
  const handleVideoPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setVideoFile(file);
    setVideoPreview(file ? URL.createObjectURL(file) : null);
  };

  /** Gunakan lokasi saya (GPS) */
  const useMyLocation = async () => {
    if (!("geolocation" in navigator)) { alert("Geolocation tidak tersedia di peramban ini."); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude; const lon = pos.coords.longitude;
        setForm((f) => ({ ...f, latitude: lat, longitude: lon }));
        try {
          const { provinceName, cityName, districtName, subdistrictName } = await reverseGeocode(lat, lon);

          // Coba cocokkan nama ke opsi saat ini
          // 1) Provinsi
          let prov = provOptions.find(p => p.name.toLowerCase() === (provinceName || "").toLowerCase());
          if (!prov && provinceName) {
            // fallback: cari yang mengandung
            prov = provOptions.find(p => provinceName.toLowerCase().includes(p.name.toLowerCase()));
          }
          if (prov) {
            setForm(f => ({ ...f, province_id: prov!.id, province_name: prov!.name, city_id: undefined, district_id: undefined, subdistrict_id: undefined }));
            const cities = await loadCities(prov.id);
            setCityOptions(cities);

            // 2) Kota
            let city = cities.find(c => c.name.toLowerCase() === (cityName || "").toLowerCase());
            if (!city && cityName) city = cities.find(c => cityName.toLowerCase().includes(c.name.toLowerCase()));
            if (city) {
              setForm(f => ({ ...f, city_id: city!.id, city_name: city!.name, district_id: undefined, subdistrict_id: undefined }));
              const dists = await loadDistricts(city.id);
              setDistrictOptions(dists);

              // 3) Kecamatan
              let dist = dists.find(d => d.name.toLowerCase() === (districtName || "").toLowerCase());
              if (!dist && districtName) dist = dists.find(d => districtName.toLowerCase().includes(d.name.toLowerCase()));
              if (dist) {
                setForm(f => ({ ...f, district_id: dist!.id, district_name: dist!.name, subdistrict_id: undefined }));
                const subs = await loadSubdistricts(dist.id);
                setSubdistrictOptions(subs);

                // 4) Kelurahan
                let sub = subs.find(s => s.name.toLowerCase() === (subdistrictName || "").toLowerCase());
                if (!sub && subdistrictName) sub = subs.find(s => subdistrictName.toLowerCase().includes(s.name.toLowerCase()));
                if (sub) setForm(f => ({ ...f, subdistrict_id: sub!.id, subdistrict_name: sub!.name }));
              }
            }
          }
        } catch (e) { console.error(e); }
      },
      (err) => {
        if (err.code === 1) alert("Izin lokasi ditolak. Aktifkan izin lokasi."); else alert("Tidak bisa mengambil lokasi.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  /** Submit (tidak diubah selain field lokasi baru) */
  const onSubmit = async () => {
    if (!form.title) return alert("Judul wajib diisi.");
    if (!form.brand) return alert("Pilih merk.");
    if (!form.unit_type) return alert("Pilih tipe/model.");
    if (!form.year) return alert("Pilih tahun.");
    if (!form.price) return alert("Isi harga.");
    if (!form.province_id || !form.city_id) return alert("Lengkapi lokasi minimal Provinsi & Kab/Kota.");

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

      province_id: form.province_id ?? null, province_name: form.province_name ?? null,
      city_id: form.city_id ?? null, city_name: form.city_name ?? null,
      district_id: form.district_id ?? null, district_name: form.district_name ?? null,
      subdistrict_id: form.subdistrict_id ?? null, subdistrict_name: form.subdistrict_name ?? null,

      latitude: form.latitude ?? null,
      longitude: form.longitude ?? null,
      created_at: new Date().toISOString(),
    };

    const { data: inserted, error } = await supabase.from("listings").insert(payload).select("id").single();
    if (error || !inserted?.id) { console.error(error); alert("Gagal menyimpan listing."); return; }
    const listingId: string = inserted.id;

    // Upload foto
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      if (!file) continue;
      try {
        setImgProgress((p) => { const n = [...p]; n[i] = 0; return n; });
        const path = `${listingId}/${Date.now()}-${i}-${file.name}`;
        const { error: upErr } = await supabase.storage.from("listing-images").upload(path, file, { cacheControl: "3600", upsert: false });
        if (upErr) throw upErr;
        setImgProgress((p) => { const n = [...p]; n[i] = 100; return n; });
      } catch (e) { console.error(e); setImgProgress((p) => { const n = [...p]; n[i] = null; return n; }); }
    }

    // Upload video (opsional)
    if (videoFile) {
      try {
        setVideoProgress(0);
        const vpath = `${listingId}/${Date.now()}-${videoFile.name}`;
        const { error: vErr } = await supabase.storage.from("listing-videos").upload(vpath, videoFile, { cacheControl: "3600", upsert: false });
        if (vErr) throw vErr;
        setVideoProgress(100);
      } catch (e) { console.error(e); setVideoProgress(null); }
    }

    alert("Iklan berhasil diterbitkan!");
  };

  return (
    <main style={{ maxWidth: 1100, margin: "24px auto", padding: "0 16px" }}>
      <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 8 }}>Jual Unit</h1>

      {/* UPLOADS DI BAGIAN ATAS (tetap) */}
      <h2 style={{ fontSize: 20, fontWeight: 800, margin: "16px 0 8px" }}>Foto Unit (maks 6)</h2>
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(3, minmax(0,1fr))", maxWidth: GRID_MAX_WIDTH }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={`img-slot-${i}`} style={{ maxWidth: THUMB_W }}>
            {imagePreviews[i] ? (
              <div style={thumbStyle} onClick={() => imgInputs.current[i]?.click()}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreviews[i] as string} alt={`Foto ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
              ref={(el) => { imgInputs.current[i] = el!; }}
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

      {/* FORM DETAIL (tetap) */}
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr", marginTop: 18 }}>
        <div style={{ display: "grid", gap: 8 }}>
          <label>Judul</label>
          <input value={form.title} onChange={onChange("title")} placeholder="Contoh: Yamaha Fazzio 2024 istimewa" />
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <label>Tahun</label>
          <select value={form.year ?? ""} onChange={onChange("year")}>
            <option value="">Pilih tahun</option>
            {YEARS.map((y) => (<option key={y} value={y}>{y}</option>))}
          </select>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <label>Merk</label>
          <select value={form.brand} onChange={onBrandChange}>
            <option value="">Pilih merk</option>
            {Object.keys(BRAND_TYPES).map((b) => (<option key={b} value={b}>{b}</option>))}
          </select>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <label>Tipe/Model</label>
          <select value={form.unit_type} onChange={onChange("unit_type")} disabled={!form.brand}>
            <option value="">{form.brand ? "Pilih tipe/model" : "Pilih merk dulu"}</option>
            {(BRAND_TYPES[form.brand] || []).map((t) => (<option key={t} value={t}>{t}</option>))}
          </select>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <label>Warna</label>
          <select value={form.color ?? ""} onChange={onChange("color")}>
            <option value="">Pilih warna</option>
            {COLORS.map((c) => (<option key={c} value={c}>{c}</option>))}
          </select>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <label>Kilometer</label>
          <input value={form.mileage_km ?? ""} onChange={onChange("mileage_km")} inputMode="numeric" placeholder="25000" />
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
          <textarea value={form.description ?? ""} onChange={onChange("description")} rows={5} placeholder="Kondisi mesin, bodi, pajak, servis, alasan jual, dll." />
        </div>
      </div>

      {/* LOKASI (dropdown berantai seluruh Indonesia via JSON) */}
      <h2 style={{ fontSize: 20, fontWeight: 800, margin: "16px 0 8px" }}>Lokasi</h2>
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(2, minmax(0,1fr))" }}>
        <div style={{ display: "grid", gap: 8 }}>
          <label>Provinsi</label>
          <select
            value={form.province_id ?? ""}
            onChange={(e) => {
              const id = e.target.value;
              const name = provOptions.find(p => p.id === id)?.name;
              setForm(f => ({ ...f, province_id: id || undefined, province_name: name, city_id: undefined, city_name: undefined, district_id: undefined, district_name: undefined, subdistrict_id: undefined, subdistrict_name: undefined }));
            }}
          >
            <option value="">Pilih Provinsi</option>
            {provOptions.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
          </select>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <label>Kab/Kota</label>
          <select
            value={form.city_id ?? ""}
            onChange={(e) => {
              const id = e.target.value;
              const name = cityOptions.find(c => c.id === id)?.name;
              setForm(f => ({ ...f, city_id: id || undefined, city_name: name, district_id: undefined, district_name: undefined, subdistrict_id: undefined, subdistrict_name: undefined }));
            }}
            disabled={!form.province_id}
          >
            <option value="">{form.province_id ? "Pilih Kab/Kota" : "Pilih provinsi dulu"}</option>
            {cityOptions.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <label>Kecamatan</label>
          <select
            value={form.district_id ?? ""}
            onChange={(e) => {
              const id = e.target.value;
              const name = districtOptions.find(d => d.id === id)?.name;
              setForm(f => ({ ...f, district_id: id || undefined, district_name: name, subdistrict_id: undefined, subdistrict_name: undefined }));
            }}
            disabled={!form.city_id}
          >
            <option value="">{form.city_id ? "Pilih Kecamatan" : "Pilih kab/kota dulu"}</option>
            {districtOptions.map(d => (<option key={d.id} value={d.id}>{d.name}</option>))}
          </select>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <label>Kelurahan</label>
          <select
            value={form.subdistrict_id ?? ""}
            onChange={(e) => {
              const id = e.target.value;
              const name = subdistrictOptions.find(s => s.id === id)?.name;
              setForm(f => ({ ...f, subdistrict_id: id || undefined, subdistrict_name: name }));
            }}
            disabled={!form.district_id}
          >
            <option value="">{form.district_id ? "Pilih Kelurahan" : "Pilih kecamatan dulu"}</option>
            {subdistrictOptions.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
          </select>
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <button
            type="button"
            onClick={useMyLocation}
            style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #E5E7EB", background: "#111827", color: "#fff" }}
          >
            Gunakan Lokasi Saya (GPS)
          </button>
          <p style={{ color: "#6B7280", fontSize: 12, marginTop: 6 }}>
            Izinkan akses lokasi agar provinsi/kota/kecamatan/kelurahan terisi otomatis (jika tersedia).
          </p>
        </div>
      </div>

      {/* TERBITKAN */}
      <div style={{ marginTop: 18 }}>
        <button
          type="button"
          onClick={onSubmit}
          style={{ padding: "12px 18px", background: "#111827", color: "white", borderRadius: 12, border: "1px solid #111827", fontWeight: 700 }}
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
