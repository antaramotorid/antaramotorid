// app/listings/[id]/page.tsx
'use client'

import { supabase } from '@/lib/supabaseClient';

export default async function ListingDetailPage({ params }: { params: { id: string } }) {

  const { data: listing, error } = await supabase
    .from('listings')
    .select('*')
    .eq('id', params.id)      // uuid string jadi aman
    .single();

  if (error || !listing) {
    return (
      <main style={{ maxWidth:900, margin:'40px auto' }}>
        <h1>Terjadi kesalahan</h1>
        <p>Tidak ditemukan item dengan ID: {params.id}</p>
      </main>
    )
  }

  return (
    <main style={{ maxWidth:900, margin:'40px auto', display:'grid', gap:20, gridTemplateColumns:'2fr 1fr' }}>
      <div>
        <h1 style={{ fontSize:28, fontWeight:700 }}>{listing.title}</h1>
        <p>{listing.brand} - {listing.year}</p>
        <p>Rp {listing.price.toLocaleString()}</p>
      </div>
      <div>
        <h3>Info Penjual</h3>
        <p>- nanti kita isi kolom WA</p>
      </div>
    </main>
  )
}
