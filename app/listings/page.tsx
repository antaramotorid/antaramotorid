"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

export type MediaItem = { type: "image" | "video"; url: string };
export type Listing = {
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
  media?: MediaItem[];
};

export default function ListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchListings();
  }, []);

  async function fetchListings() {
    try {
      setLoading(true);
      // Ambil data listing + media terkait
      const { data: listingsData, error: listingsError } = await supabase
        .from("listings")
        .select("*")
        .order("created_at", { ascending: false });

      if (listingsError) throw listingsError;

      const { data: mediaData, error: mediaError } = await supabase
        .from("media")
        .select("*");

      if (mediaError) throw mediaError;

      // Gabungkan media ke listing
      const combined = listingsData.map((listing) => ({
        ...listing,
        media: mediaData.filter((m) => m.listing_id === listing.id),
      }));

      setListings(combined);
    } catch (err: any) {
      console.error("Gagal mengambil listing:", err.message);
    } finally {
      setLoading(false);
    }
  }

  function formatPrice(num: number) {
    if (!num) return "-";
    return "Rp " + num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">
        Daftar Iklan Terbaru
      </h1>

      {loading ? (
        <p>Memuat data...</p>
      ) : listings.length === 0 ? (
        <p className="text-gray-500">Belum ada iklan.</p>
      ) : (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {listings.map((listing) => {
            const firstImage =
              listing.media?.find((m) => m.type === "image")?.url ||
              listing.media?.[0]?.url ||
              "https://placehold.co/400x300?text=No+Image";

            return (
              <Link
                key={listing.id}
                href={`/listings/${listing.id}`}
                className="block border rounded-lg shadow-sm hover:shadow-md transition overflow-hidden bg-white"
              >
                <img
                  src={firstImage}
                  alt={listing.title}
                  className="w-full h-48 object-cover"
                />
                <div className="p-3">
                  <h2 className="font-semibold text-gray-800 truncate">
                    {listing.title}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {listing.brand} {listing.type}
                  </p>
                  <p className="text-green-700 font-semibold mt-1">
                    {formatPrice(listing.price)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {listing.year} • {listing.mileage} KM
                  </p>
                  <p className="text-xs text-gray-500">{listing.location}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
