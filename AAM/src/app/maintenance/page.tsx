import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import MaintenanceClient from './MaintenanceClient'

export const dynamic = 'force-dynamic'

export default async function MaintenancePage() {
  const supabase = await createClient()

  const { data: plans } = await supabase
    .from('maintenance_plans')
    .select('*, assets(id, name, asset_tag, location, category, status)')
    .order('next_due_date')

  return (
    <div>
      <Header
        title="Maintenance Plans"
        subtitle="Schedule and track preventive maintenance"
        actions={
          <Link
            href="/maintenance/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Plan
          </Link>
        }
      />
      <div className="p-6">
        <MaintenanceClient plans={plans ?? []} />
      </div>
    </div>
  )
}
