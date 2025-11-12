"use client";

import React, { useMemo, useState, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";

export type MediaItem = { type: "image" | "video"; url: string };

/**
 * Full integrated Sell page:
 * - Upload real files to Supabase Storage (listing-images, listing-videos)
 * - Insert listing metadata to `listings` and media rows to `media`
 * - UI: header (search, location, chat, notif, profile), upload slots (6 images + 1 video), form
 *
 * Requirements (make sure set in env / GitHub Secrets / Vercel):
 * - NEXT_PUBLIC_SUPABASE_URL
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY (for client upload; better if user is authenticated)
 *
 * Notes about permissions:
 * - Storage policies should allow authenticated uploads (we assume user will be authenticated).
 * - If DB inserts are blocked by RLS, you will see error messages; follow alert guidance to fix policies or use service role.
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
  // form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<string>("");
  const [brand, setBrand] = useState<string>("");
  const [typeModel, setTypeModel] = useState<string>("");
  const [year, setYear] = useState<number | "">("");
  const [color, setColor] = useState<string>("");
  const [km, setKm] = useState<string>("");
  const [location, setLocation] = useState<string>("");

  // header controls
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCity, setSelectedCity] = useState<string>("Jakarta Selatan");
  const [notificationsCount, setNotificationsCount] = useState<number>(0);
  const [unreadChats, setUnreadChats] = useState<number>(0);
  const [userName] = useState<string>("User Demo");

  // upload state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  // preview list (local blob until uploaded)
  const [filePreviews, setFilePreviews] = useState<
    { id: string; file: File; preview: string; type: "image" | "video"; uploadedUrl?: string }[]
  >([]);
  const [media, setMedia] = useState<MediaItem[]>([]); // final uploaded urls
  const [uploading, setUploading] = useState(false);
  const [progressPct, setProgressPct] = useState<number>(0);

  const brands = useMemo(() => Object.keys(INDONESIA_BRANDS), []);
  const typesForBrand = useMemo(() => (brand ? INDONESIA_BRANDS[brand] ?? [] : []), [brand]);

  function handleAddFiles(files: FileList | null, fileType: "image" | "video") {
    if (!files) return;
    const arr = Array.from(files);
    if (fileType === "image") {
      // limit: 6 images total
      const existingImages = filePreviews.filter((p) => p.type === "image").length;
      const canTake = Math.max(0, 6 - existingImages);
      const pick = arr.slice(0, canTake);
      const newPreviews = pick.map((f) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        file: f,
        preview: URL.createObjectURL(f),
        type: "image" as const,
      }));
      setFilePreviews((p) => [...p, ...newPreviews]);
    } else {
      // video: only one
      const first = arr[0];
      if (!first) return;
      // remove existing video preview
      setFilePreviews((p) => {
        const images = p.filter((x) => x.type === "image");
        return [
          ...images,
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            file: first,
            preview: URL.createObjectURL(first),
            type: "video" as const,
          },
        ];
      });
    }
  }

  function removePreview(id: string) {
    setFilePreviews((p) => {
      const target = p.find((x) => x.id === id);
      if (target) URL.revokeObjectURL(target.preview);
      return p.filter((x) => x.id !== id);
    });
  }

  function removeMedia(url: string) {
    setMedia((m) => m.filter((x) => x.url !== url));
  }

  // ========== Upload to Supabase Storage ==========
  // Note: SDK doesn't provide fine-grain progress in browser for storage.upload;
  // so progress shown is per-file-completion fraction.
  async function uploadFileToBucket(file: File, type: "image" | "video") {
    const bucket = type === "image" ? "listing-images" : "listing-videos";
    const ext = file.name.split(".").pop() ?? "bin";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
    const path = filename;

    // perform upload
    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  async function handleUploadAndSave() {
    // validations
    if (!title || !price) {
      alert("Judul dan harga wajib diisi.");
      return;
    }
    if (filePreviews.length === 0) {
      if (!confirm("Anda belum memilih media. Lanjut tanpa media?")) return;
    }

    setUploading(true);
    setProgressPct(0);
    setMedia([]);

    const totalFiles = filePreviews.length;
    let completed = 0;
    const uploadedItems: MediaItem[] = [];

    try {
      // Upload each file sequentially (ensures predictable progress)
      for (const p of filePreviews) {
        try {
          const url = await uploadFileToBucket(p.file, p.type);
          uploadedItems.push({ type: p.type, url });
          // mark uploadedUrl for preview state (optional)
          setFilePreviews((list) => list.map((it) => (it.id === p.id ? { ...it, uploadedUrl: url } : it)));
        } catch (err: any) {
          console.error("Upload error for file", p.file.name, err);
          // show error but keep trying others
          alert(`Gagal upload file "${p.file.name}": ${err.message || String(err)}`);
        } finally {
          completed++;
          setProgressPct(Math.round((completed / Math.max(1, totalFiles)) * 100));
        }
      }

      setMedia(uploadedItems);

      // After all uploads, insert listing row
      // convert price/km to numbers
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
        // Common failure: RLS denies insert for anon user
        console.error("Listing insert error:", listingError);
        alert(
          "Gagal menyimpan listing ke database. Pesan: " +
            (listingError.message || JSON.stringify(listingError)) +
            "\n\nJika ini terkait izin (RLS), pastikan user sudah login atau atur policy DB (service role) untuk insert."
        );
        setUploading(false);
        return;
      }

      const listingId = listingData.id;

      // insert media rows
      if (uploadedItems.length > 0) {
        const mediaRows = uploadedItems.map((m) => ({
          listing_id: listingId,
          type: m.type,
          url: m.url,
        }));

        const { error: mediaError } = await supabase.from("media").insert(mediaRows);
        if (mediaError) {
          console.error("Media insert error:", mediaError);
          alert(
            "Upload berhasil tetapi gagal menyimpan metadata media. Pesan: " +
              (mediaError.message || JSON.stringify(mediaError)) +
              "\n\nAnda bisa periksa tabel media di Supabase."
          );
          // still consider listing saved
        }
      }

      alert("✅ Iklan berhasil dibuat!");
      // optional: reset form
      setTitle("");
      setDescription("");
      setPrice("");
      setBrand("");
      setTypeModel("");
      setYear("");
      setColor("");
      setKm("");
      setLocation("");
      setFilePreviews([]);
      setMedia([]);
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

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-3 sm:px-6">
      <div className="max-w-6xl mx-auto">
        {/* HEADER: location, search, chat/notif/profile */}
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
              <option>Semarang</option>
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

        {/* MAIN CARD */}
        <div className="bg-white shadow-sm rounded-md p-6">
          <h1 className="text-2xl font-semibold mb-4">Jual Kendaraan</h1>

          {/* UPLOAD AREA */}
          <section className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Upload Foto (maks. 6) & Video (1)</label>
            <div className="flex gap-4">
              <div className="w-full grid grid-cols-3 sm:grid-cols-6 gap-3">
                {Array.from({ length: 6 }).map((_, idx) => {
                  const slot = imagesPreview[idx];
                  return (
                    <div key={idx} className="relative rounded border border-dashed border-gray-300 h-28 flex items-center justify-center bg-gray-50 overflow-hidden">
                      {slot ? (
                        <>
                          <img src={slot.preview} alt={`img-${idx}`} className="object-cover w-full h-full" />
                          <button type="button" aria-label="remove" onClick={() => removePreview(slot.id)} className="absolute top-1 right-1 bg-white rounded-full p-1 text-red-600 shadow">✕</button>
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
                            {/* progress per-file is not fine-grain; we show overall progress bar for user */}
                            <div style={{ width: `${progressPct}%` }} className="h-full bg-green-500 transition-all" />
                          </div>
                        </>
                      ) : (
                        <div className="text-center text-xs text-gray-400">Foto {idx + 1}</div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="w-48 flex flex-col gap-2">
                <input ref={fileInputRef} onChange={(e) => handleAddFiles(e.target.files, "image")} accept="image/*" multiple type="file" className="hidden" id="images-input" />
                <label htmlFor="images-input" onClick={() => fileInputRef.current?.click()} className="cursor-pointer rounded-md px-3 py-2 border border-gray-300 text-sm text-gray-700 bg-white text-center">Pilih Foto</label>

                <div className="relative rounded border border-dashed border-gray-300 h-28 flex items-center justify-center bg-gray-50 overflow-hidden">
                  {videoPreview ? (
                    <>
                      <video src={videoPreview.preview} controls className="object-cover w-full h-full" />
                      <button type="button" onClick={() => removePreview(videoPreview.id)} className="absolute top-1 right-1 bg-white rounded-full p-1 text-red-600 shadow" aria-label="remove video">✕</button>
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
                        <div style={{ width: `${progressPct}%` }} className="h-full bg-green-500 transition-all" />
                      </div>
                    </>
                  ) : (
                    <div className="text-center text-xs text-gray-400">Video (maks. 1)</div>
                  )}
                </div>

                <input ref={videoInputRef} onChange={(e) => handleAddFiles(e.target.files, "video")} accept="video/*" type="file" className="hidden" id="video-input" />
                <label htmlFor="video-input" onClick={() => videoInputRef.current?.click()} className="cursor-pointer rounded-md px-3 py-2 border border-gray-300 text-sm text-gray-700 bg-white text-center">Pilih Video</label>

                <button type="button" onClick={async () => { await handleUploadAndSave(); }} className="mt-1 rounded bg-sky-600 text-white py-2 text-sm" disabled={uploading}>
                  {uploading ? `Mengunggah... ${progressPct}%` : "Upload & Simpan Iklan"}
                </button>
              </div>
            </div>

            {/* uploaded media (finalized) */}
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
          </section>

          {/* FORM */}
          <form onSubmit={(e) => { e.preventDefault(); /* form submit handled by upload button */ }} className="space-y-6">
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
                <select value={brand} onChange={(e) => { setBrand(e.target.value); setTypeModel(""); }} className="mt-1 w-full border rounded px-3 py-2">
                  <option value="">— Pilih Merk —</option>
                  {brands.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Type / Model</label>
                <select value={typeModel} onChange={(e) => setTypeModel(e.target.value)} className="mt-1 w-full border rounded px-3 py-2">
                  <option value="">— Pilih Type —</option>
                  {typesForBrand.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Tahun</label>
                <select value={String(year)} onChange={(e) => setYear(e.target.value ? Number(e.target.value) : "")} className="mt-1 w-full border rounded px-3 py-2">
                  <option value="">— Pilih Tahun —</option>
                  {yearList(1980).map((y) => <option key={y} value={y}>{y}</option>)}
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
                <input value={km} onChange={(e) => setKm(e.target.value)} className="mt-1 w-full border rounded px-3 py-2" placeholder="0" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Lokasi</label>
                <input value={location} onChange={(e) => setLocation(e.target.value)} className="mt-1 w-full border rounded px-3 py-2" placeholder="Kota / Kecamatan" />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => {
                // reset quick
                setTitle(""); setDescription(""); setPrice(""); setBrand(""); setTypeModel(""); setYear(""); setColor(""); setKm(""); setLocation("");
                setFilePreviews([]); setMedia([]); setProgressPct(0);
              }} className="rounded bg-gray-300 text-black px-4 py-2">Reset</button>

              <button type="button" onClick={async () => { await handleUploadAndSave(); }} className="rounded bg-green-600 text-white px-4 py-2" disabled={uploading}>
                {uploading ? `Mengunggah... ${progressPct}%` : "Simpan Iklan"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
