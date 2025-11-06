// app/listings/[id]/page.tsx
import { supabase } from '../../../lib/supabaseClient'

type Listing = {
  id: string
  title: string
  brand: string | null
  year: number | null
  price: number | null
  created_at: string
}

export default async function ListingDetailPage({
  params: { id },
}: {
  params: { id: string }
}) {
  const { data: listing, error } = await supabase
    .from('listings')
    .select('*')
    .eq('id', id)
    .single<Listing>()

  if (error || !listing) {
    return (
      <main style={{ maxWidth: 800, margin: '40px auto' }}>
        <h1 style={{ fontWeight: 700, fontSize: 24 }}>Terjadi kesalahan</h1>
        <p>{error?.message ?? 'Data tidak ditemukan.'}</p>
        <p style={{ marginTop: 12 }}>ID diminta: {id}</p>
      </main>
    )
  }

  return (
    <main
      style={{
        maxWidth: 900,
        margin: '40px auto',
        display: 'grid',
        gap: 20,
        gridTemplateColumns: '2fr 1fr',
      }}
    >
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 700 }}>{listing.title}</h1>
        <p>{listing.brand ?? '-'} — {listing.year ?? '-'}</p>
        {typeof listing.price === 'number' && (
          <p>Rp {listing.price.toLocaleString('id-ID')}</p>
        )}
      </div>

      <aside>
        <h3 style={{ fontWeight: 600 }}>Info Penjual</h3>
        <p>(Nanti tambah detail kontak.)</p>
      </aside>
    </main>
  )
}
