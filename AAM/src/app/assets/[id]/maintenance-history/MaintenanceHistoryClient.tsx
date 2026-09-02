'use client'

import { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Input, Select } from '@/components/ui/Input'
import { formatDate, formatCurrency, statusColor } from '@/lib/utils'
import { Search, Filter, ChevronDown, ChevronUp, Clock, DollarSign, Wrench, User } from 'lucide-react'
import RecordAttachments from '@/components/RecordAttachments'

interface MaintenanceRecord {
  id: string
  asset_id: string | null
  maintenance_plan_id: string | null
  performed_by: string
  performed_date: string
  duration_hours: number | null
  type: string
  description: string
  findings: string | null
  parts_replaced: string | null
  cost: number | null
  status: string
  next_maintenance_date: string | null
  notes: string | null
  created_at: string
  maintenance_plans?: { name: string } | null
}

interface Plan {
  id: string
  name: string
}

interface Props {
  records: MaintenanceRecord[]
  plans: Plan[]
  assetName: string
}

const TYPE_LABELS: Record<string, string> = {
  preventive: 'Preventive',
  corrective: 'Corrective',
  inspection: 'Inspection',
  calibration: 'Calibration',
  other: 'Other',
}

const STATUS_LABELS: Record<string, string> = {
  completed: 'Completed',
  incomplete: 'Incomplete',
  requires_followup: 'Requires Follow-up',
}

export default function MaintenanceHistoryClient({ records, plans, assetName }: Props) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [planFilter, setPlanFilter] = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (typeFilter !== 'all' && r.type !== typeFilter) return false
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      if (planFilter !== 'all' && r.maintenance_plan_id !== planFilter) return false
      if (search) {
        const q = search.toLowerCase()
        const searchable = [
          r.description,
          r.performed_by,
          r.findings,
          r.parts_replaced,
          r.notes,
          r.maintenance_plans?.name,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!searchable.includes(q)) return false
      }
      return true
    })
  }, [records, search, typeFilter, statusFilter, planFilter])

  const totalCost = filtered.reduce((sum, r) => sum + (r.cost ?? 0), 0)
  const totalHours = filtered.reduce((sum, r) => sum + (r.duration_hours ?? 0), 0)

  const typeOptions = [
    { value: 'all', label: 'All Types' },
    ...Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label })),
  ]

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
  ]

  const planOptions = [
    { value: 'all', label: 'All Plans' },
    ...plans.map((p) => ({ value: p.id, label: p.name })),
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-blue-600" />
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total Records</p>
          </div>
          <p className="mt-1 text-2xl font-bold text-gray-900">{filtered.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-600" />
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total Cost</p>
          </div>
          <p className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(totalCost)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-purple-600" />
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total Hours</p>
          </div>
          <p className="mt-1 text-2xl font-bold text-gray-900">{totalHours.toFixed(1)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-orange-600" />
            <p className="text-xs text-gray-500 uppercase tracking-wide">Technicians</p>
          </div>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {new Set(filtered.map((r) => r.performed_by)).size}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filters</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search records..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <Select label="" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} options={typeOptions} />
          <Select label="" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={statusOptions} />
          <Select label="" value={planFilter} onChange={(e) => setPlanFilter(e.target.value)} options={planOptions} />
        </div>
      </div>

      {/* Records List */}
      <div className="space-y-3">
        {filtered.length > 0 ? (
          filtered.map((record) => {
            const isExpanded = expandedId === record.id
            return (
              <div
                key={record.id}
                className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
              >
                {/* Collapsed Row */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : record.id)}
                  className="w-full text-left px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex-shrink-0">
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-gray-900">
                            {formatDate(record.performed_date)}
                          </span>
                          <Badge className={statusColor(record.type)}>
                            {TYPE_LABELS[record.type] ?? record.type}
                          </Badge>
                          <Badge className={statusColor(record.status)}>
                            {STATUS_LABELS[record.status] ?? record.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mt-0.5 truncate">{record.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                      <span className="text-xs text-gray-500">By {record.performed_by}</span>
                      {record.cost != null && record.cost > 0 && (
                        <span className="text-xs font-medium text-gray-700">{formatCurrency(record.cost)}</span>
                      )}
                    </div>
                  </div>
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-6 py-4 bg-gray-50">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <DetailItem label="Performed By" value={record.performed_by} />
                      <DetailItem label="Date" value={formatDate(record.performed_date)} />
                      <DetailItem label="Type" value={TYPE_LABELS[record.type] ?? record.type} />
                      <DetailItem label="Status" value={STATUS_LABELS[record.status] ?? record.status} />
                      <DetailItem
                        label="Duration"
                        value={record.duration_hours != null ? `${record.duration_hours} hours` : null}
                      />
                      <DetailItem label="Cost" value={record.cost != null ? formatCurrency(record.cost) : null} />
                      {record.maintenance_plans?.name && (
                        <DetailItem label="Maintenance Plan" value={record.maintenance_plans.name} />
                      )}
                      <DetailItem
                        label="Next Maintenance"
                        value={record.next_maintenance_date ? formatDate(record.next_maintenance_date) : null}
                      />
                    </div>

                    <div className="mt-4 space-y-3">
                      <DetailBlock label="Description" value={record.description} />
                      <DetailBlock label="Findings" value={record.findings} />
                      <DetailBlock label="Parts Replaced" value={record.parts_replaced} />
                      <DetailBlock label="Notes" value={record.notes} />
                    </div>

                    <div className="mt-4 border-t border-gray-200 pt-4">
                      <RecordAttachments
                        maintenanceRecordId={record.id}
                        assetId={record.asset_id}
                        title="Attachments"
                        bare
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
            <Clock className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-4 text-sm text-gray-500">
              {records.length === 0
                ? 'No maintenance has been performed on this asset yet.'
                : 'No records match the current filters.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function DetailItem({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-gray-900">{value}</p>
    </div>
  )
}

function DetailBlock({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm text-gray-700 whitespace-pre-wrap rounded-lg bg-white border border-gray-200 p-3">
        {value}
      </p>
    </div>
  )
}
