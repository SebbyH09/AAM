import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import { Badge } from '@/components/ui/Badge'
import { formatDate, statusColor, dueStatusBadge } from '@/lib/utils'
import { ASSET_GROUP_PICKER_COLUMNS, ASSET_PICKER_COLUMNS } from '@/lib/assetPicker'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ClipboardList, FileText, Wrench, Zap } from 'lucide-react'
import GroupDetailClient from './GroupDetailClient'
import GroupActions from './GroupActions'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AssetGroupPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: group }, { data: members }, { data: allAssets }, { data: allGroups }] = await Promise.all([
    supabase.from('asset_groups').select('*').eq('id', id).single(),
    supabase.from('assets').select('*').eq('group_id', id).order('name'),
    supabase.from('assets').select(ASSET_PICKER_COLUMNS).order('name'),
    supabase.from('asset_groups').select(ASSET_GROUP_PICKER_COLUMNS).order('name'),
  ])

  if (!group) notFound()

  const memberIds = (members ?? []).map((m) => m.id)
  const memberNames = new Map((members ?? []).map((m) => [m.id, m.name]))

  const [{ data: plans }, { data: repairs }, { data: activeDowntime }, { data: contractLinks }] = memberIds.length > 0
    ? await Promise.all([
        supabase
          .from('maintenance_plans')
          .select('id, name, asset_id, next_due_date, priority, frequency, frequency_days')
          .in('asset_id', memberIds)
          .eq('is_active', true)
          .order('next_due_date'),
        supabase
          .from('repairs')
          .select('id, description, asset_id, reported_date, status, priority')
          .in('asset_id', memberIds)
          .in('status', ['open', 'in_progress', 'waiting_parts'])
          .order('reported_date', { ascending: false }),
        supabase
          .from('downtime_events')
          .select('id, asset_id, start_time, reason')
          .in('asset_id', memberIds)
          .is('end_time', null)
          .order('start_time'),
        supabase
          .from('service_contract_assets')
          .select('asset_id, service_contracts(id, vendor_name, contract_number, end_date, status)')
          .in('asset_id', memberIds),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }]

  // One row per contract, listing which of the group's assets it covers.
  const contracts = new Map<string, { id: string; vendor_name: string; contract_number: string | null; end_date: string; status: string; covered: string[] }>()
  for (const link of contractLinks ?? []) {
    const c = link.service_contracts as unknown as { id: string; vendor_name: string; contract_number: string | null; end_date: string; status: string } | null
    if (!c) continue
    const entry = contracts.get(c.id) ?? { ...c, covered: [] }
    entry.covered.push(memberNames.get(link.asset_id) ?? '')
    contracts.set(c.id, entry)
  }

  return (
    <div>
      <Header title={group.name} subtitle="Asset group" />

      <div className="p-6 space-y-6">
        <GroupDetailClient group={group} members={members ?? []} allAssets={allAssets ?? []} />

        <GroupActions
          group={{ id: group.id, name: group.name }}
          memberIds={memberIds}
          assets={allAssets ?? []}
          groups={allGroups ?? []}
          plans={(plans ?? []).map((p) => ({ ...p, asset_id: p.asset_id as string, asset_name: memberNames.get(p.asset_id as string) ?? '' }))}
          activeDowntime={(activeDowntime ?? []).map((d) => ({ ...d, asset_id: d.asset_id as string, asset_name: memberNames.get(d.asset_id as string) ?? '' }))}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-gray-200 px-6 py-4">
              <ClipboardList className="h-5 w-5 text-gray-500" />
              <h2 className="font-semibold text-gray-900">Upcoming Maintenance</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {plans && plans.length > 0 ? (
                plans.slice(0, 10).map((p) => {
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

          <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-gray-200 px-6 py-4">
              <Zap className="h-5 w-5 text-gray-500" />
              <h2 className="font-semibold text-gray-900">Ongoing Downtime</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {activeDowntime && activeDowntime.length > 0 ? (
                activeDowntime.map((d) => (
                  <Link key={d.id} href={`/assets/${d.asset_id}`} className="hover-row block px-6 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-gray-900">{memberNames.get(d.asset_id)}</p>
                      <Badge className="bg-red-100 text-red-800">{d.reason.replace(/_/g, ' ')}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">Down since {formatDate(d.start_time)}</p>
                  </Link>
                ))
              ) : (
                <p className="px-6 py-4 text-sm text-gray-400">None of this group&apos;s assets are down.</p>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-gray-200 px-6 py-4">
              <FileText className="h-5 w-5 text-gray-500" />
              <h2 className="font-semibold text-gray-900">Service Contracts</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {contracts.size > 0 ? (
                [...contracts.values()].map((c) => (
                  <Link key={c.id} href={`/contracts/${c.id}/edit`} className="hover-row block px-6 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-gray-900">
                        {c.vendor_name}
                        {c.contract_number && <span className="ml-1 text-gray-500">({c.contract_number})</span>}
                      </p>
                      <Badge className={statusColor(c.status)}>{c.status}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {c.covered.length === memberIds.length ? 'Covers the whole group' : `Covers ${c.covered.join(', ')}`} • Ends {formatDate(c.end_date)}
                    </p>
                  </Link>
                ))
              ) : (
                <p className="px-6 py-4 text-sm text-gray-400">No service contracts cover this group&apos;s assets.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
