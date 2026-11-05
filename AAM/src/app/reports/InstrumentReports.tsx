'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'

export interface InstrumentAsset {
  id: string
  name: string
  asset_tag: string | null
}

export interface InstrumentMaintenanceRecord {
  id: string
  asset_id: string | null
  performed_date: string
  cost: number | null
  status: string
}

export interface InstrumentRepair {
  id: string
  asset_id: string | null
  reported_date: string
  total_cost: number | null
}

export interface InstrumentWorkOrder {
  id: string
  asset_id: string | null
  status: string
  cost: number | null
  request_date: string
  completed_date: string | null
}

export interface InstrumentContract {
  id: string
  asset_id: string | null
  cost: number | null
  start_date: string
  service_contract_assets: { asset_id: string }[] | null
}

interface InstrumentReportsProps {
  assets: InstrumentAsset[]
  maintenanceRecords: InstrumentMaintenanceRecord[]
  repairs: InstrumentRepair[]
  workOrders: InstrumentWorkOrder[]
  contracts: InstrumentContract[]
}

type Period = 'ytd' | '12m' | 'all'
const PERIODS: { key: Period; label: string }[] = [
  { key: 'ytd', label: 'Year to date' },
  { key: '12m', label: 'Last 12 months' },
  { key: 'all', label: 'All time' },
]

// Colors match the categories on the Budgets page.
const SPEND_SERIES = [
  { key: 'maintenance', label: 'Maintenance', color: 'bg-blue-500' },
  { key: 'repairs', label: 'Repairs', color: 'bg-orange-500' },
  { key: 'workOrders', label: 'Work orders', color: 'bg-teal-500' },
  { key: 'contracts', label: 'Service contracts', color: 'bg-purple-500' },
] as const

const COMPLETED_SERIES = [
  { key: 'maintenanceCompleted', label: 'Maintenance records', color: 'bg-blue-500' },
  { key: 'workOrdersCompleted', label: 'Work orders', color: 'bg-teal-500' },
] as const

interface InstrumentStats {
  id: string
  name: string
  assetTag: string | null
  maintenance: number
  repairs: number
  workOrders: number
  contracts: number
  totalSpend: number
  maintenanceCompleted: number
  workOrdersCompleted: number
  totalCompleted: number
}

function splitAmount(total: number, count: number): number[] {
  if (count <= 1) return [total]
  const cents = Math.round(total * 100)
  const base = Math.floor(cents / count)
  return Array.from({ length: count }, (_, i) => (base + (i === 0 ? cents - base * count : 0)) / 100)
}

