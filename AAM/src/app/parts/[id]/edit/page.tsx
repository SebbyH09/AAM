import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import PartForm from '../../PartForm'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditPartPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: part }, { data: vendors }] = await Promise.all([
    supabase.from('parts').select('*').eq('id', id).single(),
    supabase.from('vendors').select('id, name').order('name'),
  ])

  if (!part) notFound()

  return (
    <div>
      <Header title="Edit Part" subtitle={part.name} />
      <div className="p-6">
        <PartForm vendors={vendors ?? []} part={part} />
      </div>
    </div>
  )
}
