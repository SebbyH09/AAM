import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import CycleCountsClient from './CycleCountsClient'

export const dynamic = 'force-dynamic'

export default async function CycleCountsPage() {
  const supabase = await createClient()

  const { data: cycleCounts } = await supabase
    .from('cycle_counts')
    .select('*, inventory_items(name, sku, unit, location)')
    .order('count_date', { ascending: false })

  return (
    <div>
      <Header
        title="Cycle Counts"
        subtitle="Track and manage inventory cycle counts"
        actions={
          <Link
            href="/inventory/cycle-counts/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Count
          </Link>
        }
      />

      <div className="p-6">
        <CycleCountsClient cycleCounts={cycleCounts ?? []} />
      </div>
    </div>
  )
}
