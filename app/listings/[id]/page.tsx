// app/listings/[id]/page.tsx
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'

type Listing = {
  id: string
  title: string
  brand: string | null
  year: number | null
  price: number | null
  location: string | null
  description: string | null
  whatsapp: string | null
}

type ListingImage = {
  id: string
  listing_id: string
  file_path: string
  sort_order: number | null
}

const publicUrl = (filePath?: string | null) => {
  if (!filePath) return null
  if (filePath.startsWith('http')) return filePath
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  return `${base}/storage/v1/object/public/${filePath}`
}

export default async function ListingDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const id = params.id

  // ambil data listing
  const { data: listing, error } = await supabase
    .from('listings')
    .select('*')
    .eq('id', id)
    .single<Listing>()

  if (error || !listing) {
    return (
      <main style={{ maxWidth: 900, margin: '40px auto' }}>
        <h1>Terjadi kesalahan</h1>
        <p>ID tidak valid: {id}</p>
        <p><Link href="/listings">← Kembali ke Listings</Link></p>
      </main>
    )
  }

  // ambil gambar pertama
  const { data: images } = await supabase
    .from('listing_images')
    .select('*')
    .eq('listing_id', id)
    .order('sort_order', { ascending: true })
    .limit(1)
    .returns<ListingImage[]>()

  const imgUrl = publicUrl(images?.[0]?.file_path)

  return (
    <main style={{ maxWidth: 900, margin: '40px auto', display: 'grid', gap: 20, gridTemplateColumns: '2fr 1fr' }}>
      <div>
        <p style={{ marginBottom: 12 }}>
          <Link href="/listings">← Kembali ke Listings</Link>
        </p>

        {imgUrl && (
          <img
            src={imgUrl}
            alt={listing.title}
            style={{ width: '100%', height: 420, objectFit: 'cover', borderRadius: 12, border: '1px solid #eee' }}
          />
        )}

        <h1 style={{ fontSize: 28, fontWeight: 700, marginTop: 16 }}>{listing.title}</h1>
        <p style={{ color: '#666', margin: '6px 0 12px' }}>
          {listing.brand ?? '-'} • {listing.year ?? '-'}{listing.location ? ` • ${listing.location}` : ''}
        </p>
        {typeof listing.price === 'number' && (
          <p style={{ fontSize: 22, fontWeight: 700 }}>
            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(listing.price)}
          </p>
        )}
        {listing.description && <p style={{ marginTop: 12 }}>{listing.description}</p>}
      </div>

      <aside style={{ alignSelf: 'start' }}>
        {listing.whatsapp && (
          <a
            href={`https://wa.me/${listing.whatsapp.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid #25D366',
              fontWeight: 600,
            }}
          >
            Chat via WhatsApp
          </a>
        )}
      </aside>
    </main>
  )
}
