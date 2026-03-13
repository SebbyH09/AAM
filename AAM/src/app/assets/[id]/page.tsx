import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import { Badge } from '@/components/ui/Badge'
import { formatDate, formatCurrency, statusColor, dueStatusBadge } from '@/lib/utils'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Edit, Plus, FileText, Wrench, ClipboardList, Clock } from 'lucide-react'
import DeleteAssetButton from './DeleteAssetButton'

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
    supabase.from('maintenance_records').select('*').eq('asset_id', id).order('performed_date', { ascending: false }).limit(10),
    supabase.from('repairs').select('*').eq('asset_id', id).order('reported_date', { ascending: false }),
    supabase.from('downtime_events').select('*').eq('asset_id', id).order('start_time', { ascending: false }).limit(10),
  ])

  if (!asset) notFound()

  const totalDowntimeHours = downtime?.reduce((sum, d) => sum + (d.duration_hours ?? 0), 0) ?? 0
  const totalRepairCost = repairs?.reduce((sum, r) => sum + (r.total_cost ?? 0), 0) ?? 0

  return (
    <div>
      <Header
        title={asset.name}
        subtitle={[asset.manufacturer, asset.model, asset.serial_number].filter(Boolean).join(' • ')}
        actions={
          <div className="flex gap-2">
            <Link
              href={`/assets/${id}/edit`}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Edit className="h-4 w-4" />
              Edit
            </Link>
            <DeleteAssetButton assetId={id} assetName={asset.name} />
          </div>
        }
      />

      <div className="p-6 space-y-6">
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
                    <div key={c.id} className="px-6 py-3">
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
              <Link
                href={`/maintenance/new?asset_id=${id}`}
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
              >
                <Plus className="h-4 w-4" /> Add
              </Link>
            </div>
            <div className="divide-y divide-gray-100">
              {plans && plans.length > 0 ? (
                plans.map((p) => {
                  const badge = dueStatusBadge(p.next_due_date)
                  return (
                    <div key={p.id} className="px-6 py-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">{p.name}</p>
                        <div className="flex gap-2">
                          <Badge className={statusColor(p.priority)}>{p.priority}</Badge>
                          <Badge className={badge.color}>{badge.label}</Badge>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {p.frequency} • Next due {formatDate(p.next_due_date)}
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
                  <div key={r.id} className="px-6 py-3">
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
            </div>
            <div className="divide-y divide-gray-100">
              {records && records.length > 0 ? (
                records.map((r) => (
                  <div key={r.id} className="px-6 py-3">
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
      </div>
    </div>
  )
}
