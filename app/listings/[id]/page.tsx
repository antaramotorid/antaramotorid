import { supabase } from '../../../lib/supabaseClient';

export default async function ListingDetailPage({
  params,
}: { params: { id: string } }) {
  const id = Number(params.id);
  if (Number.isNaN(id)) return <main><p>ID tidak valid.</p></main>;

  const { data: listing, error } = await supabase
    .from('listings')
    .select('id,title,brand,year,price,location,description,contact_whatsapp,created_at')
    .eq('id', id)
    .single();

  if (error) return <main><p>Gagal memuat: {error.message}</p></main>;
  if (!listing) return <main><p>Tidak ditemukan.</p></main>;

  return (
    <main style={{ display:'grid', gap:20, gridTemplateColumns:'2fr 1fr', maxWidth:900, margin:'40px auto' }}>
      <div>
        <h1 style={{ fontSize:28, fontWeight:700 }}>{listing.title}</h1>
        {typeof listing.price === 'number' && (
          <div style={{ margin:'10px 0', fontSize:20 }}>
            Rp {listing.price.toLocaleString('id-ID')}
          </div>
        )}
        <ul style={{ lineHeight:1.9 }}>
          {listing.brand && <li><b>Brand:</b> {listing.brand}</li>}
          {listing.year && <li><b>Tahun:</b> {listing.year}</li>}
          {listing.location && <li><b>Lokasi:</b> {listing.location}</li>}
          {listing.created_at && <li><b>Diposting:</b> {new Date(listing.created_at).toLocaleDateString('id-ID')}</li>}
        </ul>

        {listing.description && (
          <section style={{ marginTop:20 }}>
            <h3 style={{ fontWeight:600, marginBottom:8 }}>Deskripsi</h3>
            <p>{listing.description}</p>
          </section>
        )}
      </div>

      <aside style={{ border:'1px solid #ddd', borderRadius:8, padding:18, height:'fit-content' }}>
        <div style={{ fontWeight:600, marginBottom:12 }}>Hubungi Penjual</div>
        {listing.contact_whatsapp ? (
          <a href={`https://wa.me/${listing.contact_whatsapp}`} target="_blank" rel="noopener noreferrer">
            WhatsApp: {listing.contact_whatsapp}
          </a>
        ) : (
          <span>Tidak ada nomor WhatsApp</span>
        )}
      </aside>
    </main>
  );
}
