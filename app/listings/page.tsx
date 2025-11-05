import { supabase } from '@/lib/supabaseClient';

export default async function ListingsPage() {
  const { data: listings, error } = await supabase
    .from('listings')
    .select('id,title,brand,year,price')
    .order('id', { ascending: false })
    .limit(20);

  if (error) {
    return <main><p>Error load data: {error.message}</p></main>
  }

  if (!listings || listings.length === 0) {
    return <main><p>Tidak ada data.</p></main>
  }

  return (
    <main style={{ maxWidth: 800, margin: "40px auto" }}>
      <h1 style={{ fontWeight: 600, fontSize: 22, marginBottom: 20 }}>Listing Terbaru</h1>

      <ul style={{ display:'grid', gap:18, gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))' }}>
        {listings.map((l) => (
          <li key={l.id} style={{ border:'1px solid #ddd', padding:12, borderRadius:8 }}>
