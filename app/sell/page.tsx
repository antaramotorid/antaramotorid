"use client";

import React, { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export type MediaItem = { type: "image" | "video"; url: string };

export default function SellPage() {
  const [title, setTitle] = useState("");
  const [brand, setBrand] = useState("");
  const [type, setType] = useState("");
  const [year, setYear] = useState("");
  const [color, setColor] = useState("");
  const [mileage, setMileage] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");

  const [images, setImages] = useState<File[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [uploading, setUploading] = useState(false);
  const [mediaUrls, setMediaUrls] = useState<MediaItem[]>([]);

  // ========== Upload Media ke Supabase ==========
  async function uploadMedia(file: File, type: "image" | "video") {
    const bucket = type === "image" ? "listing-images" : "listing-videos";
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, { cacheControl: "3600", upsert: false });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return data.publicUrl;
  }

  async function handleUploadAll() {
    try {
      if (images.length === 0 && !video) {
        alert("Upload minimal 1 foto atau video");
        return;
      }
      setUploading(true);
      setProgress(0);
      const total = images.length + (video ? 1 : 0);
      let done = 0;
      const uploaded: MediaItem[] = [];

      for (const img of images) {
        const url = await uploadMedia(img, "image");
        uploaded.push({ type: "image", url });
        done++;
        setProgress(Math.round((done / total) * 100));
      }

      if (video) {
        const url = await uploadMedia(video, "video");
        uploaded.push({ type: "video", url });
        done++;
        setProgress(Math.round((done / total) * 100));
      }

      setMediaUrls(uploaded);
      alert("✅ Semua media berhasil diunggah!");
    } catch (error: any) {
      alert("❌ Upload gagal: " + error.message);
      console.error(error);
    } finally {
      setUploading(false);
    }
  }

  // ========== Submit Form ==========
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      title,
      brand,
      type,
      year,
      color,
      mileage,
      price,
      description,
      location,
      media: mediaUrls,
    };
    console.log("Kirim data iklan:", payload);
    alert("Data iklan siap dikirim (cek console).");
  }

  // ========== Render ==========
  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4 text-gray-800">
        Jual Motor Bekas
      </h1>

      {/* Upload Section */}
      <div className="bg-gray-50 border rounded-xl p-4 mb-6 shadow-sm">
        <p className="font-semibold mb-2">Upload Foto (maks. 6)</p>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => {
            const files = e.target.files ? Array.from(e.target.files) : [];
            if (files.length > 6) {
              alert("Maksimal 6 foto");
              return;
            }
            setImages(files);
          }}
          className="block mb-4"
        />
        <p className="font-semibold mb-2">Upload Video (opsional, maks. 1)</p>
        <input
          type="file"
          accept="video/*"
          onChange={(e) => setVideo(e.target.files?.[0] || null)}
          className="block"
        />
        {uploading && (
          <div className="mt-4">
            <p>Progress upload: {progress}%</p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
              <div
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}
        <button
          onClick={handleUploadAll}
          disabled={uploading}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          {uploading ? "Mengunggah..." : "Upload Sekarang"}
        </button>
      </div>

      {/* Form Info Kendaraan */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border rounded-xl p-4 shadow-sm space-y-3"
      >
        <input
          className="w-full border p-2 rounded"
          placeholder="Judul Iklan"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          className="w-full border p-2 rounded"
          placeholder="Merk / Brand"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
        />
        <input
          className="w-full border p-2 rounded"
          placeholder="Tipe / Model"
          value={type}
          onChange={(e) => setType(e.target.value)}
        />
        <select
          className="w-full border p-2 rounded"
          value={year}
          onChange={(e) => setYear(e.target.value)}
        >
          <option value="">Pilih Tahun</option>
          {Array.from(
            { length: new Date().getFullYear() - 1979 },
            (_, i) => new Date().getFullYear() - i
          ).map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <input
          className="w-full border p-2 rounded"
          placeholder="Warna"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />
        <input
          className="w-full border p-2 rounded"
          placeholder="Kilometer (KM)"
          value={mileage}
          onChange={(e) => setMileage(e.target.value)}
        />
        <input
          className="w-full border p-2 rounded"
          placeholder="Harga (Rp)"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
        <input
          className="w-full border p-2 rounded"
          placeholder="Lokasi"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <textarea
          className="w-full border p-2 rounded"
          placeholder="Deskripsi"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <button
          type="submit"
          className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
        >
          Simpan Iklan
        </button>
      </form>

      {/* Preview Media */}
      {mediaUrls.length > 0 && (
        <div className="mt-6">
          <h2 className="font-semibold mb-2 text-gray-700">Preview Media:</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {mediaUrls.map((m, i) =>
              m.type === "image" ? (
                <img
                  key={i}
                  src={m.url}
                  alt="uploaded"
                  className="rounded-lg border h-40 w-full object-cover"
                />
              ) : (
                <video
                  key={i}
                  src={m.url}
                  controls
                  className="rounded-lg border h-40 w-full object-cover"
                />
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
