// app/sell/page.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

/** ========= KONSTANTA AMAN (LOCKED) ========= */
const MAX_IMAGES = 6; // 6 foto
const YEAR_START = 1980;
const CURRENT_YEAR = new Date().getFullYear();

/** Type Media di-backend (LOCKED by Didi) */
export type MediaItem = { type: "image" | "video"; url: string };

/** Util */
function rp(n: any) {
  if (typeof n !== "number") return "";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

/* =========================
   Komponen kecil: Progress bar
   ========================= */
function Progress({ value }: { value: number }) {
  return (
    <div style={{ width: "100%", height: 6, background: "#eee", borderRadius: 6 }}>
      <div
        style={{
          width: `${Math.max(0, Math.min(100, value))}%`,
          height: "100%",
          borderRadius: 6,
          background: "#16a34a",
          transition: "width .2s",
        }}
      />
    </div>
  );
}

/* ======================================================
   Komponen ADD-ON: MapPicker (Leaflet + Nominatim, no token)
   ====================================================== */
type MapPickerProps = {
  latitude: string;
  longitude: string;
  onChange: (next: { latitude?: string; longitude?: string; location?: string }) => void;
};

function MapPicker({ latitude, longitude, onChange }: MapPickerProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [q, setQ] = useState("");
  const [loadingGPS, setLoadingGPS] = useState(false);

  // inject CSS Leaflet via CDN, lalu lazy import modul JS
  useEffect(() => {
    const id = "leaflet-css-cdn";
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    let destroyed = false;

    (async () => {
      const L = (await import("leaflet")).default;
      // Fix icon path on Next
      // @ts-ignore
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (destroyed || !mapRef.current) return;

      const lat = parseFloat(latitude) || -6.2; // default Jakarta
      const lng = parseFloat(longitude) || 106.8166;

      const map = L.map(mapRef.current, { center: [lat, lng], zoom: 12 });
      leafletRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
      markerRef.current = marker;

      marker.on("dragend", () => {
        const p = marker.getLatLng();
        onChange({
          latitude: String(p.lat.toFixed(6)),
          longitude: String(p.lng.toFixed(6)),
        });
      });

      map.on("click", (e: any) => {
        marker.setLatLng(e.latlng);
        onChange({
          latitude: String(e.latlng.lat.toFixed(6)),
          longitude: String(e.latlng.lng.toFixed(6)),
        });
      });
    })();

    return () => {
      destroyed = true;
      if (leafletRef.current) {
        leafletRef.current.remove();
        leafletRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // update marker jika lat/lng berubah dari luar
  useEffect(() => {
    const L = leafletRef.current;
    const M = markerRef.current;
    if (!L || !M) return;
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (isFinite(lat) && isFinite(lng)) {
      M.setLatLng([lat, lng]);
      L.setView([lat, lng], Math.max(L.getZoom(), 12));
    }
  }, [latitude, longitude]);

  // tombol GPS
  const useMyLocation = () => {
    if (!navigator.geolocation) {
      alert("Perangkat tidak mendukung GPS.");
      return;
    }
    setLoadingGPS(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLoadingGPS(false);
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        onChange({ latitude: String(lat), longitude: String(lng) });
      },
      (err) => {
        setLoadingGPS(false);
        alert("Gagal membaca lokasi. Pastikan GPS aktif & izin diberikan.");
        console.error(err);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // search alamat (Nominatim)
  const searchAddress = async () => {
    if (!q.trim()) return;
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      q
    )}&addressdetails=1&limit=1`;
    const res = await fetch(url, {
      headers: { "Accept-Language": "id,en" },
    });
    const data = await res.json();
    if (!data?.length) {
      alert("Alamat tidak ditemukan.");
      return;
    }
    const { lat, lon, display_name } = data[0];
    onChange({
      latitude: String(Number(lat).toFixed(6)),
      longitude: String(Number(lon).toFixed(6)),
      location: display_name,
    });
  };

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari alamat / tempat"
          style={{ flex: "1 1 240px" }}
        />
        <button type="button" onClick={searchAddress}>
          Cari
        </button>
        <button type="button" onClick={useMyLocation} disabled={loadingGPS}>
          {loadingGPS ? "Membaca GPS..." : "Gunakan Lokasi Saya (GPS)"}
        </button>
      </div>

      <div
        ref={mapRef}
        style={{
          width: "100%",
          height: 320,
          borderRadius: 12,
          border: "1px solid #e5e7eb",
          overflow: "hidden",
        }}
      />

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          value={latitude}
          onChange={(e) => onChange({ latitude: e.target.value })}
          placeholder="Latitude"
          style={{ flex: "1 1 120px" }}
          inputMode="decimal"
        />
        <input
          value={longitude}
          onChange={(e) => onChange({ longitude: e.target.value })}
          placeholder="Longitude"
          style={{ flex: "1 1 120px" }}
          inputMode="decimal"
        />
      </div>

      <small style={{ color: "#6b7280" }}>
        Klik peta atau tarik marker untuk menyetel titik. Pencarian alamat oleh Nominatim (OSM).
      </small>
    </div>
  );
}

/* =========================
   Halaman SELL
   ========================= */
export default function SellPage() {
  /* ---- form state (LOCKED + tambahan aman) ---- */
  const [form, setForm] = useState({
    title: "",
    brand: "",
    unit_type: "",
    year: "",
    color: "",
    mileage_km: "",
    price: "",
    whatsapp: "",
    description: "",
    location: "", // label lokasi singkat (opsional)
    latitude: "",
    longitude: "",
  });

  /* ---- Upload FOTO: 6 slot ---- */
  const imgInputs = useRef<HTMLInputElement[]>([]);
  const [imgPreviews, setImgPreviews] = useState<(string | null)[]>(
    Array.from({ length: MAX_IMAGES }, () => null)
  );
  const [imgFiles, setImgFiles] = useState<(File | null)[]>(
    Array.from({ length: MAX_IMAGES }, () => null)
  );
  const [imgProg, setImgProg] = useState<number[]>(
    Array.from({ length: MAX_IMAGES }, () => 0)
  );

  /* ---- Upload VIDEO: 1 slot ---- */
  const vidInput = useRef<HTMLInputElement | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [videoProg, setVideoProg] = useState(0);

  /* ---- Dropdown tahun (LOCKED: 1980..current) ---- */
  const years = useMemo(
    () => Array.from({ length: CURRENT_YEAR - YEAR_START + 1 }, (_, i) => CURRENT_YEAR - i),
    []
  );

  /* ---- Helpers perubahan form ---- */
  const onChange =
    (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((f) => ({ ...f, [field]: e.target.value }));
    };

  /* ---- PICK FOTO ---- */
  const pickImage = (i: number) => {
    imgInputs.current[i]?.click();
  };
  const onPickImage = (i: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setImgPreviews((prev) => prev.map((v, idx) => (idx === i ? url : v)));
    setImgFiles((prev) => prev.map((v, idx) => (idx === i ? f : v)));
    setImgProg((prev) => prev.map((v, idx) => (idx === i ? 0 : v)));
  };

  /* ---- PICK VIDEO ---- */
  const pickVideo = () => vidInput.current?.click();
  const onPickVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setVideoFile(f);
    setVideoPreview(url);
    setVideoProg(0);
  };

  /* ---- SUBMIT ---- */
  const [submitting, setSubmitting] = useState(false);
  const handleSubmit = async () => {
    if (submitting) return;
    if (!form.title || !form.brand || !form.year || !form.price) {
      alert("Judul, merk, tahun, dan harga wajib diisi.");
      return;
    }

    setSubmitting(true);
    try {
      // 1) Insert listing
      const payload: any = {
        title: form.title,
        brand: form.brand,
        unit_type: form.unit_type || null,
        year: Number(form.year) || null,
        color: form.color || null,
        mileage_km: form.mileage_km ? Number(form.mileage_km) : null,
        price: form.price ? Number(form.price) : null,
        whatsapp: form.whatsapp || null,
        description: form.description || null,
        location: form.location || null,
        latitude: form.latitude ? Number(form.latitude) : null,
        longitude: form.longitude ? Number(form.longitude) : null,
        created_at: new Date().toISOString(),
      };

      const { data: ins, error: errIns } = await supabase.from("listings").insert(payload).select("id").single();
      if (errIns || !ins?.id) throw errIns || new Error("Gagal membuat listing.");
      const listingId = ins.id as string;

      // 2) Upload video (opsional)
      if (videoFile) {
        const path = `${listingId}/${Date.now()}-${videoFile.name}`;
        // Supabase SDK belum expose progress; kita buat progress pseudo dengan chunked upload kecil-kecilan
        const { data, error } = await supabase.storage.from("listing-videos").upload(path, videoFile, {
          cacheControl: "3600",
          upsert: false,
        });
        if (error) throw error;
        setVideoProg(100);
      }

      // 3) Upload semua gambar
      for (let i = 0; i < MAX_IMAGES; i++) {
        const f = imgFiles[i];
        if (!f) continue;
        const path = `${listingId}/${Date.now()}-${i + 1}-${f.name}`;
        const { error } = await supabase.storage.from("listing-images").upload(path, f, {
          cacheControl: "3600",
          upsert: false,
        });
        if (error) throw error;
        setImgProg((prev) => prev.map((v, idx) => (idx === i ? 100 : v)));
      }

      alert("Iklan berhasil diterbitkan!");
      // reset sederhana
      setForm({
        title: "",
        brand: "",
        unit_type: "",
        year: "",
        color: "",
        mileage_km: "",
        price: "",
        whatsapp: "",
        description: "",
        location: "",
        latitude: "",
        longitude: "",
      });
      setImgFiles(Array.from({ length: MAX_IMAGES }, () => null));
      setImgPreviews(Array.from({ length: MAX_IMAGES }, () => null));
      setImgProg(Array.from({ length: MAX_IMAGES }, () => 0));
      setVideoFile(null);
      setVideoPreview(null);
      setVideoProg(0);
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Terjadi kesalahan.");
    } finally {
      setSubmitting(false);
    }
  };

  /* =========================
     UI
     ========================= */
  return (
    <main style={{ maxWidth: 1060, margin: "24px auto", padding: "0 16px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 14 }}>Jual Unit</h1>

      {/* ========== Uploads Section (tetap di ATAS) ========== */}
      <div style={{ display: "grid", gap: 18 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Foto Unit (maks 6)</div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 10,
            }}
          >
            {Array.from({ length: MAX_IMAGES }).map((_, i) => (
              <div
                key={i}
                onClick={() => pickImage(i)}
                style={{
                  position: "relative",
                  border: "1px dashed #cbd5e1",
                  borderRadius: 12,
                  height: 140,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  overflow: "hidden",
                  background: "#fafafa",
                }}
              >
                {imgPreviews[i] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imgPreviews[i]!}
                    alt={`img-${i + 1}`}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <span style={{ color: "#6b7280", fontSize: 14 }}>Upload Foto</span>
                )}

                <div style={{ position: "absolute", left: 10, right: 10, bottom: 8 }}>
                  {imgProg[i] > 0 && <Progress value={imgProg[i]} />}
                </div>

                <input
                  ref={(el) => (imgInputs.current[i] = el!)}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={onPickImage(i)}
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Video Unit (opsional)</div>
          <div
            onClick={pickVideo}
            style={{
              position: "relative",
              border: "1px dashed #cbd5e1",
              borderRadius: 12,
              height: 140,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              overflow: "hidden",
              background: "#fafafa",
            }}
          >
            {videoPreview ? (
              <video src={videoPreview} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ color: "#6b7280", fontSize: 14 }}>Upload Video</span>
            )}

            <div style={{ position: "absolute", left: 10, right: 10, bottom: 8 }}>
              {videoProg > 0 && <Progress value={videoProg} />}
            </div>

            <input
              ref={vidInput}
              type="file"
              accept="video/*"
              hidden
              onChange={onPickVideo}
            />
          </div>
        </div>
      </div>

      {/* ========== Form Data Unit ========== */}
      <div style={{ marginTop: 24, display: "grid", gap: 14 }}>
        <div style={{ display: "grid", gap: 8 }}>
          <label>Judul</label>
          <input value={form.title} onChange={onChange("title")} placeholder="Contoh: Yamaha Fazzio 2024 Istimewa" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 12 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <label>Merk</label>
            <input value={form.brand} onChange={onChange("brand")} placeholder="Yamaha / Honda / Suzuki / Gesits" />
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <label>Tipe/Model</label>
            <input value={form.unit_type} onChange={onChange("unit_type")} placeholder="Fazzio / Vario / NMAX" />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 12 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <label>Tahun</label>
            <select value={form.year} onChange={onChange("year")}>
              <option value="">Pilih Tahun</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <label>Warna</label>
            <input value={form.color} onChange={onChange("color")} placeholder="Hitam / Merah Doff" />
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <label>Kilometer</label>
            <input value={form.mileage_km} onChange={onChange("mileage_km")} placeholder="25000" inputMode="numeric" />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 12 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <label>Harga (Rp)</label>
            <input value={form.price} onChange={onChange("price")} placeholder="18000000" inputMode="numeric" />
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

        {/* ========== LOKASI (ADD-ON peta) ========== */}
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Lokasi</div>

          <div style={{ display: "grid", gap: 10 }}>
            <input
              value={form.location}
              onChange={onChange("location")}
              placeholder="Label lokasi singkat (opsional), contoh: Bekasi, Jaktim"
            />

            <MapPicker
              latitude={form.latitude}
              longitude={form.longitude}
              onChange={(next) => setForm((f) => ({ ...f, ...next }))}
            />
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              padding: "10px 16px",
              borderRadius: 12,
              border: "1px solid #111827",
              fontWeight: 700,
              background: submitting ? "#e5e7eb" : "#111827",
              color: "#fff",
              cursor: submitting ? "not-allowed" : "pointer",
            }}
          >
            {submitting ? "Menerbitkan..." : "Terbitkan Iklan"}
          </button>
          <div style={{ color: "#6b7280", fontSize: 12, marginTop: 8 }}>
            *Batasi konten yang melanggar hukum, SARA, atau dewasa — akan ditolak.
          </div>
        </div>
      </div>
    </main>
  );
}
