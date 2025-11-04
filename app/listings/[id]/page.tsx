import { supabase } from "@/lib/supabaseClient";

export default async function ListingDetail({ params }: { params: { id: string } }) {
  const { data: listing } = await supabase
    .from("listings")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!listing) return <div>Tidak ditemukan.</div>;

  return (
    <main style={{display:"grid", gap:16, gridTemplateColumns:"2fr 1fr"}}>
      <div>
        <h1 style={{fontSize:22, fontWeight:700}}>{listing.title}</h1>
        <div style={{marginTop:8}}>Rp {Number(listing.price).toLocaleString("id-ID")}</div>
        <p style={{marginTop:16, whiteSpace:"pre-wrap"}}>{listing.description}</p>
      </div>
      <aside style={{border:"1px solid #ddd", borderRadius:12, padding:12}}>
        <div style={{fontWeight:600}}>Hubungi Penjual</div>
        <a href={https://wa.me/${listing.contact_whatsapp}} style={{textDecoration:"underline"}}>WhatsApp</a>
        <div style={{marginTop:8, fontSize:13, opacity:.8}}>Lokasi: {listing.location}</div>
      </aside>
    </main>
  );
}
