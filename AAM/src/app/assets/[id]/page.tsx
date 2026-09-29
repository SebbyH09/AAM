import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import { Badge } from '@/components/ui/Badge'
import { formatDate, formatCurrency, statusColor, dueStatusBadge } from '@/lib/utils'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Edit, Plus, FileText, Wrench, ClipboardList, Clock, Zap, Ruler, Wifi, Droplets, Wind, Thermometer, Tag, Factory, Box, Hash, Layers, ChevronRight } from 'lucide-react'
import DeleteAssetButton from './DeleteAssetButton'
import DeactivateAssetButton from './DeactivateAssetButton'
import AssetDocumentsSection from './AssetDocumentsSection'
import AddOneTimePmButton from './AddOneTimePmButton'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AssetDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: asset },
    { data: contracts },
    { data: plans },
    { data: records },
    { data: repairs },
    { data: downtime },
  ] = await Promise.all([
    supabase.from('assets').select('*').eq('id', id).single(),
    supabase.from('service_contracts').select('*').eq('asset_id', id).order('end_date'),
    supabase.from('maintenance_plans').select('*').eq('asset_id', id).order('next_due_date'),
    supabase.from('maintenance_records').select('*').eq('asset_id', id).order('performed_date', { ascending: false }),
    supabase.from('repairs').select('*').eq('asset_id', id).order('reported_date', { ascending: false }),
    supabase.from('downtime_events').select('*').eq('asset_id', id).order('start_time', { ascending: false }).limit(10),
  ])

  if (!asset) notFound()

  const [{ data: group }, { data: groupMembers }] = asset.group_id
    ? await Promise.all([
        supabase.from('asset_groups').select('*').eq('id', asset.group_id).single(),
        supabase.from('assets').select('id, name, asset_tag, model, status').eq('group_id', asset.group_id).neq('id', id).order('name'),
      ])
    : [{ data: null }, { data: null }]

  const totalDowntimeHours = downtime?.reduce((sum, d) => sum + (d.duration_hours ?? 0), 0) ?? 0
  const totalRepairCost = repairs?.reduce((sum, r) => sum + (r.total_cost ?? 0), 0) ?? 0

  return (
    <div>
      <Header
        title={asset.name}
        subtitle={asset.category}
        actions={
          <div className="flex gap-2">
            <Link
              href={`/assets/${id}/edit`}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Edit className="h-4 w-4" />
              Edit
            </Link>
            <DeactivateAssetButton assetId={id} assetName={asset.name} currentStatus={asset.status} />
            <DeleteAssetButton assetId={id} assetName={asset.name} />
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* Identification */}
        <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="grid grid-cols-1 divide-y divide-gray-100 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
            {[
              { label: 'Brand', value: asset.manufacturer, icon: Factory },
              { label: 'Model', value: asset.model, icon: Box },
              { label: 'Serial Number', value: asset.serial_number, icon: Hash, mono: true },
              { label: 'Asset Tag', value: asset.asset_tag, icon: Tag, mono: true },
            ].map(({ label, value, icon: Icon, mono }) => (
              <div key={label} className="flex items-start gap-3 px-6 py-4">
                <div className="rounded-lg bg-blue-50 p-2">
                  <Icon className="h-5 w-5 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
                  <p className={`mt-0.5 text-lg font-semibold break-words ${value ? 'text-gray-900' : 'text-gray-300'} ${mono && value ? 'font-mono' : ''}`}>
                    {value || '—'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Group membership */}
        {group && (
          <section className="rounded-xl border border-blue-200 bg-blue-50/40 shadow-sm">
            <div className="flex flex-col gap-2 border-b border-blue-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-blue-600" />
                <p className="text-sm text-gray-600">
                  Part of{' '}
                  <Link href={`/assets/groups/${group.id}`} className="font-semibold text-blue-700 hover:underline">
                    {group.name}
                  </Link>
                </p>
              </div>
              <Link href={`/assets/groups/${group.id}`} className="text-sm text-blue-600 hover:text-blue-800">
                View group →
              </Link>
            </div>
            {groupMembers && groupMembers.length > 0 ? (
              <div className="divide-y divide-blue-100">
                {groupMembers.map((m) => (
                  <Link key={m.id} href={`/assets/${m.id}`} className="hover-row flex items-center justify-between gap-3 px-6 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{m.name}</p>
                      <p className="text-xs text-gray-500">{[m.asset_tag, m.model].filter(Boolean).join(' • ')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={statusColor(m.status)}>{m.status}</Badge>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="px-6 py-3 text-sm text-gray-400">No other assets in this group yet.</p>
            )}
          </section>
        )}

        {/* Asset Info */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Status</p>
            <Badge className={`mt-1 ${statusColor(asset.status)}`}>{asset.status}</Badge>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Location</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{asset.location ?? '—'}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Date Installed</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{formatDate(asset.date_installed) || '—'}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total Downtime</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{totalDowntimeHours.toFixed(1)} hrs</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total Repair Cost</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{formatCurrency(totalRepairCost)}</p>
          </div>
        </div>

        {/* Facilities Information */}
        {(asset.power_requirements || asset.dimensions || asset.weight || asset.internet_requirements || asset.water_requirements || asset.air_gas_requirements || asset.ventilation_requirements || asset.environmental_requirements || asset.facilities_notes) && (
          <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="font-semibold text-gray-900">Facilities Information</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {asset.power_requirements && (
                  <div className="flex items-start gap-3">
                    <Zap className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Power</p>
                      <p className="text-sm text-gray-900 mt-0.5">{asset.power_requirements}</p>
                    </div>
                  </div>
                )}
                {asset.dimensions && (
                  <div className="flex items-start gap-3">
                    <Ruler className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Dimensions</p>
                      <p className="text-sm text-gray-900 mt-0.5">{asset.dimensions}</p>
                    </div>
                  </div>
                )}
                {asset.weight && (
                  <div className="flex items-start gap-3">
                    <Ruler className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Weight</p>
                      <p className="text-sm text-gray-900 mt-0.5">{asset.weight}</p>
                    </div>
                  </div>
                )}
                {asset.internet_requirements && (
                  <div className="flex items-start gap-3">
                    <Wifi className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Internet / Network</p>
                      <p className="text-sm text-gray-900 mt-0.5">{asset.internet_requirements}</p>
                    </div>
                  </div>
                )}
                {asset.water_requirements && (
                  <div className="flex items-start gap-3">
                    <Droplets className="mt-0.5 h-4 w-4 shrink-0 text-cyan-500" />
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Water / Drain</p>
                      <p className="text-sm text-gray-900 mt-0.5">{asset.water_requirements}</p>
                    </div>
                  </div>
                )}
                {asset.air_gas_requirements && (
                  <div className="flex items-start gap-3">
                    <Wind className="mt-0.5 h-4 w-4 shrink-0 text-teal-500" />
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Air / Gases</p>
                      <p className="text-sm text-gray-900 mt-0.5">{asset.air_gas_requirements}</p>
                    </div>
                  </div>
                )}
                {asset.ventilation_requirements && (
                  <div className="flex items-start gap-3">
                    <Wind className="mt-0.5 h-4 w-4 shrink-0 text-teal-500" />
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Ventilation</p>
                      <p className="text-sm text-gray-900 mt-0.5">{asset.ventilation_requirements}</p>
                    </div>
                  </div>
                )}
                {asset.environmental_requirements && (
                  <div className="flex items-start gap-3">
                    <Thermometer className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Environmental</p>
                      <p className="text-sm text-gray-900 mt-0.5">{asset.environmental_requirements}</p>
                    </div>
                  </div>
                )}
              </div>
              {asset.facilities_notes && (
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Facilities Notes</p>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{asset.facilities_notes}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Details Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Service Contracts */}
          <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <h2 className="font-semibold text-gray-900">Service Contracts</h2>
              </div>
              <Link
                href={`/contracts/new?asset_id=${id}`}
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
              >
                <Plus className="h-4 w-4" /> Add
              </Link>
            </div>
            <div className="divide-y divide-gray-100">
              {contracts && contracts.length > 0 ? (
                contracts.map((c) => {
                  const badge = dueStatusBadge(c.end_date)
                  return (
                    <div key={c.id} className="hover-row px-6 py-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">{c.vendor_name}</p>
                        <div className="flex gap-2">
                          <Badge className={statusColor(c.status)}>{c.status}</Badge>
                          <Badge className={badge.color}>{badge.label}</Badge>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {c.contract_type.replace('_', ' ')} • {formatDate(c.start_date)} – {formatDate(c.end_date)}
                      </p>
                      {c.file_name && (
                        <a href={c.file_url ?? '#'} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline mt-1 inline-block">
                          📎 {c.file_name}
                        </a>
                      )}
                    </div>
                  )
                })
              ) : (
                <p className="px-6 py-4 text-sm text-gray-400">No contracts attached.</p>
              )}
            </div>
          </section>

          {/* Maintenance Plans */}
          <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-green-600" />
                <h2 className="font-semibold text-gray-900">Maintenance Plans</h2>
              </div>
              <div className="flex items-center gap-4">
                <AddOneTimePmButton
                  assetId={id}
                  assetName={asset.name}
                  group={group ? { name: group.name, assetIds: [id, ...(groupMembers ?? []).map((m) => m.id)] } : undefined}
                />
                <Link
                  href={`/maintenance/new?asset_id=${id}`}
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                >
                  <Plus className="h-4 w-4" /> Add Plan
                </Link>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {plans && plans.length > 0 ? (
                plans.map((p) => {
                  const badge = p.is_active
                    ? dueStatusBadge(p.next_due_date)
                    : p.frequency === 'one_time' && p.last_performed_date
                      ? { label: 'Completed', color: 'bg-green-100 text-green-800' }
                      : { label: 'Inactive', color: 'bg-gray-100 text-gray-600' }
                  return (
                    <div key={p.id} className="hover-row px-6 py-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">{p.name}</p>
                        <div className="flex gap-2">
                          <Badge className={statusColor(p.priority)}>{p.priority}</Badge>
                          <Badge className={badge.color}>{badge.label}</Badge>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {p.frequency === 'one_time'
                          ? p.last_performed_date
                            ? `One-time • Performed ${formatDate(p.last_performed_date)}`
                            : `One-time • Due ${formatDate(p.next_due_date)}`
                          : `${p.frequency.replace('_', ' ')} • Next due ${formatDate(p.next_due_date)}`}
                      </p>
                    </div>
                  )
                })
              ) : (
                <p className="px-6 py-4 text-sm text-gray-400">No maintenance plans.</p>
              )}
            </div>
          </section>

          {/* Repairs */}
          <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-red-600" />
                <h2 className="font-semibold text-gray-900">Repairs</h2>
              </div>
              <Link
                href={`/repairs/new?asset_id=${id}`}
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
              >
                <Plus className="h-4 w-4" /> Log
              </Link>
            </div>
            <div className="divide-y divide-gray-100">
              {repairs && repairs.length > 0 ? (
                repairs.slice(0, 5).map((r) => (
                  <div key={r.id} className="hover-row px-6 py-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 truncate pr-2">{r.description}</p>
                      <Badge className={statusColor(r.status)}>{r.status.replace('_', ' ')}</Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(r.reported_date)}
                      {r.total_cost != null && ` • ${formatCurrency(r.total_cost)}`}
                    </p>
                  </div>
                ))
              ) : (
                <p className="px-6 py-4 text-sm text-gray-400">No repairs logged.</p>
              )}
            </div>
          </section>

          {/* Maintenance History */}
          <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-purple-600" />
                <h2 className="font-semibold text-gray-900">Maintenance History</h2>
              </div>
              {records && records.length > 0 && (
                <Link
                  href={`/assets/${id}/maintenance-history`}
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                >
                  View All ({records.length})
                </Link>
              )}
            </div>
            <div className="divide-y divide-gray-100">
              {records && records.length > 0 ? (
                records.slice(0, 5).map((r) => (
                  <div key={r.id} className="hover-row px-6 py-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">{r.type}</p>
                      <Badge className={statusColor(r.status)}>{r.status.replace('_', ' ')}</Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(r.performed_date)} • By {r.performed_by}
                      {r.cost != null && ` • ${formatCurrency(r.cost)}`}
                    </p>
                    {r.description && <p className="text-xs text-gray-600 mt-0.5 truncate">{r.description}</p>}
                  </div>
                ))
              ) : (
                <p className="px-6 py-4 text-sm text-gray-400">No maintenance records.</p>
              )}
            </div>
          </section>
        </div>

        {/* Notes */}
        {asset.notes && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Notes</h3>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{asset.notes}</p>
          </div>
        )}

        {/* Documents */}
        <AssetDocumentsSection assetId={id} />
      </div>
    </div>
  )
}
