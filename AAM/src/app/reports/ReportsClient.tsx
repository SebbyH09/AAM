'use client'

import { useState, useMemo } from 'react'
import { StatCard } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency, formatDate, statusColor } from '@/lib/utils'
import {
  BarChart3, Wrench, Clock, Package2, ClipboardList,
  TrendingUp, AlertTriangle, CheckCircle
} from 'lucide-react'

interface MaintenanceRecord {
  id: string
  performed_date: string
  cost: number | null
  type: string
  status: string
}

interface Repair {
  id: string
  status: string
  started_date: string | null
  completed_date: string | null
  total_cost: number | null
  reported_date: string
}

interface DowntimeEvent {
  id: string
  asset_id: string
  duration_hours: number | null
  cost_impact: number | null
  assets: { id: string; name: string } | null
}

interface Asset {
  id: string
  status: string
  category: string | null
}

interface Part {
  id: string
  name: string
  quantity_on_hand: number
  reorder_point: number | null
  unit_cost: number | null
}

interface MaintenancePlan {
  id: string
  is_active: boolean
  next_due_date: string | null
}

interface ReportsClientProps {
  maintenanceRecords: MaintenanceRecord[]
  repairs: Repair[]
  downtimeEvents: DowntimeEvent[]
  assets: Asset[]
  parts: Part[]
  maintenancePlans: MaintenancePlan[]
  startOfYear: string
}

const TABS = ['Overview', 'Maintenance', 'Repairs', 'Downtime', 'Inventory'] as const
type Tab = typeof TABS[number]

