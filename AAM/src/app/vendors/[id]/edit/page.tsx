import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import VendorForm from '../../VendorForm'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditVendorPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: vendor } = await supabase.from('vendors').select('*').eq('id', id).single()

  if (!vendor) notFound()

  return (
    <div>
      <Header title="Edit Vendor" subtitle={vendor.name} />
      <div className="p-6">
        <VendorForm vendor={vendor} />
      </div>
    </div>
  )
}
