import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import { Badge } from '@/components/ui/Badge'
import { formatDate, statusColor, dueStatusBadge } from '@/lib/utils'
import { ASSET_PICKER_COLUMNS } from '@/lib/assetPicker'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ClipboardList, Wrench } from 'lucide-react'
import GroupDetailClient from './GroupDetailClient'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AssetGroupPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: group }, { data: members }, { data: allAssets }] = await Promise.all([
    supabase.from('asset_groups').select('*').eq('id', id).single(),
    supabase.from('assets').select('*').eq('group_id', id).order('name'),
    supabase.from('assets').select(`${ASSET_PICKER_COLUMNS}, group_id`).order('name'),
  ])

  if (!group) notFound()

  const memberIds = (members ?? []).map((m) => m.id)
  const memberNames = new Map((members ?? []).map((m) => [m.id, m.name]))

  const [{ data: plans }, { data: repairs }] = memberIds.length > 0
    ? await Promise.all([
        supabase
          .from('maintenance_plans')
          .select('id, name, asset_id, next_due_date, priority, frequency')
          .in('asset_id', memberIds)
          .eq('is_active', true)
          .order('next_due_date')
          .limit(10),
        supabase
          .from('repairs')
          .select('id, description, asset_id, reported_date, status, priority')
          .in('asset_id', memberIds)
          .in('status', ['open', 'in_progress', 'waiting_parts'])
          .order('reported_date', { ascending: false }),
      ])
    : [{ data: [] }, { data: [] }]

  return (
    <div>
      <Header title={group.name} subtitle="Asset group" />

      <div className="p-6 space-y-6">
        <GroupDetailClient group={group} members={members ?? []} allAssets={allAssets ?? []} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-gray-200 px-6 py-4">
              <ClipboardList className="h-5 w-5 text-gray-500" />
              <h2 className="font-semibold text-gray-900">Upcoming Maintenance</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {plans && plans.length > 0 ? (
                plans.map((p) => {
                  const badge = dueStatusBadge(p.next_due_date)
                  return (
                    <Link key={p.id} href={`/assets/${p.asset_id}`} className="hover-row block px-6 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-gray-900">{p.name}</p>
                        <Badge className={badge.color}>{badge.label}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        {memberNames.get(p.asset_id)} • Due {formatDate(p.next_due_date)}
                      </p>
                    </Link>
                  )
                })
              ) : (
                <p className="px-6 py-4 text-sm text-gray-400">No active maintenance plans on this group&apos;s assets.</p>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-gray-200 px-6 py-4">
              <Wrench className="h-5 w-5 text-gray-500" />
              <h2 className="font-semibold text-gray-900">Open Repairs</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {repairs && repairs.length > 0 ? (
                repairs.map((r) => (
                  <Link key={r.id} href={`/repairs/${r.id}/edit`} className="hover-row block px-6 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-gray-900 truncate">{r.description}</p>
                      <Badge className={statusColor(r.status)}>{r.status.replace('_', ' ')}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {memberNames.get(r.asset_id)} • Reported {formatDate(r.reported_date)}
                    </p>
                  </Link>
                ))
              ) : (
                <p className="px-6 py-4 text-sm text-gray-400">No open repairs on this group&apos;s assets.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
