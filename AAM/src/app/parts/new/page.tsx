import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import PartForm from '../PartForm'

export const dynamic = 'force-dynamic'

export default async function NewPartPage() {
  const supabase = await createClient()
  const { data: vendors } = await supabase.from('vendors').select('id, name').order('name')

  return (
    <div>
      <Header title="Add Part" subtitle="Add a new part to your inventory catalog" />
      <div className="p-6">
        <PartForm vendors={vendors ?? []} />
      </div>
    </div>
  )
}
