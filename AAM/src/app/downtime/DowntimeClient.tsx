'use client'

import { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/Badge'
import { formatDate, formatDateTime, formatCurrency } from '@/lib/utils'
import { Clock, Plus, Search, ArrowUpDown } from 'lucide-react'
import LogDowntimeModal from './LogDowntimeModal'
import EndDowntimeModal from './EndDowntimeModal'

interface DowntimeEvent {
  id: string
  start_time: string
  end_time: string | null
  duration_hours: number | null
  reason: string
  description: string | null
  impact: string | null
  cost_impact: number | null
  asset_id: string | null
  assets: { name: string; asset_tag: string | null } | null
}

interface Asset {
  id: string
  name: string
  asset_tag: string | null
}

interface DowntimeClientProps {
  events: DowntimeEvent[]
  assets: Asset[]
}

const REASON_COLORS: Record<string, string> = {
  breakdown: 'bg-red-100 text-red-800',
  scheduled_maintenance: 'bg-blue-100 text-blue-800',
  repair: 'bg-orange-100 text-orange-800',
  waiting_parts: 'bg-yellow-100 text-yellow-800',
  operator_error: 'bg-purple-100 text-purple-800',
  other: 'bg-gray-100 text-gray-800',
}

const REASON_FILTERS = ['all', 'breakdown', 'scheduled_maintenance', 'repair', 'waiting_parts', 'operator_error', 'other']

type SortField = 'start_time' | 'duration_hours' | 'cost_impact'
type SortDir = 'asc' | 'desc'

export default function DowntimeClient({ events, assets }: DowntimeClientProps) {
  const [showLogModal, setShowLogModal] = useState(false)
  const [endingEvent, setEndingEvent] = useState<DowntimeEvent | null>(null)
  const [search, setSearch] = useState('')
  const [reasonFilter, setReasonFilter] = useState('all')
  const [sortField, setSortField] = useState<SortField>('start_time')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const filtered = useMemo(() => {
    return events.filter((e) => {
      const matchSearch =
        search === '' ||
        (e.assets?.name?.toLowerCase().includes(search.toLowerCase())) ||
        (e.assets?.asset_tag?.toLowerCase().includes(search.toLowerCase())) ||
        (e.description?.toLowerCase().includes(search.toLowerCase())) ||
        e.reason.toLowerCase().includes(search.toLowerCase())
      const matchReason = reasonFilter === 'all' || e.reason === reasonFilter
      return matchSearch && matchReason
    })
  }, [events, search, reasonFilter])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0
      if (sortField === 'start_time') {
        cmp = new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      } else if (sortField === 'duration_hours') {
        cmp = (a.duration_hours ?? 0) - (b.duration_hours ?? 0)
      } else if (sortField === 'cost_impact') {
        cmp = (a.cost_impact ?? 0) - (b.cost_impact ?? 0)
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortField, sortDir])

  const activeEvents = sorted.filter((e) => !e.end_time)
  const completedEvents = sorted.filter((e) => !!e.end_time)
  const totalHours = events.filter((e) => !!e.end_time).reduce((sum, e) => sum + (e.duration_hours ?? 0), 0)
  const totalCost = events.filter((e) => !!e.end_time).reduce((sum, e) => sum + (e.cost_impact ?? 0), 0)

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => toggleSort(field)}
      className="inline-flex items-center gap-1 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
    >
      {children}
      <ArrowUpDown className={`h-3 w-3 ${sortField === field ? 'text-blue-600' : 'text-gray-400'}`} />
    </button>
  )

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-gray-500">Active Downtime Events</p>
          <p className="mt-1 text-3xl font-bold text-red-600">{activeEvents.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-gray-500">Total Downtime (all time)</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{totalHours.toFixed(1)} hrs</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-gray-500">Total Cost Impact</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{formatCurrency(totalCost)}</p>
        </div>
      </div>

      {/* Search, Filter, and Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by asset, reason, description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={() => setShowLogModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Log Downtime
        </button>
      </div>

      {/* Reason Filters */}
      <div className="flex gap-1 flex-wrap">
        {REASON_FILTERS.map((r) => (
          <button
            key={r}
            onClick={() => setReasonFilter(r)}
            className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
              reasonFilter === r ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {r.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Active Events */}
      {activeEvents.length > 0 && (
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-red-600">
            <Clock className="h-4 w-4" />
            Active Downtime ({activeEvents.length})
          </h3>
          <div className="overflow-hidden rounded-xl border border-red-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-red-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Asset</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Reason</th>
                  <th className="px-6 py-3 text-left">
                    <SortButton field="start_time">Started</SortButton>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Description</th>
                  <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activeEvents.map((event) => (
                  <tr key={event.id} className="bg-red-50/30">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">{event.assets?.name ?? '—'}</p>
                      <p className="text-xs text-gray-500">{event.assets?.asset_tag}</p>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={REASON_COLORS[event.reason] ?? 'bg-gray-100 text-gray-800'}>
                        {event.reason.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{formatDateTime(event.start_time)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{event.description ?? '—'}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setEndingEvent(event)}
                        className="text-sm font-medium text-green-600 hover:text-green-800"
                      >
                        End Downtime
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Completed Events */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-700">Downtime History</h3>
        {completedEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-12 text-center">
            <Clock className="h-10 w-10 text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">No downtime events found</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Asset</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Reason</th>
                  <th className="px-6 py-3 text-left">
                    <SortButton field="start_time">Period</SortButton>
                  </th>
                  <th className="px-6 py-3 text-left">
                    <SortButton field="duration_hours">Duration</SortButton>
                  </th>
                  <th className="px-6 py-3 text-left">
                    <SortButton field="cost_impact">Cost Impact</SortButton>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Impact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {completedEvents.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">{event.assets?.name ?? '—'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={REASON_COLORS[event.reason] ?? 'bg-gray-100 text-gray-800'}>
                        {event.reason.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <p>{formatDate(event.start_time)}</p>
                      <p className="text-xs text-gray-400">to {formatDate(event.end_time)}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 font-medium">
                      {event.duration_hours != null ? `${event.duration_hours.toFixed(1)} hrs` : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{formatCurrency(event.cost_impact)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{event.impact ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showLogModal && (
        <LogDowntimeModal assets={assets} onClose={() => setShowLogModal(false)} />
      )}
      {endingEvent && (
        <EndDowntimeModal event={endingEvent} onClose={() => setEndingEvent(null)} />
      )}
    </div>
  )
}
