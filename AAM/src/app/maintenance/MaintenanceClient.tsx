'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { formatDate, statusColor, dueStatusBadge, getDueStatus } from '@/lib/utils'
import Link from 'next/link'
import { Search, ClipboardList, ChevronRight, CheckCircle2, AlertTriangle } from 'lucide-react'
import LogMaintenanceModal from './LogMaintenanceModal'

interface Plan {
  id: string
  name: string
  frequency: string
  next_due_date: string
  last_performed_date: string | null
  priority: string
  assigned_to: string | null
  is_active: boolean
  estimated_duration_hours: number | null
  assets: { name: string; asset_tag: string | null } | null
}

interface MaintenanceClientProps {
  plans: Plan[]
}

const PRIORITY_FILTERS = ['all', 'critical', 'high', 'medium', 'low']

export default function MaintenanceClient({ plans }: MaintenanceClientProps) {
  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [showActive, setShowActive] = useState(true)
  const [loggingPlan, setLoggingPlan] = useState<Plan | null>(null)

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

  // Group by due status
  const overdue = filtered.filter((p) => getDueStatus(p.next_due_date) === 'overdue')
  const urgent = filtered.filter((p) => getDueStatus(p.next_due_date) === 'urgent')
  const upcoming = filtered.filter((p) => getDueStatus(p.next_due_date) === 'upcoming')
  const ok = filtered.filter((p) => getDueStatus(p.next_due_date) === 'ok')

  const groups = [
    { label: 'Overdue', items: overdue, color: 'text-red-600' },
    { label: 'Due This Week', items: urgent, color: 'text-orange-600' },
    { label: 'Due This Month', items: upcoming, color: 'text-yellow-600' },
    { label: 'Upcoming', items: ok, color: 'text-green-600' },
  ]

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search plans..."
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
        <div className="space-y-6">
          {groups.map(({ label, items, color }) => {
            if (items.length === 0) return null
            return (
              <div key={label}>
                <h3 className={`mb-3 flex items-center gap-2 text-sm font-semibold ${color}`}>
                  {label === 'Overdue' && <AlertTriangle className="h-4 w-4" />}
                  {label} ({items.length})
                </h3>
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Plan</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Asset</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Frequency</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Next Due</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Last Done</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Priority</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Assigned To</th>
                        <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {items.map((plan) => {
                        const badge = dueStatusBadge(plan.next_due_date)
                        return (
                          <tr key={plan.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4">
                              <p className="text-sm font-medium text-gray-900">{plan.name}</p>
                              {plan.estimated_duration_hours && (
                                <p className="text-xs text-gray-500">{plan.estimated_duration_hours}h estimated</p>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {plan.assets?.name ?? '—'}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600 capitalize">
                              {plan.frequency.replace('_', ' ')}
                            </td>
                            <td className="px-6 py-4">
                              <div>
                                <p className="text-sm text-gray-700">{formatDate(plan.next_due_date)}</p>
                                <Badge className={`mt-1 ${badge.color}`}>{badge.label}</Badge>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {formatDate(plan.last_performed_date)}
                            </td>
                            <td className="px-6 py-4">
                              <Badge className={statusColor(plan.priority)}>{plan.priority}</Badge>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {plan.assigned_to ?? '—'}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-3">
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
                </div>
              </div>
            )
          })}
        </div>
      )}

      {loggingPlan && (
        <LogMaintenanceModal
          plan={loggingPlan}
          onClose={() => setLoggingPlan(null)}
        />
      )}
    </div>
  )
}
