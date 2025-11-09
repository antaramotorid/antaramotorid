'use client';

import { useEffect, useRef, useState } from "react";

type Props = {
  maxImages?: number;          // default 6
  maxVideo?: number;           // default 1
  onChange?: (payload: { images: File[]; video: File | null }) => void;
};

export default function MediaPicker({ maxImages = 6, maxVideo = 1, onChange }: Props) {
  const [images, setImages] = useState<File[]>([]);
  const [video, setVideo] = useState<File | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onChange?.({ images, video });
  }, [images, video, onChange]);

  function onPickImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const onlyImages = files.filter((f) => /^image\//.test(f.type));
    const next = [...images, ...onlyImages].slice(0, maxImages);
    setImages(next);
    e.target.value = "";
  }

  async function onPickVideo(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const first = files.find((f) => /^video\//.test(f.type));
    if (!first) {
      e.target.value = "";
      return;
    }

    // Validasi durasi maksimal 3 menit
    try {
      const url = URL.createObjectURL(first);
      const probe = document.createElement("video");
      const validate = await new Promise<number>((resolve, reject) => {
        probe.preload = "metadata";
        probe.onloadedmetadata = () => resolve(probe.duration || 0);
        probe.onerror = () => reject(new Error("Gagal membaca metadata video"));
        probe.src = url;
      });
      URL.revokeObjectURL(url);

      if (validate > 180) {
        alert("Durasi video melebihi 3 menit. Silakan pilih video ≤ 3 menit.");
        e.target.value = "";
        return;
      }
    } catch {
      // Abaikan validasi bila gagal baca metadata
    }

    setVideo(first ? first : null);
    e.target.value = "";
  }

  function removeImage(idx: number) {
    const next = images.slice();
    next.splice(idx, 1);
    setImages(next);
  }

  function removeVideo() {
    setVideo(null);
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {/* Kontrol pilih media */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          style={{
            padding: "8px 12px",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            background: "#fff",
            cursor: "pointer",
          }}
        >
          Tambah Foto ({images.length}/{maxImages})
        </button>

        <button
          type="button"
          onClick={() => videoInputRef.current?.click()}
          disabled={!!video || maxVideo === 0}
          style={{
            padding: "8px 12px",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            background: video ? "#f3f4f6" : "#fff",
            cursor: video ? "not-allowed" : "pointer",
          }}
        >
          {video ? "Video terpilih" : `Tambah Video (max ${maxVideo})`}
        </button>

        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={onPickImages}
          hidden
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          onChange={onPickVideo}
          hidden
        />
      </div>

      {/* Grid thumbnail campur (video + foto) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
          gap: 10,
        }}
      >
        {/* Video (jika ada) tampil paling depan */}
        {video && (
          <div
            style={{
              position: "relative",
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              overflow: "hidden",
              background: "#000",
              aspectRatio: "1/1",
              display: "grid",
              placeItems: "center",
            }}
          >
            <video
              src={URL.createObjectURL(video)}
              muted
              playsInline
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            <div
              style={{
                position: "absolute",
                top: 6,
                left: 6,
                background: "rgba(0,0,0,.6)",
                color: "white",
                fontSize: 10,
                padding: "3px 6px",
                borderRadius: 6,
              }}
            >
              VIDEO
            </div>
            <button
              type="button"
              onClick={removeVideo}
              title="Hapus video"
              style={{
                position: "absolute",
                top: 6,
                right: 6,
                border: 0,
                background: "rgba(0,0,0,.6)",
                color: "white",
                fontSize: 12,
                padding: "4px 8px",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Foto-foto */}
        {images.map((file, i) => (
          <div
            key={i}
            style={{
              position: "relative",
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              overflow: "hidden",
              background: "#f9fafb",
              aspectRatio: "1/1",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={URL.createObjectURL(file)}
              alt={`foto-${i + 1}`}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            <div
              style={{
                position: "absolute",
                top: 6,
                left: 6,
                background: "rgba(255,255,255,.9)",
                color: "#111827",
                fontSize: 10,
                padding: "3px 6px",
                borderRadius: 6,
                border: "1px solid #e5e7eb",
              }}
            >
              FOTO {i + 1}
            </div>
            <button
              type="button"
              onClick={() => removeImage(i)}
              title="Hapus foto"
              style={{
                position: "absolute",
                top: 6,
                right: 6,
                border: 0,
                background: "rgba(0,0,0,.6)",
                color: "white",
                fontSize: 12,
                padding: "4px 8px",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
        * Batas: maksimal {maxImages} foto & {maxVideo} video (durasi ≤ 3 menit).
      </p>
    </div>
  );
}
