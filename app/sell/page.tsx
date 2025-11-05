'use client';
import { useState } from "react";

export default function SellPage() {
  const [title, setTitle] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Nanti data ini akan kita simpan ke Supabase.");
  };

  return (
    <main>
      <h1 style={{ fontWeight: 600, fontSize: 20, marginBottom: 12 }}>Jual Motor</h1>

      <form onSubmit={submit} style={{ maxWidth: 480, display: 'grid', gap: 10 }}>
        <input
          placeholder="Judul Listing"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ padding: 10, border: '1px solid #ddd', borderRadius: 6 }}
        />
        <button
          style={{
            padding: 10,
            border: '1px solid #ddd',
            borderRadius: 6,
            cursor: 'pointer'
          }}
        >
          Simpan
        </button>
      </form>
    </main>
  );
}
