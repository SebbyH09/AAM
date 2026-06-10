import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import Link from 'next/link'
import { Plus, Building2, Star } from 'lucide-react'
import { StatCard } from '@/components/ui/Card'
import VendorsClient from './VendorsClient'

export const dynamic = 'force-dynamic'

export default async function VendorsPage() {
  const supabase = await createClient()

  const [{ data: vendors }, { count: preferredCount }] = await Promise.all([
    supabase.from('vendors').select('*').order('name'),
    supabase.from('vendors').select('*', { count: 'exact', head: true }).eq('is_preferred', true),
  ])

  return (
    <div>
      <Header
        title="Vendors"
        subtitle="Manage your vendor and supplier directory"
        actions={
          <Link
            href="/vendors/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Vendor
          </Link>
        }
      />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Vendors"
            value={vendors?.length ?? 0}
            subtitle="In directory"
            icon={<Building2 className="h-6 w-6" />}
            color="blue"
          />
          <StatCard
            title="Preferred Vendors"
            value={preferredCount ?? 0}
            subtitle="Preferred partners"
            icon={<Star className="h-6 w-6" />}
            color="yellow"
          />
        </div>
        <VendorsClient vendors={vendors ?? []} />
      </div>
    </div>
  )
}
