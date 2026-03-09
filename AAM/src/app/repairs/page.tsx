import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import RepairsClient from './RepairsClient'

export const dynamic = 'force-dynamic'

export default async function RepairsPage() {
  const supabase = await createClient()

  const { data: repairs } = await supabase
    .from('repairs')
    .select('*, assets(name, asset_tag)')
    .order('reported_date', { ascending: false })

  return (
    <div>
      <Header
        title="Repairs"
        subtitle="Track all repair work and service requests"
        actions={
          <Link
            href="/repairs/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Log Repair
          </Link>
        }
      />
      <div className="p-6">
        <RepairsClient repairs={repairs ?? []} />
      </div>
    </div>
  )
}
