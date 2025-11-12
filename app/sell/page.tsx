"use client";

import React, { useMemo, useState, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";

export type MediaItem = { type: "image" | "video"; url: string };

/**
 * OLX-style Sell Page (STYLE)
 * - Two-column layout: left = Media Viewer (big) + thumbnails, right = Form
 * - Supports upload to Supabase Storage (listing-images, listing-videos)
 * - Save listing -> insert to `listings` and `media`
 * - Limits: max 6 images, max 1 video
 *
 * Requirements:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY
 */

const INDONESIA_BRANDS: Record<string, string[]> = {
  Honda: ["Beat", "Vario", "CB150R", "Scoopy"],
  Yamaha: ["NMAX", "R15", "Mio", "R25"],
  Suzuki: ["Satria", "NEX", "GSX"],
  Kawasaki: ["Ninja", "Z250"],
  TVS: ["Apache"],
};

const COLORS = ["Hitam", "Putih", "Merah", "Biru", "Abu-abu", "Silver", "Kuning", "Hijau"];

function yearList(from = 1980) {
  const cur = new Date().getFullYear();
  const arr: number[] = [];
  for (let y = cur; y >= from; y--) arr.push(y);
  return arr;
}

export default function SellPage() {
  // form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<string>("");
  const [brand, setBrand] = useState<string>("");
  const [typeModel, setTypeModel] = useState<string>("");
  const [year, setYear] = useState<number | "">("");
  const [color, setColor] = useState<string>("");
  const [km, setKm] = useState<string>("");
  const [location, setLocation] = useState<string>("");

  // header small controls (kept)
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCity, setSelectedCity] = useState<string>("Jakarta Selatan");
  const [notificationsCount] = useState<number>(0);
  const [unreadChats] = useState<number>(0);
  const [userName] = useState<string>("User Demo");

  // upload & media
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  const [filePreviews, setFilePreviews] = useState<
    { id: string; file: File; preview: string; type: "image" | "video"; uploadedUrl?: string }[]
  >([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [mainMediaIndex, setMainMediaIndex] = useState<number>(0);
  const [uploading, setUploading] = useState(false);
  const [progressPct, setProgressPct] = useState<number>(0);

  const brands = useMemo(() => Object.keys(INDONESIA_BRANDS), []);
  const typesForBrand = useMemo(() => (brand ? INDONESIA_BRANDS[brand] ?? [] : []), [brand]);

  // helpers
  function handleAddFiles(files: FileList | null, fileType: "image" | "video") {
    if (!files) return;
    const arr = Array.from(files);
    if (fileType === "image") {
      const existingImages = filePreviews.filter((p) => p.type === "image").length;
      const canTake = Math.max(0, 6 - existingImages);
      const pick = arr.slice(0, canTake);
      const newPreviews = pick.map((f) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        file: f,
        preview: URL.createObjectURL(f),
        type: "image" as const,
      }));
      setFilePreviews((p) => {
        const res = [...p, ...newPreviews];
        // keep video at end if exists
        const images = res.filter((x) => x.type === "image");
        const video = res.find((x) => x.type === "video");
        return video ? [...images, video] : images;
      });
    } else {
      const first = arr[0];
      if (!first) return;
      setFilePreviews((p) => {
        const images = p.filter((x) => x.type === "image");
        const newVideo = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          file: first,
          preview: URL.createObjectURL(first),
          type: "video" as const,
        };
        return [...images, newVideo];
      });
    }
    // set mainMediaIndex to first newly added
    setTimeout(() => {
      setMainMediaIndex(0);
    }, 50);
  }

  function removePreview(id: string) {
    setFilePreviews((p) => {
      const target = p.find((x) => x.id === id);
      if (target) URL.revokeObjectURL(target.preview);
      const next = p.filter((x) => x.id !== id);
      setMainMediaIndex((idx) => Math.max(0, Math.min(idx, next.length - 1)));
      return next;
    });
  }

  function removeMedia(url: string) {
    setMedia((m) => m.filter((x) => x.url !== url));
  }

  // Supabase upload helpers
  async function uploadFileToBucket(file: File, type: "image" | "video") {
    const bucket = type === "image" ? "listing-images" : "listing-videos";
    const ext = file.name.split(".").pop() ?? "bin";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
    const path = filename;

    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  async function handleUploadAndSave() {
    if (!title || !price) {
      alert("Judul dan harga wajib diisi.");
      return;
    }

    setUploading(true);
    setProgressPct(0);
    setMedia([]);

    const totalFiles = filePreviews.length;
    let completed = 0;
    const uploadedItems: MediaItem[] = [];

    try {
      for (const p of filePreviews) {
        try {
          const url = await uploadFileToBucket(p.file, p.type);
          uploadedItems.push({ type: p.type, url });
          setFilePreviews((list) => list.map((it) => (it.id === p.id ? { ...it, uploadedUrl: url } : it)));
        } catch (err: any) {
          console.error("Upload error for file", p.file.name, err);
          alert(`Gagal upload file "${p.file.name}": ${err.message || String(err)}`);
        } finally {
          completed++;
          setProgressPct(Math.round((completed / Math.max(1, totalFiles)) * 100));
        }
      }

      setMedia(uploadedItems);

      // insert listing
      const priceNum = Number(String(price).replace(/[^\d.-]/g, "")) || null;
      const kmNum = km ? Number(String(km).replace(/[^\d.-]/g, "")) : null;
      const yearNum = year ? Number(year) : null;

      const { data: listingData, error: listingError } = await supabase
        .from("listings")
        .insert([
          {
            title,
            brand,
            type: typeModel,
            year: yearNum,
            color,
            mileage: kmNum,
            price: priceNum,
            description,
            location,
          },
        ])
        .select()
        .single();

      if (listingError) {
        console.error("Listing insert error:", listingError);
        alert(
          "Gagal menyimpan listing. Jika ini karena izin (RLS), pastikan user login atau tambahkan kebijakan yang sesuai."
        );
        setUploading(false);
        return;
      }

      const listingId = listingData.id;

      if (uploadedItems.length > 0) {
        const mediaRows = uploadedItems.map((m) => ({
          listing_id: listingId,
          type: m.type,
          url: m.url,
        }));
        const { error: mediaError } = await supabase.from("media").insert(mediaRows);
        if (mediaError) {
          console.error("Media insert error:", mediaError);
          alert("Upload berhasil, tapi penyimpanan metadata media gagal. Periksa tabel media.");
        }
      }

      alert("✅ Iklan berhasil dibuat!");
      // reset
      setTitle("");
      setDescription("");
      setPrice("");
      setBrand("");
      setTypeModel("");
      setYear("");
      setColor("");
      setKm("");
      setLocation("");
      // revoke blob urls
      filePreviews.forEach((p) => URL.revokeObjectURL(p.preview));
      setFilePreviews([]);
      setMedia([]);
      setMainMediaIndex(0);
      setProgressPct(0);
    } catch (err: any) {
      console.error("Unexpected error:", err);
      alert("Terjadi kesalahan: " + (err.message || String(err)));
    } finally {
      setUploading(false);
    }
  }

  // search placeholder
  function handleSearchSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    alert(`Search: "${searchQuery}" in ${selectedCity} (demo)`);
  }

  const imagesPreview = filePreviews.filter((p) => p.type === "image");
  const videoPreview = filePreviews.find((p) => p.type === "video") ?? null;
  const combinedPreview = [...imagesPreview, ...(videoPreview ? [videoPreview] : [])];

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-3 sm:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header small */}
        <header className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-600">Lokasi:</div>
            <select
              className="border rounded px-3 py-2 text-sm"
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
            >
              <option>Jakarta Selatan</option>
              <option>Jakarta Pusat</option>
              <option>Bandung</option>
              <option>Surabaya</option>
            </select>
            <button
              onClick={() => {
                if (!("geolocation" in navigator)) {
                  alert("Geolocation tidak tersedia.");
                  return;
                }
                navigator.geolocation.getCurrentPosition(
                  (pos) => {
                    const txt = `Lat:${pos.coords.latitude.toFixed(2)},Lng:${pos.coords.longitude.toFixed(2)}`;
                    setSelectedCity(txt);
                    alert(`Lokasi terdeteksi: ${txt}`);
                  },
                  (err) => alert("Gagal deteksi lokasi: " + err.message)
                );
              }}
              className="ml-2 text-xs px-2 py-1 border rounded bg-white"
            >
              Deteksi Lokasi
            </button>
          </div>

          <div className="flex-1 mx-4">
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Temukan barang, merk, model..."
                className="w-full rounded border px-3 py-2 text-sm"
              />
              <button type="submit" className="bg-sky-600 text-white px-3 py-2 rounded text-sm">
                Cari
              </button>
            </form>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => alert("Buka Chat (demo)")} className="relative p-2 rounded hover:bg-gray-100" aria-label="chat">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-gray-700"><path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              {unreadChats > 0 && <span className="absolute -top-1 -right-0.5 bg-red-600 text-xs text-white rounded-full px-1">{unreadChats}</span>}
            </button>

            <button onClick={() => alert("Notifikasi (demo)")} className="relative p-2 rounded hover:bg-gray-100" aria-label="notifikasi">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-gray-700"><path d="M15 17h5l-1.405-1.405C18.79 14.79 18 13 18 11V8a6 6 0 10-12 0v3c0 2-0.79 3.79-0.595 4.595L4 17h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              {notificationsCount > 0 && <span className="absolute -top-1 -right-0.5 bg-red-600 text-xs text-white rounded-full px-1">{notificationsCount}</span>}
            </button>

            <div className="flex items-center gap-2 p-1 cursor-pointer" onClick={() => alert("Profil (demo)")}>
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm text-gray-700">U</div>
              <div className="hidden sm:block text-sm">{userName}</div>
            </div>
          </div>
        </header>

        {/* Two-column main area */}
        <div className="bg-white shadow-sm rounded-md p-6">
          <div className="grid md:grid-cols-12 gap-6">
            {/* LEFT: Media viewer (col-span 7) */}
            <div className="md:col-span-7">
              <div className="border rounded-md overflow-hidden">
                {/* main media */}
                <div className="w-full h-[420px] bg-gray-100 flex items-center justify-center">
                  {combinedPreview.length === 0 ? (
                    <div className="text-gray-400">Tidak ada media. Silakan pilih foto atau video.</div>
                  ) : combinedPreview[mainMediaIndex]?.type === "video" ? (
                    <video src={combinedPreview[mainMediaIndex].preview} controls className="w-full h-full object-cover" />
                  ) : (
                    <img src={combinedPreview[mainMediaIndex].preview} alt="main" className="w-full h-full object-cover" />
                  )}
                </div>

                {/* thumbnails */}
                <div className="p-3 border-t">
                  <div className="flex items-center gap-3 overflow-x-auto">
                    {/* input triggers */}
                    <div className="flex gap-2">
                      <input ref={fileInputRef} onChange={(e) => handleAddFiles(e.target.files, "image")} accept="image/*" multiple type="file" className="hidden" id="images-input-style" />
                      <label onClick={() => fileInputRef.current?.click()} className="cursor-pointer rounded border px-3 py-2 text-sm bg-white">Pilih Foto</label>

                      <input ref={videoInputRef} onChange={(e) => handleAddFiles(e.target.files, "video")} accept="video/*" type="file" className="hidden" id="video-input-style" />
                      <label onClick={() => videoInputRef.current?.click()} className="cursor-pointer rounded border px-3 py-2 text-sm bg-white">Pilih Video</label>
                    </div>

                    {combinedPreview.map((p, idx) => (
                      <div key={p.id} className="relative w-28 h-20 border rounded overflow-hidden cursor-pointer" onClick={() => setMainMediaIndex(idx)}>
                        {p.type === "video" ? (
                          <video src={p.preview} className="w-full h-full object-cover" />
                        ) : (
                          <img src={p.preview} className="w-full h-full object-cover" />
                        )}
                        <button onClick={(e) => { e.stopPropagation(); removePreview(p.id); }} className="absolute top-1 right-1 bg-white rounded-full p-1 text-red-600 shadow">✕</button>
                      </div>
                    ))}
                  </div>

                  {/* overall progress */}
                  {uploading && (
                    <div className="mt-3">
                      <div className="text-sm text-gray-600">Progress: {progressPct}%</div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div style={{ width: `${progressPct}%` }} className="h-2 bg-green-500 rounded-full" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* uploaded final media preview */}
              {media.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Media Ter-upload</h3>
                  <div className="flex gap-3 flex-wrap">
                    {media.map((m, i) => (
                      <div key={i} className="w-36 h-24 border rounded overflow-hidden relative">
                        {m.type === "image" ? (
                          <img src={m.url} className="object-cover w-full h-full" alt={`uploaded-${i}`} />
                        ) : (
                          <video src={m.url} className="object-cover w-full h-full" controls />
                        )}
                        <button onClick={() => removeMedia(m.url)} className="absolute top-1 right-1 bg-white rounded-full p-1 text-red-600 shadow">✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT: Form (col-span 5) */}
            <div className="md:col-span-5">
              <h2 className="text-lg font-semibold mb-3">Detail Iklan</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-600">Judul</label>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full border rounded px-3 py-2" placeholder="Contoh: Honda Vario 2019 - Terawat" />
                </div>

                <div>
                  <label className="block text-sm text-gray-600">Harga (Rp)</label>
                  <input value={price} onChange={(e) => setPrice(e.target.value)} className="mt-1 w-full border rounded px-3 py-2" placeholder="0" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-600">Merk</label>
                    <select value={brand} onChange={(e) => { setBrand(e.target.value); setTypeModel(""); }} className="mt-1 w-full border rounded px-3 py-2">
                      <option value="">— Pilih Merk —</option>
                      {brands.map((b) => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600">Type / Model</label>
                    <select value={typeModel} onChange={(e) => setTypeModel(e.target.value)} className="mt-1 w-full border rounded px-3 py-2">
                      <option value="">— Pilih Type —</option>
                      {typesForBrand.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-600">Tahun</label>
                    <select value={String(year)} onChange={(e) => setYear(e.target.value ? Number(e.target.value) : "")} className="mt-1 w-full border rounded px-3 py-2">
                      <option value="">— Pilih Tahun —</option>
                      {yearList(1980).map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600">Warna</label>
                    <select value={color} onChange={(e) => setColor(e.target.value)} className="mt-1 w-full border rounded px-3 py-2">
                      <option value="">— Pilih Warna —</option>
                      {COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-600">Kilometer (KM)</label>
                    <input value={km} onChange={(e) => setKm(e.target.value)} className="mt-1 w-full border rounded px-3 py-2" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600">Lokasi</label>
                    <input value={location} onChange={(e) => setLocation(e.target.value)} className="mt-1 w-full border rounded px-3 py-2" placeholder="Kota / Kecamatan" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-600">Deskripsi</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} className="mt-1 w-full border rounded px-3 py-2" placeholder="Tuliskan detail kondisi, servis, kelengkapan..." />
                </div>

                <div className="flex gap-3 mt-2">
                  <button type="button" onClick={() => {
                    // quick reset
                    setTitle(""); setDescription(""); setPrice(""); setBrand(""); setTypeModel(""); setYear(""); setColor(""); setKm(""); setLocation("");
                    filePreviews.forEach((p) => URL.revokeObjectURL(p.preview));
                    setFilePreviews([]); setMedia([]); setMainMediaIndex(0); setProgressPct(0);
                  }} className="flex-1 rounded border px-4 py-2">Reset</button>

                  <button type="button" onClick={async () => { await handleUploadAndSave(); }} disabled={uploading} className="flex-1 rounded bg-green-600 text-white px-4 py-2">
                    {uploading ? `Mengunggah... ${progressPct}%` : "Upload & Simpan Iklan"}
                  </button>
                </div>

                <div className="text-sm text-gray-500 mt-2">
                  Maks. 6 foto dan 1 video. Ukuran maksimal ditentukan oleh kebijakan storage Anda.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>  
    </div>
  );
}
