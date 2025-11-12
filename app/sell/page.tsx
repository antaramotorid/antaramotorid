// app/sell/page.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
/**
 * This file expects a JSON file at /data/olx-attributes.json (relative to repo root)
 * with the schema described in the assistant message. Example:
 *
 * {
 *   "brands": { "Honda": ["Vario","Beat"], "Yamaha": ["NMAX","R15"] },
 *   "years": ["2025","2024", "..."],
 *   "colors": ["Hitam","Putih", "..."],
 *   "kilometers": ["< 1.000 km", "1.000 - 5.000 km", "..."],
 *   "locations": { "Provinsi": { "Kota": ["Kecamatan1","Kecamatan2"] } }
 * }
 *
 * If your JSON lives elsewhere, adjust the import path below.
 */

// import JSON from repo (this assumes you committed the file to repo path /data/olx-attributes.json)
import olxAttributes from "../../data/olx-attributes.json";

export type MediaItem = { type: "image" | "video"; url: string };

type OlxAttributesShape = {
  brands?: Record<string, string[]>;
  years?: string[];
  colors?: string[];
  kilometers?: string[];
  locations?: Record<string, Record<string, string[]>>; // prov -> city -> [districts]
};

const ATTRS: OlxAttributesShape = (olxAttributes as OlxAttributesShape) ?? {};

function safeArray<T>(arr?: T[], fallback: T[] = []): T[] {
  return Array.isArray(arr) ? arr : fallback;
}

