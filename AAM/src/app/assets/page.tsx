import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import AssetsClient from './AssetsClient'
import AssetsPageActions from './AssetsPageActions'

export const dynamic = 'force-dynamic'

export default async function AssetsPage() {
  const supabase = await createClient()

  const { data: assets, error } = await supabase
    .from('assets')
    .select('*')
    .order('name')

  return (
    <div>
      <Header
        title="Assets"
        subtitle="Manage all instruments and equipment"
        actions={<AssetsPageActions />}
      />

      <div className="p-6">
        <AssetsClient assets={assets ?? []} />
      </div>
    </div>
  )
}