function HorizontalBar({ label, value, maxValue, color = 'bg-blue-500' }: {
  label: string
  value: number
  maxValue: number
  color?: string
}) {
  const pct = maxValue > 0 ? (value / maxValue) * 100 : 0
  return (
    <div className="flex items-center gap-3">
      <div className="w-36 text-right text-xs text-gray-600 truncate shrink-0">{label}</div>
      <div className="flex-1 bg-gray-100 rounded-full h-4">
        <div className={`${color} h-4 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <div className="w-20 text-xs text-gray-700 text-right shrink-0">{typeof value === 'number' && value % 1 !== 0 ? value.toFixed(1) : value}</div>
    </div>
  )
}

function MonthBar({ label, value, maxValue, color = 'bg-blue-500' }: {
  label: string
  value: number
  maxValue: number
  color?: string
}) {
  const pct = maxValue > 0 ? (value / maxValue) * 100 : 0
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="w-full flex-1 bg-gray-100 rounded-t relative h-24 flex items-end">
        <div
          className={`${color} w-full rounded-t transition-all`}
          style={{ height: `${pct}%` }}
        />
      </div>
      <div className="text-xs text-gray-500 text-center w-full truncate">{label}</div>
      <div className="text-xs font-medium text-gray-700">{value}</div>
    </div>
  )
}

export default function ReportsClient({
  maintenanceRecords,
  repairs,
  downtimeEvents,
  assets,
  parts,
  maintenancePlans,
  startOfYear,
}: ReportsClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>('Overview')

  const today = new Date()

  // ---- Maintenance computations ----
  const maintenanceByMonth = useMemo(() => {
    const months: Record<string, { count: number; cost: number }> = {}
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const key = d.toLocaleString('default', { month: 'short', year: '2-digit' })
      months[key] = { count: 0, cost: 0 }
    }
    maintenanceRecords.forEach((r) => {
      const d = new Date(r.performed_date)
      const key = d.toLocaleString('default', { month: 'short', year: '2-digit' })
      if (months[key]) {
        months[key].count++
        months[key].cost += r.cost ?? 0
      }
    })
    return Object.entries(months).map(([label, v]) => ({ label, ...v }))
  }, [maintenanceRecords])

  const ytdMaintenanceCost = maintenanceRecords
    .filter((r) => r.performed_date >= startOfYear)
    .reduce((sum, r) => sum + (r.cost ?? 0), 0)

  const typeBreakdown = useMemo(() => {
    const map: Record<string, number> = {}
    maintenanceRecords.forEach((r) => {
      map[r.type] = (map[r.type] ?? 0) + 1
    })
    return Object.entries(map).map(([type, count]) => ({ type, count }))
  }, [maintenanceRecords])

  const totalActivePlans = maintenancePlans.length
  const overduePlans = maintenancePlans.filter(
    (p) => p.next_due_date && p.next_due_date < today.toISOString().split('T')[0]
  ).length
  const pmCompliance = totalActivePlans > 0
    ? Math.round(((totalActivePlans - overduePlans) / totalActivePlans) * 100)
    : 100

  // ---- Repair computations ----
  const ytdRepairCost = repairs
    .filter((r) => r.reported_date >= startOfYear)
    .reduce((sum, r) => sum + (r.total_cost ?? 0), 0)

  const repairsByStatus = useMemo(() => {
    const map: Record<string, number> = {}
    repairs.forEach((r) => { map[r.status] = (map[r.status] ?? 0) + 1 })
    return Object.entries(map).map(([status, count]) => ({ status, count }))
  }, [repairs])

  const completedRepairs = repairs.filter((r) => r.status === 'completed' && r.started_date && r.completed_date)
  const avgRepairDays = completedRepairs.length > 0
    ? completedRepairs.reduce((sum, r) => {
        const days = (new Date(r.completed_date!).getTime() - new Date(r.started_date!).getTime()) / 86400000
        return sum + days
      }, 0) / completedRepairs.length
    : 0

  const repairsByMonth = useMemo(() => {
    const months: Record<string, { count: number; cost: number }> = {}
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const key = d.toLocaleString('default', { month: 'short', year: '2-digit' })
      months[key] = { count: 0, cost: 0 }
    }
    repairs.forEach((r) => {
      const d = new Date(r.reported_date)
      const key = d.toLocaleString('default', { month: 'short', year: '2-digit' })
      if (months[key]) {
        months[key].count++
        months[key].cost += r.total_cost ?? 0
      }
    })
    return Object.entries(months).map(([label, v]) => ({ label, ...v }))
  }, [repairs])

  // ---- Downtime computations ----
  const downtimeByAsset = useMemo(() => {
    const map: Record<string, { name: string; hours: number; cost: number }> = {}
    downtimeEvents.forEach((e) => {
      const name = e.assets?.name ?? 'Unknown'
      const key = e.asset_id
      if (!map[key]) map[key] = { name, hours: 0, cost: 0 }
      map[key].hours += e.duration_hours ?? 0
      map[key].cost += e.cost_impact ?? 0
    })
    return Object.values(map)
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 10)
  }, [downtimeEvents])

  const totalDowntimeHours = downtimeEvents.reduce((sum, e) => sum + (e.duration_hours ?? 0), 0)
  const totalDowntimeCost = downtimeEvents.reduce((sum, e) => sum + (e.cost_impact ?? 0), 0)
  const maxDowntime = Math.max(...downtimeByAsset.map((d) => d.hours), 1)

  // ---- Inventory computations ----
  const lowStockParts = parts.filter((p) => p.reorder_point != null && p.quantity_on_hand <= p.reorder_point)
  const totalInventoryValue = parts.reduce((sum, p) => sum + (p.quantity_on_hand ?? 0) * (p.unit_cost ?? 0), 0)

  const maxMaintenanceCount = Math.max(...maintenanceByMonth.map((m) => m.count), 1)
  const maxRepairCount = Math.max(...repairsByMonth.map((m) => m.count), 1)
  const maxRepairStatus = Math.max(...repairsByStatus.map((r) => r.count), 1)

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'Overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Maintenance Cost YTD"
              value={formatCurrency(ytdMaintenanceCost)}
              subtitle="Year to date"
              icon={<ClipboardList className="h-6 w-6" />}
              color="blue"
            />
            <StatCard
              title="Repair Cost YTD"
              value={formatCurrency(ytdRepairCost)}
              subtitle="Year to date"
              icon={<Wrench className="h-6 w-6" />}
              color="orange"
            />
            <StatCard
              title="PM Compliance"
              value={`${pmCompliance}%`}
              subtitle={`${overduePlans} overdue plans`}
              icon={<TrendingUp className="h-6 w-6" />}
              color={pmCompliance >= 80 ? 'green' : 'red'}
            />
            <StatCard
              title="Avg Repair Duration"
              value={`${avgRepairDays.toFixed(1)} days`}
              subtitle={`${completedRepairs.length} completed`}
              icon={<Clock className="h-6 w-6" />}
              color="purple"
            />
          </div>

          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Maintenance Activities — Last 12 Months</h2>
            <div className="flex items-end gap-2 h-32">
              {maintenanceByMonth.map((m) => (
                <MonthBar
                  key={m.label}
                  label={m.label}
                  value={m.count}
                  maxValue={maxMaintenanceCount}
                  color="bg-blue-500"
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Maintenance Tab */}
      {activeTab === 'Maintenance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              title="Total Records"
              value={maintenanceRecords.length}
              subtitle="Last 12 months"
              icon={<ClipboardList className="h-6 w-6" />}
              color="blue"
            />
            <StatCard
              title="PM Compliance"
              value={`${pmCompliance}%`}
              subtitle={`${overduePlans} overdue`}
              icon={<CheckCircle className="h-6 w-6" />}
              color={pmCompliance >= 80 ? 'green' : 'red'}
            />
            <StatCard
              title="Total Cost"
              value={formatCurrency(ytdMaintenanceCost)}
              subtitle="Year to date"
              icon={<TrendingUp className="h-6 w-6" />}
              color="orange"
            />
          </div>

          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Type Breakdown</h2>
            <div className="space-y-2">
              {typeBreakdown.map((t) => (
                <HorizontalBar
                  key={t.type}
                  label={t.type.replace('_', ' ')}
                  value={t.count}
                  maxValue={Math.max(...typeBreakdown.map((x) => x.count), 1)}
                  color="bg-blue-500"
                />
              ))}
              {typeBreakdown.length === 0 && (
                <p className="text-sm text-gray-400">No maintenance records in the last 12 months.</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-sm font-semibold text-gray-700">Monthly Breakdown</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Month</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Count</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Total Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {maintenanceByMonth.filter(m => m.count > 0).map((m) => (
                    <tr key={m.label} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-sm text-gray-900">{m.label}</td>
                      <td className="px-6 py-3 text-sm text-gray-700">{m.count}</td>
                      <td className="px-6 py-3 text-sm text-gray-700">{formatCurrency(m.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Repairs Tab */}
      {activeTab === 'Repairs' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              title="Total Repairs"
              value={repairs.length}
              subtitle="All time"
              icon={<Wrench className="h-6 w-6" />}
              color="blue"
            />
            <StatCard
              title="MTTR"
              value={`${avgRepairDays.toFixed(1)} days`}
              subtitle="Mean time to repair"
              icon={<Clock className="h-6 w-6" />}
              color="orange"
            />
            <StatCard
              title="Total Repair Cost"
              value={formatCurrency(ytdRepairCost)}
              subtitle="Year to date"
              icon={<TrendingUp className="h-6 w-6" />}
              color="red"
            />
          </div>

          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Repairs by Status</h2>
            <div className="space-y-2">
              {repairsByStatus.map((r) => (
                <HorizontalBar
                  key={r.status}
                  label={r.status.replace('_', ' ')}
                  value={r.count}
                  maxValue={maxRepairStatus}
                  color="bg-orange-500"
                />
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Repairs — Last 12 Months</h2>
            <div className="flex items-end gap-2 h-32">
              {repairsByMonth.map((m) => (
                <MonthBar
                  key={m.label}
                  label={m.label}
                  value={m.count}
                  maxValue={maxRepairCount}
                  color="bg-orange-500"
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Downtime Tab */}
      {activeTab === 'Downtime' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              title="Total Downtime"
              value={`${totalDowntimeHours.toFixed(1)} hrs`}
              subtitle="Across all assets"
              icon={<Clock className="h-6 w-6" />}
              color="red"
            />
            <StatCard
              title="Cost Impact"
              value={formatCurrency(totalDowntimeCost)}
              subtitle="Total estimated cost"
              icon={<TrendingUp className="h-6 w-6" />}
              color="orange"
            />
            <StatCard
              title="Events Recorded"
              value={downtimeEvents.length}
              subtitle="Completed events"
              icon={<AlertTriangle className="h-6 w-6" />}
              color="yellow"
            />
          </div>

          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Downtime Hours by Asset (Top 10)</h2>
            <div className="space-y-2">
              {downtimeByAsset.map((d) => (
                <HorizontalBar
                  key={d.name}
                  label={d.name}
                  value={Math.round(d.hours * 10) / 10}
                  maxValue={maxDowntime}
                  color="bg-red-500"
                />
              ))}
              {downtimeByAsset.length === 0 && (
                <p className="text-sm text-gray-400">No completed downtime events recorded.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Inventory Tab */}
      {activeTab === 'Inventory' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              title="Total Parts"
              value={parts.length}
              subtitle="In catalog"
              icon={<Package2 className="h-6 w-6" />}
              color="blue"
            />
            <StatCard
              title="Low Stock Items"
              value={lowStockParts.length}
              subtitle="At or below reorder point"
              icon={<AlertTriangle className="h-6 w-6" />}
              color={lowStockParts.length > 0 ? 'red' : 'green'}
            />
            <StatCard
              title="Total Inventory Value"
              value={formatCurrency(totalInventoryValue)}
              subtitle="Based on unit costs"
              icon={<TrendingUp className="h-6 w-6" />}
              color="green"
            />
          </div>

          {lowStockParts.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-red-200 bg-red-50 px-6 py-4 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <h2 className="text-sm font-semibold text-red-800">Low Stock Parts — Action Required</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Part Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Qty on Hand</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Reorder Point</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Unit Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {lowStockParts.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3 text-sm font-medium text-gray-900">{p.name}</td>
                        <td className="px-6 py-3 text-sm text-red-600 font-semibold">{p.quantity_on_hand}</td>
                        <td className="px-6 py-3 text-sm text-gray-600">{p.reorder_point}</td>
                        <td className="px-6 py-3 text-sm text-gray-600">{p.unit_cost != null ? formatCurrency(p.unit_cost) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Stock Level Overview</h2>
            <div className="space-y-2">
              {parts.slice(0, 15).map((p) => {
                const max = Math.max(...parts.map((x) => x.quantity_on_hand), 1)
                const isLow = p.reorder_point != null && p.quantity_on_hand <= p.reorder_point
                return (
                  <HorizontalBar
                    key={p.id}
                    label={p.name}
                    value={p.quantity_on_hand}
                    maxValue={max}
                    color={isLow ? 'bg-red-500' : 'bg-green-500'}
                  />
                )
              })}
              {parts.length === 0 && (
                <p className="text-sm text-gray-400">No parts in inventory.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