function Legend({ series }: { series: readonly { key: string; label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
      {series.map((s) => (
        <span key={s.key} className="flex items-center gap-1.5">
          <span className={`inline-block h-2.5 w-2.5 rounded-sm ${s.color}`} />
          {s.label}
        </span>
      ))}
    </div>
  )
}

function StackedBarRow({
  stat,
  series,
  total,
  max,
  formatValue,
}: {
  stat: InstrumentStats
  series: readonly { key: string; label: string; color: string }[]
  total: number
  max: number
  formatValue: (v: number) => string
}) {
  const widthPct = max > 0 ? (total / max) * 100 : 0
  const tooltip = [
    `${stat.name}${stat.assetTag ? ` (${stat.assetTag})` : ''}`,
    ...series
      .map((s) => ({ label: s.label, value: stat[s.key as keyof InstrumentStats] as number }))
      .filter((s) => s.value > 0)
      .map((s) => `${s.label}: ${formatValue(s.value)}`),
    `Total: ${formatValue(total)}`,
  ].join('\n')

  return (
    <Link
      href={`/assets/${stat.id}`}
      title={tooltip}
      className="group flex items-center gap-3 rounded-md px-1 py-1 hover:bg-gray-50"
    >
      <div className="w-40 shrink-0 text-right">
        <p className="truncate text-xs font-medium text-gray-700 group-hover:text-blue-700">{stat.name}</p>
        {stat.assetTag && <p className="truncate text-[11px] text-gray-400">{stat.assetTag}</p>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex h-4 gap-[2px]" style={{ width: `${Math.max(widthPct, 0.5)}%` }}>
          {series.map((s) => {
            const value = stat[s.key as keyof InstrumentStats] as number
            if (value <= 0 || total <= 0) return null
            return (
              <div
                key={s.key}
                className={`${s.color} h-full first:rounded-l last:rounded-r`}
                style={{ flexGrow: value, flexBasis: 0 }}
              />
            )
          })}
        </div>
      </div>
      <div className="w-24 shrink-0 text-right text-xs font-semibold text-gray-800">{formatValue(total)}</div>
    </Link>
  )
}

export default function InstrumentReports({
  assets,
  maintenanceRecords,
  repairs,
  workOrders,
  contracts,
}: InstrumentReportsProps) {
  const [period, setPeriod] = useState<Period>('ytd')
  const [tableSort, setTableSort] = useState<'totalSpend' | 'totalCompleted'>('totalSpend')

  const stats = useMemo(() => {
    const today = new Date()
    const start =
      period === 'ytd'
        ? `${today.getFullYear()}-01-01`
        : period === '12m'
          ? new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()).toISOString().split('T')[0]
          : null
    const inPeriod = (date: string | null | undefined) => !!date && (start === null || date >= start)

    const assetById = new Map(assets.map((a) => [a.id, a]))
    const map = new Map<string, InstrumentStats>()
    const get = (assetId: string | null): InstrumentStats | null => {
      if (!assetId) return null
      const asset = assetById.get(assetId)
      if (!asset) return null
      let s = map.get(assetId)
      if (!s) {
        s = {
          id: asset.id,
          name: asset.name,
          assetTag: asset.asset_tag,
          maintenance: 0,
          repairs: 0,
          workOrders: 0,
          contracts: 0,
          totalSpend: 0,
          maintenanceCompleted: 0,
          workOrdersCompleted: 0,
          totalCompleted: 0,
        }
        map.set(assetId, s)
      }
      return s
    }

    maintenanceRecords.forEach((r) => {
      if (!inPeriod(r.performed_date)) return
      const s = get(r.asset_id)
      if (!s) return
      s.maintenance += r.cost ?? 0
      if (r.status === 'completed') s.maintenanceCompleted++
    })

    repairs.forEach((r) => {
      if (!inPeriod(r.reported_date)) return
      const s = get(r.asset_id)
      if (s) s.repairs += r.total_cost ?? 0
    })

    workOrders.forEach((w) => {
      // Same date rule as the Budgets page: when completed, else when requested.
      if (!inPeriod(w.completed_date ?? w.request_date)) return
      const s = get(w.asset_id)
      if (!s) return
      s.workOrders += w.cost ?? 0
      if (w.status === 'completed') s.workOrdersCompleted++
    })

    contracts.forEach((c) => {
      if (!c.cost || !inPeriod(c.start_date)) return
      // A contract covering several instruments has its cost split evenly across them.
      const covered = Array.from(
        new Set([
          ...(c.service_contract_assets ?? []).map((sca) => sca.asset_id),
          ...(c.asset_id ? [c.asset_id] : []),
        ])
      ).filter((id) => assetById.has(id))
      if (covered.length === 0) return
      const shares = splitAmount(c.cost, covered.length)
      covered.forEach((id, i) => {
        const s = get(id)
        if (s) s.contracts += shares[i]
      })
    })

    const list = Array.from(map.values())
    list.forEach((s) => {
      s.totalSpend = s.maintenance + s.repairs + s.workOrders + s.contracts
      s.totalCompleted = s.maintenanceCompleted + s.workOrdersCompleted
    })
    return list
  }, [assets, maintenanceRecords, repairs, workOrders, contracts, period])

  const topSpend = useMemo(
    () => stats.filter((s) => s.totalSpend > 0).sort((a, b) => b.totalSpend - a.totalSpend).slice(0, 10),
    [stats]
  )
  const topCompleted = useMemo(
    () =>
      stats
        .filter((s) => s.totalCompleted > 0)
        .sort((a, b) => b.totalCompleted - a.totalCompleted || b.totalSpend - a.totalSpend)
        .slice(0, 10),
    [stats]
  )
  const tableRows = useMemo(
    () =>
      stats
        .filter((s) => s.totalSpend > 0 || s.totalCompleted > 0)
        .sort((a, b) => b[tableSort] - a[tableSort])
        .slice(0, 25),
    [stats, tableSort]
  )

  const maxSpend = topSpend[0]?.totalSpend ?? 0
  const maxCompleted = topCompleted[0]?.totalCompleted ?? 0
  const totalSpend = stats.reduce((sum, s) => sum + s.totalSpend, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-500">
          {formatCurrency(totalSpend)} spent across {stats.filter((s) => s.totalSpend > 0).length} instrument(s).
          Spend includes maintenance, repairs, other work orders and service contracts.
        </p>
        <div className="inline-flex rounded-lg border border-gray-300 bg-white p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                period === p.key ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-700">Highest Spend Instruments (Top 10)</h2>
            <p className="text-xs text-gray-500 mt-0.5">Total cost per instrument, by source</p>
          </div>
          <Legend series={SPEND_SERIES} />
          <div className="space-y-1">
            {topSpend.map((s) => (
              <StackedBarRow
                key={s.id}
                stat={s}
                series={SPEND_SERIES}
                total={s.totalSpend}
                max={maxSpend}
                formatValue={formatCurrency}
              />
            ))}
            {topSpend.length === 0 && (
              <p className="text-sm text-gray-400">No instrument costs recorded for this period.</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-700">Most Maintenance Completed (Top 10)</h2>
            <p className="text-xs text-gray-500 mt-0.5">Completed maintenance records and work orders</p>
          </div>
          <Legend series={COMPLETED_SERIES} />
          <div className="space-y-1">
            {topCompleted.map((s) => (
              <StackedBarRow
                key={s.id}
                stat={s}
                series={COMPLETED_SERIES}
                total={s.totalCompleted}
                max={maxCompleted}
                formatValue={(v) => v.toString()}
              />
            ))}
            {topCompleted.length === 0 && (
              <p className="text-sm text-gray-400">No completed maintenance for this period.</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-gray-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Instrument Breakdown (Top 25)</h2>
          <select
            value={tableSort}
            onChange={(e) => setTableSort(e.target.value as typeof tableSort)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="totalSpend">Sort by total spend</option>
            <option value="totalCompleted">Sort by maintenance completed</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Instrument</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Maintenance</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Repairs</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Work Orders</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Contracts</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Total Spend</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Completed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {tableRows.map((s) => (
                <tr key={s.id} className="hover:bg-blue-100">
                  <td className="px-4 py-3">
                    <Link href={`/assets/${s.id}`} className="font-medium text-gray-900 hover:text-blue-700">
                      {s.name}
                    </Link>
                    {s.assetTag && <span className="ml-2 text-xs text-gray-400">{s.assetTag}</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(s.maintenance)}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(s.repairs)}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(s.workOrders)}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(s.contracts)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(s.totalSpend)}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{s.totalCompleted}</td>
                </tr>
              ))}
              {tableRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">
                    No instrument activity for this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