export default function SellPage(): JSX.Element {
  // ---- dropdown data pulled from JSON (with fallback) ----
  const BRANDS_MAP = useMemo(() => ATTRS.brands ?? {}, []);
  const BRAND_LIST = useMemo(() => ["", ...Object.keys(BRANDS_MAP)], [BRANDS_MAP]);
  const YEARS = useMemo(() => safeArray(ATTRS.years, []), []);
  const COLORS = useMemo(() => safeArray(ATTRS.colors, ["Hitam", "Putih", "Merah"]), []);
  const KILOMETERS = useMemo(() => safeArray(ATTRS.kilometers, ["< 1.000 km", "1.000 - 5.000 km"]), []);
  const LOCATIONS = useMemo(() => ATTRS.locations ?? {}, []);

  // ---- media (6 images + 1 video) ----
  const imageInputRefs = useRef<(HTMLInputElement | null)[]>(
    Array.from({ length: 6 }).map(() => null)
  );
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  const [imageFiles, setImageFiles] = useState<(File | null)[]>(
    Array.from({ length: 6 }).map(() => null)
  );
  const [imagePreviews, setImagePreviews] = useState<(string | null)[]>(
    Array.from({ length: 6 }).map(() => null)
  );
  const [imageProgress, setImageProgress] = useState<number[]>(
    Array.from({ length: 6 }).map(() => 0)
  );

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [videoProgress, setVideoProgress] = useState(0);

  // ---- form fields ----
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState<string>("");
  const [brand, setBrand] = useState<string>("");
  const [model, setModel] = useState<string>("");
  const [year, setYear] = useState<string>("");
  const [color, setColor] = useState<string>("");
  const [km, setKm] = useState<string>("");
  const [province, setProvince] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [district, setDistrict] = useState<string>(""); // kecamatan
  const [description, setDescription] = useState("");

  // derived lists
  const MODEL_LIST = useMemo(() => (brand && BRANDS_MAP[brand] ? BRANDS_MAP[brand] : []), [brand, BRANDS_MAP]);
  const PROVINCE_LIST = useMemo(() => Object.keys(LOCATIONS), [LOCATIONS]);
  const CITY_LIST = useMemo(() => (province && LOCATIONS[province] ? Object.keys(LOCATIONS[province]) : []), [province, LOCATIONS]);
  const DISTRICT_LIST = useMemo(() => (province && city && LOCATIONS[province] && LOCATIONS[province][city] ? LOCATIONS[province][city] : []), [province, city, LOCATIONS]);

  // ---- helpers for previews ----
  useEffect(() => {
    // revoke object URLs when component unmounts
    return () => {
      imagePreviews.forEach((p) => p && URL.revokeObjectURL(p));
      if (videoPreview) URL.revokeObjectURL(videoPreview);
    };
  }, [imagePreviews, videoPreview]);

  async function readFileAsDataUrl(file: File): Promise<string> {
    return await new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(String(fr.result));
      fr.onerror = rej;
      fr.readAsDataURL(file);
    });
  }

  async function handleImageChange(slot: number, f?: File | null) {
    const file = f ?? null;
    setImageFiles((prev) => {
      const copy = [...prev];
      copy[slot] = file;
      return copy;
    });

    if (file) {
      const url = URL.createObjectURL(file);
      setImagePreviews((prev) => {
        const copy = [...prev];
        // revoke previous if exists
        if (copy[slot]) URL.revokeObjectURL(copy[slot] as string);
        copy[slot] = url;
        return copy;
      });
      // reset progress
      setImageProgress((prev) => prev.map((p, idx) => (idx === slot ? 0 : p)));
    } else {
      // cleared
      setImagePreviews((prev) => {
        const copy = [...prev];
        if (copy[slot]) URL.revokeObjectURL(copy[slot] as string);
        copy[slot] = null;
        return copy;
      });
      setImageProgress((prev) => {
        const copy = [...prev];
        copy[slot] = 0;
        return copy;
      });
    }
  }

  async function handleVideoChange(f?: File | null) {
    const file = f ?? null;
    setVideoFile(file);
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
      setVideoPreview(null);
    }
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoPreview(url);
      setVideoProgress(0);
    } else {
      setVideoPreview(null);
      setVideoProgress(0);
    }
  }

  function clearImage(slot: number) {
    handleImageChange(slot, null);
  }
  function clearVideo() {
    handleVideoChange(null);
  }

  // Simulated upload progress helper (for client preview)
  async function simulateProgressForSlot(slot: number) {
    let p = 0;
    return new Promise<void>((res) => {
      const iv = setInterval(() => {
        p += Math.floor(Math.random() * 20) + 8;
        setImageProgress((prev) => {
          const copy = [...prev];
          copy[slot] = Math.min(100, p);
          return copy;
        });
        if (p >= 100) {
          clearInterval(iv);
          res();
        }
      }, 180);
    });
  }

  async function simulateProgressForVideo() {
    let p = 0;
    return new Promise<void>((res) => {
      const iv = setInterval(() => {
        p += Math.floor(Math.random() * 18) + 6;
        setVideoProgress(Math.min(100, p));
        if (p >= 100) {
          clearInterval(iv);
          res();
        }
      }, 220);
    });
  }

  // ---- main: upload simulation then build payload to send to server (you will replace upload with Supabase calls) ----
  const [uploadingAll, setUploadingAll] = useState(false);

  async function handleUploadAndSave() {
    // Minimal validation similar to OLX: title, price, at least one image
    if (!title.trim()) {
      alert("Masukkan judul iklan.");
      return;
    }
    if (!price || String(price).trim() === "") {
      alert("Masukkan harga.");
      return;
    }
    const hasImage = imageFiles.some((f) => !!f);
    if (!hasImage) {
      if (!confirm("Anda belum memilih foto. Lanjut tanpa foto?")) return;
    }

    setUploadingAll(true);

    // simulate uploads (images sequentially)
    for (let i = 0; i < imageFiles.length; i++) {
      if (imageFiles[i]) {
        // simulate per-slot upload progress
        // in real integration: call supabase.storage.from(bucket).upload(...)
        // then obtain public url and store into payload media list
        // here we just run fake progress
        // eslint-disable-next-line no-await-in-loop
        await simulateProgressForSlot(i);
      }
    }
    if (videoFile) {
      // eslint-disable-next-line no-await-in-loop
      await simulateProgressForVideo();
    }

    // Build media array in order images -> video if present (this mirrors prior spec)
    const media: MediaItem[] = [];
    for (let i = 0; i < imagePreviews.length; i++) {
      const p = imagePreviews[i];
      if (p) media.push({ type: "image", url: p });
    }
    if (videoPreview) media.push({ type: "video", url: videoPreview });

    // Build listing payload (client-side). Replace with actual DB/API insert in production.
    const payload = {
      title,
      price: Number(String(price).replace(/[^\d.-]/g, "")) || null,
      brand,
      model,
      year,
      color,
      km,
      location: { province, city, district },
      description,
      media,
      createdAt: new Date().toISOString(),
    };

    // Log and inform user; in prod call API to persist
    // eslint-disable-next-line no-console
    console.log("Listing payload (demo):", payload);
    alert("Iklan berhasil (simulasi). Periksa console untuk payload.");

    setUploadingAll(false);

    // optional: reset form on success
    // (keep this behavior configurable)
  }

  // ---- small UI helpers for selecting file via hidden inputs ----
  function triggerImageInput(slot: number) {
    imageInputRefs.current[slot]?.click();
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-3">
      <div className="max-w-6xl mx-auto">
        {/* Header (small controls) */}
        <header className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-600">Lokasi:</div>
            <select className="border rounded px-3 py-2 text-sm" value={province} onChange={(e) => { setProvince(e.target.value); setCity(""); setDistrict(""); }}>
              <option value="">— Pilih Provinsi —</option>
              {PROVINCE_LIST.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <select className="border rounded px-3 py-2 text-sm" value={city} onChange={(e) => { setCity(e.target.value); setDistrict(""); }}>
              <option value="">— Pilih Kota —</option>
              {CITY_LIST.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="flex-1 mx-4">
            <div className="flex items-center gap-2">
              <input placeholder="Temukan barang, merk, model..." className="w-full rounded border px-3 py-2 text-sm" />
              <button className="bg-sky-600 text-white px-3 py-2 rounded text-sm">Cari</button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm text-gray-700">U</div>
          </div>
        </header>

        <div className="bg-white shadow-sm rounded-md p-6">
          <h1 className="text-2xl font-semibold mb-4">Jual Kendaraan</h1>

          {/* UPLOAD AREA (top) */}
          <section className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Unggah Foto Iklan (maks. 6) & Video (1)</label>

            <div className="flex gap-4">
              {/* image slots grid */}
              <div className="w-full grid grid-cols-3 sm:grid-cols-6 gap-3">
                {Array.from({ length: 6 }).map((_, idx) => {
                  const preview = imagePreviews[idx];
                  return (
                    <div key={idx} className="relative rounded border border-dashed border-gray-300 h-28 flex items-center justify-center bg-gray-50 overflow-hidden cursor-pointer" onClick={() => triggerImageInput(idx)}>
                      {preview ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={preview} alt={`img-${idx}`} className="object-cover w-full h-full" />
                          <button type="button" onClick={(e) => { e.stopPropagation(); clearImage(idx); }} className="absolute top-1 right-1 bg-white rounded-full p-1 text-red-600 shadow">✕</button>
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
                            <div style={{ width: `${imageProgress[idx]}%` }} className="h-full bg-green-500 transition-all" />
                          </div>
                        </>
                      ) : (
                        <div className="text-center text-xs text-gray-400">Foto {idx + 1}</div>
                      )}

                      <input
                        type="file"
                        accept="image/*"
                        ref={(el) => (imageInputRefs.current[idx] = el)}
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0] ?? null;
                          await handleImageChange(idx, file);
                        }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* right column: pickers + upload actions */}
              <div className="w-48 flex flex-col gap-2">
                <div className="relative rounded border border-dashed border-gray-300 h-28 flex items-center justify-center bg-gray-50 overflow-hidden">
                  {videoPreview ? (
                    <>
                      <video src={videoPreview} controls className="object-cover w-full h-full" />
                      <button onClick={clearVideo} className="absolute top-1 right-1 bg-white rounded-full p-1 text-red-600 shadow">✕</button>
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
                        <div style={{ width: `${videoProgress}%` }} className="h-full bg-green-500 transition-all" />
                      </div>
                    </>
                  ) : (
                    <div className="text-center text-xs text-gray-400">Video (maks. 1)</div>
                  )}

                  <input
                    type="file"
                    accept="video/*"
                    ref={videoInputRef}
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0] ?? null;
                      await handleVideoChange(file);
                    }}
                  />
                </div>

                <label className="cursor-pointer rounded-md px-3 py-2 border border-gray-300 text-sm text-gray-700 bg-white text-center" onClick={() => imageInputRefs.current[0]?.click()}>
                  Pilih Foto
                </label>

                <label className="cursor-pointer rounded-md px-3 py-2 border border-gray-300 text-sm text-gray-700 bg-white text-center" onClick={() => videoInputRef.current?.click()}>
                  Pilih Video
                </label>

                <button onClick={handleUploadAndSave} className="mt-1 rounded bg-sky-600 text-white py-2 text-sm" disabled={uploadingAll}>
                  {uploadingAll ? "Mengunggah..." : "Upload & Simpan Iklan"}
                </button>
              </div>
            </div>

            {/* uploaded media preview */}
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Media Ter-upload (preview)</h3>
              <div className="flex gap-3 flex-wrap">
                {imagePreviews.map((p, i) => p ? (
                  <div key={i} className="w-36 h-24 border rounded overflow-hidden relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p} className="object-cover w-full h-full" alt={`uploaded-${i}`} />
                    <button onClick={() => clearImage(i)} className="absolute top-1 right-1 bg-white rounded-full p-1 text-red-600 shadow">✕</button>
                  </div>
                ) : null)}
                {videoPreview && (
                  <div className="w-48 h-28 border rounded overflow-hidden relative">
                    <video src={videoPreview} controls className="object-cover w-full h-full" />
                    <button onClick={clearVideo} className="absolute top-1 right-1 bg-white rounded-full p-1 text-red-600 shadow">✕</button>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* FORM */}
          <form onSubmit={(e) => { e.preventDefault(); handleUploadAndSave(); }} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Judul</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full border rounded px-3 py-2" placeholder="Contoh: Honda Vario 2019 - Terawat" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Deskripsi</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={6} className="mt-1 w-full border rounded px-3 py-2" placeholder="Detail kondisi, servis, kelengkapan..." />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Harga (Rp)</label>
                <input value={price} onChange={(e) => setPrice(e.target.value)} className="mt-1 w-full border rounded px-3 py-2" placeholder="0" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Merk</label>
                <select value={brand} onChange={(e) => { setBrand(e.target.value); setModel(""); }} className="mt-1 w-full border rounded px-3 py-2">
                  <option value="">— Pilih Merk —</option>
                  {BRAND_LIST.map((b) => (b === "" ? null : <option key={b} value={b}>{b}</option>))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Type / Model</label>
                <select value={model} onChange={(e) => setModel(e.target.value)} className="mt-1 w-full border rounded px-3 py-2">
                  <option value="">— Pilih Type —</option>
                  {MODEL_LIST.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Tahun</label>
                <select value={year} onChange={(e) => setYear(e.target.value)} className="mt-1 w-full border rounded px-3 py-2">
                  <option value="">— Pilih Tahun —</option>
                  {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Warna</label>
                <select value={color} onChange={(e) => setColor(e.target.value)} className="mt-1 w-full border rounded px-3 py-2">
                  <option value="">— Pilih Warna —</option>
                  {COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Kilometer (KM)</label>
                <select value={km} onChange={(e) => setKm(e.target.value)} className="mt-1 w-full border rounded px-3 py-2">
                  <option value="">— Pilih KM —</option>
                  {KILOMETERS.map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Lokasi (Provinsi / Kota / Kecamatan)</label>
                <div className="flex gap-2">
                  <select value={province} onChange={(e) => { setProvince(e.target.value); setCity(""); setDistrict(""); }} className="mt-1 w-1/3 border rounded px-3 py-2">
                    <option value="">— Provinsi —</option>
                    {PROVINCE_LIST.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <select value={city} onChange={(e) => { setCity(e.target.value); setDistrict(""); }} className="mt-1 w-1/3 border rounded px-3 py-2">
                    <option value="">— Kota —</option>
                    {CITY_LIST.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select value={district} onChange={(e) => setDistrict(e.target.value)} className="mt-1 w-1/3 border rounded px-3 py-2">
                    <option value="">— Kecamatan —</option>
                    {DISTRICT_LIST.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => {
                setTitle(""); setDescription(""); setPrice(""); setBrand(""); setModel(""); setYear(""); setColor(""); setKm(""); setProvince(""); setCity(""); setDistrict("");
                imageFiles.forEach((_, i) => clearImage(i));
                clearVideo();
              }} className="rounded bg-gray-300 text-black px-4 py-2">Reset</button>

              <button type="button" onClick={handleUploadAndSave} className="rounded bg-green-600 text-white px-4 py-2">
                Unggah & Simpan Iklan
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
