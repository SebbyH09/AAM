import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import { Badge } from '@/components/ui/Badge'
import { formatDate, formatCurrency, statusColor } from '@/lib/utils'
import Link from 'next/link'
import { Plus, Package } from 'lucide-react'
import AssetsClient from './AssetsClient'

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
        actions={
          <Link
            href="/assets/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Asset
          </Link>
        }
      />

      <div className="p-6">
        <AssetsClient assets={assets ?? []} />
      </div>
    </div>
  )
}
