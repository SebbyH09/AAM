'use client'

import { useState, useMemo, useEffect } from 'react'
import { Badge } from '@/components/ui/Badge'
import { formatDate, formatCurrency, statusColor, dueStatusBadge, getDueStatus } from '@/lib/utils'
import Link from 'next/link'
import { Search, ClipboardList, CheckCircle2, AlertTriangle, Plus, Minus, Clock, MapPin, ChevronRight, Package, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import LogMaintenanceModal from './LogMaintenanceModal'
import AddServiceReportModal from '../contracts/AddServiceReportModal'

interface Plan {
  id: string
  name: string
  description: string | null
  asset_id: string | null
  frequency: string
  frequency_days: number | null
  next_due_date: string
  last_performed_date: string | null
  priority: string
  assigned_to: string | null
  is_active: boolean
  estimated_duration_hours: number | null
  estimated_cost: number | null
  parts: { name: string; quantity?: number; part_number?: string }[] | null
  checklist: any | null
  assets: { id: string; name: string; asset_tag: string | null; location: string | null; category: string; status: string } | null
}

interface MaintenanceClientProps {
  plans: Plan[]
}

interface AssetGroup {
  assetId: string | null
  assetName: string
  assetTag: string | null
  location: string | null
  category: string | null
  status: string | null
  plans: Plan[]
  nextDueDate: string
  overdueCount: number
  urgentCount: number
}

const PRIORITY_FILTERS = ['all', 'critical', 'high', 'medium', 'low']

export default function MaintenanceClient({ plans }: MaintenanceClientProps) {
  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [showActive, setShowActive] = useState(true)
  const [loggingPlan, setLoggingPlan] = useState<Plan | null>(null)
  const [detailPlan, setDetailPlan] = useState<Plan | null>(null)
  const [expandedAssets, setExpandedAssets] = useState<Set<string>>(new Set())
  const [showAddReport, setShowAddReport] = useState(false)
  const [planReports, setPlanReports] = useState<any[]>([])
  const [loadingReports, setLoadingReports] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (detailPlan) {
      loadPlanReports(detailPlan.id)
    } else {
      setPlanReports([])
    }
  }, [detailPlan?.id])

  async function loadPlanReports(planId: string) {
    setLoadingReports(true)
    const { data } = await supabase
      .from('service_reports')
      .select('id, report_date, technician, type, summary, findings, cost, status')
      .eq('maintenance_plan_id', planId)
      .order('report_date', { ascending: false })
    setPlanReports(data ?? [])
    setLoadingReports(false)
  }

  const filtered = plans.filter((p) => {
    const matchSearch =
      search === '' ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.assets?.name?.toLowerCase().includes(search.toLowerCase())) ||
      (p.assigned_to?.toLowerCase().includes(search.toLowerCase()))
    const matchPriority = priorityFilter === 'all' || p.priority === priorityFilter
    const matchActive = !showActive || p.is_active
    return matchSearch && matchPriority && matchActive
  })

  // Upcoming items: overdue + due this week, sorted by next_due_date
  const upcomingItems = useMemo(() => {
    return filtered
      .filter((p) => {
        const status = getDueStatus(p.next_due_date)
        return status === 'overdue' || status === 'urgent'
      })
      .slice(0, 5)
  }, [filtered])

  // Group plans by asset
  const assetGroups = useMemo(() => {
    const groups = new Map<string, AssetGroup>()

    for (const plan of filtered) {
      const key = plan.assets?.id ?? plan.asset_id ?? '_unassigned'

      if (!groups.has(key)) {
        groups.set(key, {
          assetId: plan.assets?.id ?? plan.asset_id,
          assetName: plan.assets?.name ?? 'Unassigned',
          assetTag: plan.assets?.asset_tag ?? null,
          location: plan.assets?.location ?? null,
          category: plan.assets?.category ?? null,
          status: plan.assets?.status ?? null,
          plans: [],
          nextDueDate: plan.next_due_date,
          overdueCount: 0,
          urgentCount: 0,
        })
      }

      const group = groups.get(key)!
      group.plans.push(plan)

      const dueStatus = getDueStatus(plan.next_due_date)
      if (dueStatus === 'overdue') group.overdueCount++
      if (dueStatus === 'urgent') group.urgentCount++

      if (plan.next_due_date < group.nextDueDate) {
        group.nextDueDate = plan.next_due_date
      }
    }

    // Sort: assets with overdue plans first, then by next due date
    return Array.from(groups.values()).sort((a, b) => {
      if (a.overdueCount > 0 && b.overdueCount === 0) return -1
      if (b.overdueCount > 0 && a.overdueCount === 0) return 1
      return a.nextDueDate.localeCompare(b.nextDueDate)
    })
  }, [filtered])

  const toggleAsset = (key: string) => {
    setExpandedAssets((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search plans or assets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={showActive} onChange={(e) => setShowActive(e.target.checked)}
              className="rounded text-blue-600" />
            Active only
          </label>
          {PRIORITY_FILTERS.map((p) => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                priorityFilter === p ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Upcoming Maintenance Items */}
      {upcomingItems.length > 0 && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-orange-800">
            <AlertTriangle className="h-4 w-4" />
            Upcoming &amp; Overdue ({upcomingItems.length})
          </h3>
          <div className="space-y-2">
            {upcomingItems.map((plan) => {
              const badge = dueStatusBadge(plan.next_due_date)
              return (
                <div key={plan.id} className="flex items-center justify-between rounded-lg bg-white px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    <Badge className={badge.color}>{badge.label}</Badge>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{plan.name}</p>
                      <p className="text-xs text-gray-500 truncate">{plan.assets?.name ?? 'Unassigned'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <Badge className={statusColor(plan.priority)}>{plan.priority}</Badge>
                    <button
                      onClick={() => setLoggingPlan(plan)}
                      className="inline-flex items-center gap-1 text-sm text-green-600 hover:text-green-800"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Log
                    </button>
                    <Link
                      href={`/maintenance/${plan.id}/edit`}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Assets with Maintenance Plans */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <ClipboardList className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-600">No maintenance plans found</p>
          <Link
            href="/maintenance/new"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Add Maintenance Plan
          </Link>
        </div>
      ) : (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-gray-700">
            Assets with Maintenance Plans ({assetGroups.length})
          </h3>
          <div className="space-y-2">
            {assetGroups.map((group) => {
              const key = group.assetId ?? '_unassigned'
              const isExpanded = expandedAssets.has(key)
              const nearestBadge = dueStatusBadge(group.nextDueDate)

              return (
                <div key={key} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                  {/* Asset Row */}
                  <button
                    onClick={() => toggleAsset(key)}
                    className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`flex h-6 w-6 items-center justify-center rounded-md text-gray-500 transition-colors ${isExpanded ? 'bg-blue-100 text-blue-600' : 'bg-gray-100'}`}>
                        {isExpanded ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900 truncate">{group.assetName}</p>
                          {group.assetTag && (
                            <span className="text-xs text-gray-400">{group.assetTag}</span>
                          )}
                          {group.category && (
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">{group.category}</span>
                          )}
                        </div>
                        {group.location && (
                          <p className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                            <MapPin className="h-3 w-3" />
                            {group.location}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {group.overdueCount > 0 && (
                        <Badge className="bg-red-100 text-red-800">{group.overdueCount} overdue</Badge>
                      )}
                      {group.urgentCount > 0 && (
                        <Badge className="bg-orange-100 text-orange-800">{group.urgentCount} due soon</Badge>
                      )}
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        {group.plans.length} plan{group.plans.length !== 1 ? 's' : ''}
                      </span>
                      <Badge className={nearestBadge.color}>{nearestBadge.label}</Badge>
                    </div>
                  </button>

                  {/* Expanded Plan List */}
                  {isExpanded && (
                    <div className="border-t border-gray-100">
                      <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Plan</th>
                            <th className="px-6 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Frequency</th>
                            <th className="px-6 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Next Due</th>
                            <th className="px-6 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Last Done</th>
                            <th className="px-6 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Parts</th>
                            <th className="px-6 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Est. Cost</th>
                            <th className="px-6 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Priority</th>
                            <th className="px-6 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Assigned To</th>
                            <th className="relative px-6 py-2.5"><span className="sr-only">Actions</span></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {group.plans.map((plan) => {
                            const badge = dueStatusBadge(plan.next_due_date)
                            return (
                              <tr key={plan.id} onClick={() => setDetailPlan(plan)} className="hover:bg-blue-50 transition-colors cursor-pointer">
                                <td className="px-6 py-3">
                                  <p className="text-sm font-medium text-gray-900">{plan.name}</p>
                                  {plan.estimated_duration_hours && (
                                    <p className="text-xs text-gray-500">{plan.estimated_duration_hours}h estimated</p>
                                  )}
                                </td>
                                <td className="px-6 py-3 text-sm text-gray-600 capitalize">
                                  {plan.frequency.replace('_', ' ')}
                                </td>
                                <td className="px-6 py-3">
                                  <div>
                                    <p className="text-sm text-gray-700">{formatDate(plan.next_due_date)}</p>
                                    <Badge className={`mt-1 ${badge.color}`}>{badge.label}</Badge>
                                  </div>
                                </td>
                                <td className="px-6 py-3 text-sm text-gray-600">
                                  {formatDate(plan.last_performed_date)}
                                </td>
                                <td className="px-6 py-3">
                                  {plan.parts && plan.parts.length > 0 ? (
                                    <div className="flex items-center gap-1">
                                      <Package className="h-3.5 w-3.5 text-gray-400" />
                                      <span className="text-sm text-gray-600">{plan.parts.length}</span>
                                    </div>
                                  ) : (
                                    <span className="text-sm text-gray-400">—</span>
                                  )}
                                </td>
                                <td className="px-6 py-3 text-sm text-gray-600">
                                  {formatCurrency(plan.estimated_cost)}
                                </td>
                                <td className="px-6 py-3">
                                  <Badge className={statusColor(plan.priority)}>{plan.priority}</Badge>
                                </td>
                                <td className="px-6 py-3 text-sm text-gray-600">
                                  {plan.assigned_to ?? '—'}
                                </td>
                                <td className="px-6 py-3 text-right">
                                  <div className="flex items-center justify-end gap-3" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      onClick={() => setLoggingPlan(plan)}
                                      className="inline-flex items-center gap-1 text-sm text-green-600 hover:text-green-800"
                                    >
                                      <CheckCircle2 className="h-4 w-4" />
                                      Log
                                    </button>
                                    <Link
                                      href={`/maintenance/${plan.id}/edit`}
                                      className="text-sm text-blue-600 hover:text-blue-800"
                                    >
                                      Edit
                                    </Link>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                      {group.assetId && (
                        <div className="border-t border-gray-100 px-6 py-2 bg-gray-50">
                          <Link
                            href={`/maintenance/new?asset_id=${group.assetId}`}
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                          >
                            <Plus className="h-3 w-3" />
                            Add plan to this asset
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {loggingPlan && (
        <LogMaintenanceModal
          plan={loggingPlan}
          onClose={() => setLoggingPlan(null)}
        />
      )}

      {showAddReport && detailPlan && (
        <AddServiceReportModal
          maintenancePlanId={detailPlan.id}
          assetId={detailPlan.asset_id}
          assetName={detailPlan.assets?.name ?? undefined}
          onClose={() => setShowAddReport(false)}
          onSaved={() => loadPlanReports(detailPlan.id)}
        />
      )}

      {/* Plan Detail Modal */}
      {detailPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDetailPlan(null)} />
          <div className="relative w-full max-w-2xl rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{detailPlan.name}</h2>
                <p className="text-sm text-gray-500">{detailPlan.assets?.name ?? 'Unassigned Asset'}</p>
              </div>
              <button onClick={() => setDetailPlan(null)} className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[80vh] overflow-y-auto px-6 py-5 space-y-5">
              {/* Status badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={statusColor(detailPlan.priority)}>{detailPlan.priority}</Badge>
                {dueStatusBadge(detailPlan.next_due_date) && (
                  <Badge className={dueStatusBadge(detailPlan.next_due_date).color}>
                    {dueStatusBadge(detailPlan.next_due_date).label}
                  </Badge>
                )}
                <Badge className={detailPlan.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
                  {detailPlan.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              {/* Description */}
              {detailPlan.description && (
                <div>
                  <h4 className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">Description</h4>
                  <p className="text-sm text-gray-700">{detailPlan.description}</p>
                </div>
              )}

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">Frequency</h4>
                  <p className="text-sm text-gray-700 capitalize">
                    {detailPlan.frequency.replace('_', ' ')}
                    {detailPlan.frequency === 'custom' && detailPlan.frequency_days && ` (every ${detailPlan.frequency_days} days)`}
                  </p>
                </div>
                <div>
                  <h4 className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">Assigned To</h4>
                  <p className="text-sm text-gray-700">{detailPlan.assigned_to ?? '—'}</p>
                </div>
                <div>
                  <h4 className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">Next Due Date</h4>
                  <p className="text-sm text-gray-700">{formatDate(detailPlan.next_due_date)}</p>
                </div>
                <div>
                  <h4 className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">Last Performed</h4>
                  <p className="text-sm text-gray-700">{formatDate(detailPlan.last_performed_date)}</p>
                </div>
                <div>
                  <h4 className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">Est. Duration</h4>
                  <p className="text-sm text-gray-700">{detailPlan.estimated_duration_hours ? `${detailPlan.estimated_duration_hours} hours` : '—'}</p>
                </div>
                <div>
                  <h4 className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">Est. Cost</h4>
                  <p className="text-sm text-gray-700">{formatCurrency(detailPlan.estimated_cost)}</p>
                </div>
              </div>

              {/* Parts Section */}
              {detailPlan.parts && detailPlan.parts.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-2">Required Parts</h4>
                  <div className="rounded-lg border border-gray-200 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-100">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Part Name</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Qty</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Part #</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {detailPlan.parts.map((part, i) => (
                          <tr key={i}>
                            <td className="px-4 py-2 text-sm text-gray-700">{part.name}</td>
                            <td className="px-4 py-2 text-sm text-gray-600">{part.quantity ?? 1}</td>
                            <td className="px-4 py-2 text-sm text-gray-500">{part.part_number ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Service Reports Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-gray-500">
                    <ClipboardList className="h-4 w-4" />
                    Service Reports ({planReports.length})
                  </h4>
                  <button
                    onClick={() => setShowAddReport(true)}
                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                  >
                    <Plus className="h-4 w-4" />
                    Add Report
                  </button>
                </div>

                {loadingReports ? (
                  <p className="text-sm text-gray-400">Loading reports...</p>
                ) : planReports.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-300 py-4 text-center">
                    <p className="text-sm text-gray-500">No service reports yet</p>
                    <button
                      onClick={() => setShowAddReport(true)}
                      className="mt-1 text-sm text-blue-600 hover:text-blue-800"
                    >
                      Add the first report
                    </button>
                  </div>
                ) : (
                  <div className="rounded-lg border border-gray-200 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-100">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Technician</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Summary</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Cost</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {planReports.map((r: any) => (
                          <tr key={r.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm text-gray-700">{formatDate(r.report_date)}</td>
                            <td className="px-4 py-2 text-sm text-gray-700">{r.technician}</td>
                            <td className="px-4 py-2 text-sm text-gray-700 max-w-[200px] truncate">{r.summary}</td>
                            <td className="px-4 py-2">
                              <Badge className={
                                r.status === 'completed' ? 'bg-green-100 text-green-800' :
                                r.status === 'requires_followup' ? 'bg-orange-100 text-orange-800' :
                                'bg-gray-100 text-gray-700'
                              }>
                                {r.status.replace(/_/g, ' ')}
                              </Badge>
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-600">{formatCurrency(r.cost)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2 border-t border-gray-100">
                <button
                  onClick={() => { setDetailPlan(null); setLoggingPlan(detailPlan) }}
                  className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Log Maintenance
                </button>
                <button
                  onClick={() => setShowAddReport(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add Service Report
                </button>
                <Link
                  href={`/maintenance/${detailPlan.id}/edit`}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Edit Plan
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
