import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import MaintenanceHistoryClient from './MaintenanceHistoryClient'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function MaintenanceHistoryPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: asset }, { data: records }, { data: plans }] = await Promise.all([
    supabase.from('assets').select('*').eq('id', id).single(),
    supabase
      .from('maintenance_records')
      .select('*, maintenance_plans(name)')
      .eq('asset_id', id)
      .order('performed_date', { ascending: false }),
    supabase
      .from('maintenance_plans')
      .select('id, name')
      .eq('asset_id', id)
      .eq('is_active', true),
  ])

  if (!asset) notFound()

  return (
    <div>
      <Header
        title={`Maintenance History`}
        subtitle={`${asset.name}${asset.asset_tag ? ` (${asset.asset_tag})` : ''}`}
        actions={
          <Link
            href={`/assets/${id}`}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Asset
          </Link>
        }
      />
      <MaintenanceHistoryClient
        records={records ?? []}
        plans={plans ?? []}
        assetName={asset.name}
      />
    </div>
  )
}
