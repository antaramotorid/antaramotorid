'use client'
import { supabase } from '../../../lib/supabaseClient'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

export default function ListingDetail() {
  const params = useParams()
  const id = params.id
  const [listing, setListing] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('listings').select('*').eq('id', id).single()
      setListing(data)
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return <main style={{padding:30}}>Memuat...</main>

  if (!listing) return <main style={{padding:30}}><p>Tidak ditemukan.</p></main>

  return (
    <main style={{ maxWidth: 800, margin:'40px auto', display:'grid', gap:20, gridTemplateColumns:'2fr 1fr' }}>
      <div>
        <h1 style={{fontSize:26, fontWeight:700}}>{listing.title}</h1>
        <div style={{marginTop:10,fontSize:18}}>Rp {Number(listing.price).toLocaleString("id-ID")}</div>
        <div style={{marginTop:10}}>Brand: {listing.brand}</div>
        <div style={{marginTop:10}}>Location: {listing.location}</div>
        <div style={{marginTop:10}}>{listing.description}</div>
      </div>

      <div>
        {listing.image_url && <img src={listing.image_url} style={{width:'100%',borderRadius:12}} />}
        {listing.contact_whatsapp && (
          <a
            href={`https://wa.me/${listing.contact_whatsapp}`}
            style={{display:'inline-block',marginTop:20,padding:'10px 14px',background:'#25D366',color:'#fff',borderRadius:8}}>
            Chat WhatsApp
          </a>
        )}
      </div>
    </main>
  )
}
