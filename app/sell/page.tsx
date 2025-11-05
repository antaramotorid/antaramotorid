"use client";

import { useState } from "react";
import { supabase } from '../../lib/supabaseClient';

export default function SellPage() {
  const [title, setTitle] = useState("");
  const [brand, setBrand] = useState("");
  const [year, setYear] = useState("");
  const [price, setPrice] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    await supabase.from("listings").insert({
      title,
      brand,
      year: Number(year),
      price: Number(price),
    });

    setTitle("");
    setBrand("");
    setYear("");
    setPrice("");

    alert("Listing tersimpan!");
  }

  return (
    <main>
      <h1>Jual Motor</h1>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12, width: 280 }}>
        <input placeholder="Judul Listing" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input placeholder="Brand" value={brand} onChange={(e) => setBrand(e.target.value)} />
        <input placeholder="Tahun" value={year} onChange={(e) => setYear(e.target.value)} />
        <input placeholder="Harga" value={price} onChange={(e) => setPrice(e.target.value)} />
        <button type="submit">Simpan</button>
      </form>
    </main>
  );
}
