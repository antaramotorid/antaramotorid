// app/listings/[id]/page.tsx
import { supabase } from '../../../lib/supabaseClient';

export default async function ListingDetailPage({
  params,
}: { params: { id: string } }) {
  const id = Number(params.id);
  if (Number.isNaN(id)) {
    return <main><p>ID tidak valid.</p></main>;
  }

  const { data: listing, error } = await supabase
    .from('listings')
    .select('id,title,brand,year,price,location,description,contact_whatsapp,created_at')
    .eq('id', id)
    .single();

  if (error) return <main><p>Gagal memuat: {error.message}</p></main>;
  if (!listing) return <main><p>Tidak ditemukan.</p></main>;

  return (
    <main style={{ display:'grid', gap:16, gridTemplateColumns:'2fr 1fr' }}>
      <div>
        <h1 style={{ fontSize:22, fontWeight:700 }}>{listing.title}</h1>
        {typeof listing.price === 'number' && (
          <div style={{ marginTop:8 }}>Rp {listing.price.toLocaleString('id-ID')}</div>
        )}
        <ul style={{ marginTop:12, lineHeight:1.8 }}>
          {listing.brand && <li><b>Brand:</b> {listing.brand}</li>}
          {listing.year && <li><b>Tahun:</b> {listing.year}</li>}
          {listing.location && <li><b>Lokasi:</b> {listing.location}</li>}
        </ul>
        {listing.description && (
          <>
            <h2 style={{ marginTop:16, fontWeight:600 }}>Deskripsi</h2>
            <p>{listing.description}</p>
          </>
        )}
      </div>

      <aside style={{ border:'1px solid #ddd', borderRadius:8, padding:12, height:'fit-content' }}>
        <div style={{ fontWeight:600, marginBottom:8 }}>Hubungi Penjual</div>
        {listing.contact_whatsapp
          ? <a href={https://wa.me/${listing.contact_whatsapp}} target="_blank">WhatsApp: {listing.contact_whatsapp}</a>
          : <span>Kontak tidak tersedia</span>}
      </aside>
    </main>
  );
}
