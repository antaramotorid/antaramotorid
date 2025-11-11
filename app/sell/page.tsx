"use client";

import React, { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type MediaItem = {
  type: "image" | "video";
  url: string;
};

export default function SellPage() {
  const [images, setImages] = useState<File[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [brand, setBrand] = useState("");
  const [type, setType] = useState("");
  const [year, setYear] = useState("");
  const [color, setColor] = useState("");
  const [mileage, setMileage] = useState("");
  const [location, setLocation] = useState("");
  const [mediaUrls, setMediaUrls] = useState<MediaItem[]>([]);

  // =====================================
  // ✅ Fungsi Upload ke Supabase Storage
  // =====================================
  async function uploadMedia(file: File, type: "image" | "video") {
    const bucket = type === "image" ? "listing-images" : "listing-videos";
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return data.publicUrl;
  }

  // =====================================
  // ✅ Handle Upload Semua Media
  // =====================================
  async function handleUpload() {
    try {
      if (images.length === 0 && !video) {
        alert("Unggah minimal 1 gambar atau video.");
        return;
      }
      setUploading(true);
      setProgress(0);

      const uploaded: MediaItem[] = [];
      const total = images.length + (video ? 1 : 0);
      let done = 0;

      // Upload semua gambar
      for (const img of images) {
        const url = await uploadMedia(img, "image");
        uploaded.push({ type: "image", url });
        done++;
        setProgress(Math.round((done / total) * 100));
      }

      // Upload video (jika ada)
      if (video) {
        const url = await uploadMedia(video, "video");
        uploaded.push({ type: "video", url });
        done++;
        setProgress(Math.round((done / total) * 100));
      }

      setMediaUrls(uploaded);
      alert("✅ Semua media berhasil diunggah.");
    } catch (error: any) {
      console.error(error);
      alert("❌ Gagal mengunggah media: " + error.message);
    } finally {
      setUploading(false);
    }
  }

  // =====================================
  // ✅ Render Upload Section (6 foto + 1 video)
  // =====================================
  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Jual Kendaraan</h1>

      {/* Upload Section */}
      <div className="mb-4 border rounded-lg p-4 bg-gray-50">
        <label className="font-semibold block mb-2">Upload Foto (maks. 6)</label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => {
            const files = e.target.files ? Array.from(e.target.files) : [];
            if (files.length > 6) {
              alert("Maksimal 6 foto.");
              return;
            }
            setImages(files);
          }}
        />
        <label className="font-semibold block mt-4 mb-2">
          Upload Video (maks. 1)
        </label>
        <input
          type="file"
          accept="video/*"
          onChange={(e) => setVideo(e.target.files?.[0] || null)}
        />
        {uploading && (
          <div className="mt-4">
            <p>Uploading... {progress}%</p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          {uploading ? "Mengunggah..." : "Upload Sekarang"}
        </button>
      </div>

      {/* Form Info Kendaraan */}
      <div className="space-y-3">
        <input
          className="w-full border p-2 rounded"
          placeholder="Judul Iklan"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="w-full border p-2 rounded"
          placeholder="Deskripsi"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <input
          className="w-full border p-2 rounded"
          placeholder="Harga"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
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
          placeholder="Lokasi"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
      </div>

      {/* Tampilkan URL Media yang diunggah */}
      {mediaUrls.length > 0 && (
        <div className="mt-6">
          <h2 className="font-semibold mb-2">Media Terunggah:</h2>
          <div className="grid grid-cols-2 gap-2">
            {mediaUrls.map((m, i) =>
              m.type === "image" ? (
                <img
                  key={i}
                  src={m.url}
                  alt="uploaded"
                  className="w-full h-32 object-cover rounded"
                />
              ) : (
                <video
                  key={i}
                  src={m.url}
                  controls
                  className="w-full h-32 rounded"
                />
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
