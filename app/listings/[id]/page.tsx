"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

export type MediaItem = {
  type: "image" | "video";
  url: string;
};

type Listing = {
  id: string;
  title: string;
  brand: string;
  type: string;
  year: number;
  color: string;
  mileage: number;
  price: number;
  location: string;
  description: string;
  created_at: string;
};

export default function ListingDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [listing, setListing] = useState<Listing | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchListing();
  }, [id]);

  async function fetchListing() {
    try {
      setLoading(true);
      const { data: listingData, error: listingError } = await supabase
        .from("listings")
        .select("*")
        .eq("id", id)
        .single();
      if (listingError) throw listingError;

      const { data: mediaData, error: mediaError } = await supabase
        .from("media")
        .select("*")
        .eq("listing_id", id);

      if (mediaError) throw mediaError;

      const mediaItems: MediaItem[] = mediaData.map((m) => ({
        type: m.type,
        url: m.url,
      }));

      setListing(listingData);
      setMedia(mediaItems);
    } catch (err: any) {
      console.error("Gagal memuat detail:", err.message);
    } finally {
      setLoading(false);
    }
  }

  function formatPrice(num: number) {
    if (!num) return "-";
    return "Rp " + num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  if (loading) return <div className="p-4">Memuat...</div>;
  if (!listing) return <div className="p-4">Iklan tidak ditemukan.</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-5">
      {/* === MEDIA SECTION === */}
      <div className="bg-white border rounded-xl p-3 shadow-sm">
        {media.length === 0 ? (
          <img
            src="https://placehold.co/800x500?text=No+Image"
            alt="no media"
            className="w-full h-96 object-cover rounded-lg"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {media.map((m, i) =>
              m.type === "video" ? (
                <video
                  key={i}
                  src={m.url}
                  controls
                  className="rounded-lg w-full h-96 object-cover"
                />
              ) : (
                <img
                  key={i}
                  src={m.url}
                  alt="media"
                  className="rounded-lg w-full h-96 object-cover"
                />
              )
            )}
          </div>
        )}
      </div>

      {/* === INFO SECTION === */}
      <div className="bg-white border rounded-xl p-4 shadow-sm space-y-2">
        <h1 className="text-2xl font-bold text-gray-800">{listing.title}</h1>
        <p className="text-lg font-semibold text-green-700">
          {formatPrice(listing.price)}
        </p>
        <p className="text-gray-700">
          {listing.brand} {listing.type} • {listing.year}
        </p>
        <p className="text-gray-600 text-sm">
          Warna: {listing.color} • {listing.mileage} KM
        </p>
        <p className="text-gray-500 text-sm">Lokasi: {listing.location}</p>
      </div>

      {/* === WHATSAPP SECTION === */}
      <div className="bg-white border rounded-xl p-4 shadow-sm flex justify-between items-center">
        <p className="font-semibold text-gray-700">Tertarik dengan iklan ini?</p>
        <a
          href={`https://wa.me/?text=Saya tertarik dengan iklan ${encodeURIComponent(
            listing.title
          )}`}
          target="_blank"
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
        >
          Hubungi via WhatsApp
        </a>
      </div>

      {/* === DESKRIPSI SECTION === */}
      <div className="bg-white border rounded-xl p-4 shadow-sm">
        <h2 className="font-semibold mb-2 text-gray-800">Deskripsi</h2>
        <p className="text-gray-700 whitespace-pre-line">
          {listing.description || "Tidak ada deskripsi"}
        </p>
      </div>

      {/* === MAPS SECTION === */}
      <div className="bg-white border rounded-xl p-4 shadow-sm">
        <h2 className="font-semibold mb-2 text-gray-800">Lokasi di Peta</h2>
        <iframe
          className="w-full h-64 rounded-lg border"
          loading="lazy"
          allowFullScreen
          src={`https://www.google.com/maps?q=${encodeURIComponent(
            listing.location || "Indonesia"
          )}&output=embed`}
        ></iframe>
      </div>
    </div>
  );
}
