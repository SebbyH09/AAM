'use client'

import { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import Link from 'next/link'
import { Search, DollarSign, BarChart3, Table2, FileText, Wrench, ShieldCheck } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

interface Asset {
  id: string
  name: string
  asset_tag: string | null
}

interface Budget {
  id: string
  name: string
  asset_id: string | null
  department: string | null
  fiscal_year: number
  budget_type: string
  planned_amount: number
  notes: string | null
  assets: Asset | null
}

export interface SpendingRecord {
  id: string
  category: 'contracts' | 'maintenance' | 'repairs'
  description: string
  asset_name: string | null
  amount: number
  date: string
  status: string
  vendor: string | null
  fiscal_year: number
}

interface BudgetsClientProps {
  budgets: Budget[]
  spendingRecords: SpendingRecord[]
}

const BUDGET_TYPE_COLORS: Record<string, string> = {
  maintenance: 'bg-blue-100 text-blue-800',
  parts: 'bg-green-100 text-green-800',
  contracts: 'bg-purple-100 text-purple-800',
  capital: 'bg-orange-100 text-orange-800',
  total: 'bg-gray-100 text-gray-800',
}

const BUDGET_TYPES = ['maintenance', 'parts', 'contracts', 'capital', 'total']

const SPENDING_CATEGORIES = [
  {
    key: 'contracts' as const,
    label: 'Service Contracts',
    budgetType: 'contracts',
    barColor: 'bg-purple-500',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-700',
    icon: ShieldCheck,
  },
  {
    key: 'maintenance' as const,
    label: 'Maintenance',
    budgetType: 'maintenance',
    barColor: 'bg-blue-500',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-700',
    icon: Wrench,
  },
  {
    key: 'repairs' as const,
    label: 'Repairs',
    budgetType: null,
    barColor: 'bg-orange-500',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    textColor: 'text-orange-700',
    icon: FileText,
  },
]

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  expired: 'bg-red-100 text-red-800',
  pending: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  incomplete: 'bg-yellow-100 text-yellow-800',
  requires_followup: 'bg-orange-100 text-orange-800',
  open: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  waiting_parts: 'bg-orange-100 text-orange-800',
  cancelled: 'bg-gray-100 text-gray-800',
}

function UsageBar({
  actual,
  planned,
  color,
}: {
  actual: number
  planned: number
  color: string
}) {
  const pct = planned > 0 ? Math.min((actual / planned) * 100, 100) : 0
  const over = planned > 0 && actual > planned

  return (
    <div className="w-full bg-gray-100 rounded-full h-2">
      <div
        className={`${over ? 'bg-red-500' : color} h-2 rounded-full transition-all`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}


export default function BudgetsClient({ budgets, spendingRecords }: BudgetsClientProps) {
  const [search, setSearch] = useState('')
  const [yearFilter, setYearFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [chartOpen, setChartOpen] = useState(false)
  const [tableOpen, setTableOpen] = useState(false)
  const [tableCategory, setTableCategory] = useState<string>('')
  const [tableSearch, setTableSearch] = useState('')

  const currentYear = new Date().getFullYear()

  const years = useMemo(() => {
    const budgetYears = budgets.map((b) => b.fiscal_year.toString())
    const spendingYears = spendingRecords.map((r) => r.fiscal_year.toString())
    const set = new Set([...budgetYears, ...spendingYears])
    return Array.from(set).sort((a, b) => parseInt(b) - parseInt(a))
  }, [budgets, spendingRecords])

  const analysisYear = yearFilter ? parseInt(yearFilter) : currentYear

  const spendingAnalysis = useMemo(() => {
    return SPENDING_CATEGORIES.map((cat) => {
      const actual = spendingRecords
        .filter((r) => r.category === cat.key && r.fiscal_year === analysisYear)
        .reduce((sum, r) => sum + r.amount, 0)

      const planned = cat.budgetType
        ? budgets
            .filter((b) => b.fiscal_year === analysisYear && b.budget_type === cat.budgetType)
            .reduce((sum, b) => sum + b.planned_amount, 0)
        : 0

      const pct = planned > 0 ? (actual / planned) * 100 : null

      return { ...cat, actual, planned: planned > 0 ? planned : null, pct }
    })
  }, [budgets, spendingRecords, analysisYear])

  const filtered = useMemo(() => {
    return budgets.filter((b) => {
      const matchSearch =
        search === '' ||
        b.name.toLowerCase().includes(search.toLowerCase()) ||
        b.department?.toLowerCase().includes(search.toLowerCase()) ||
        b.assets?.name.toLowerCase().includes(search.toLowerCase())
      const matchYear = yearFilter === '' || b.fiscal_year.toString() === yearFilter
      const matchType = typeFilter === '' || b.budget_type === typeFilter
      return matchSearch && matchYear && matchType
    })
  }, [budgets, search, yearFilter, typeFilter])

  const tableRecords = useMemo(() => {
    return spendingRecords.filter((r) => {
      const matchYear = r.fiscal_year === analysisYear
      const matchCategory = tableCategory === '' || r.category === tableCategory
      const matchSearch =
        tableSearch === '' ||
        r.description.toLowerCase().includes(tableSearch.toLowerCase()) ||
        r.asset_name?.toLowerCase().includes(tableSearch.toLowerCase()) ||
        r.vendor?.toLowerCase().includes(tableSearch.toLowerCase())
      return matchYear && matchCategory && matchSearch
    })
  }, [spendingRecords, analysisYear, tableCategory, tableSearch])

  const chartMaxVal = useMemo(() => {
    return Math.max(
      ...spendingAnalysis.flatMap((c) => [c.actual, c.planned ?? 0]),
      1
    )
  }, [spendingAnalysis])

  return (
    <div className="space-y-6">
      {/* Filters row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search budgets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Years</option>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            {BUDGET_TYPES.map((t) => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Spending Analysis Section */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Spending Analysis</h3>
            <p className="text-sm text-gray-500">
              Actual spend vs planned budget — FY {analysisYear}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setChartOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <BarChart3 className="h-4 w-4" />
              Chart
            </button>
            <button
              onClick={() => { setTableCategory(''); setTableSearch(''); setTableOpen(true) }}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Table2 className="h-4 w-4" />
              Details
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 divide-y divide-gray-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {spendingAnalysis.map((cat) => {
            const Icon = cat.icon
            const over = cat.planned != null && cat.actual > cat.planned
            return (
              <div key={cat.key} className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${cat.bgColor}`}>
                    <Icon className={`h-4 w-4 ${cat.textColor}`} />
                  </div>
                  <span className="text-sm font-medium text-gray-700">{cat.label}</span>
                </div>

                <div>
                  <div className="flex items-end gap-1">
                    <span className={`text-2xl font-bold ${over ? 'text-red-600' : 'text-gray-900'}`}>
                      {formatCurrency(cat.actual)}
                    </span>
                    {cat.planned && (
                      <span className="text-sm text-gray-400 mb-0.5">
                        / {formatCurrency(cat.planned)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {cat.planned ? 'actual / planned' : 'actual (no budget set)'}
                  </p>
                </div>

                {cat.planned ? (
                  <div className="space-y-1">
                    <UsageBar actual={cat.actual} planned={cat.planned} color={cat.barColor} />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{cat.pct?.toFixed(0)}% used</span>
                      {over ? (
                        <span className="text-red-600 font-medium">
                          {formatCurrency(cat.actual - cat.planned)} over budget
                        </span>
                      ) : (
                        <span>{formatCurrency(cat.planned - cat.actual)} remaining</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-400 italic">Add a budget to track usage</div>
                )}

                <button
                  onClick={() => { setTableCategory(cat.key); setTableSearch(''); setTableOpen(true) }}
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  View {cat.label.toLowerCase()} detail →
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Budget Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <DollarSign className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-600">No budgets found</p>
          <Link
            href="/budgets/new"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Add Budget
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Asset / Dept</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Year</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Planned Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Notes</th>
                  <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filtered.map((budget) => (
                  <tr key={budget.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">{budget.name}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {budget.assets?.name ?? budget.department ?? '—'}
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={BUDGET_TYPE_COLORS[budget.budget_type] ?? 'bg-gray-100 text-gray-800'}>
                        {budget.budget_type}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 font-medium">{budget.fiscal_year}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                      {formatCurrency(budget.planned_amount)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                      {budget.notes ?? '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/budgets/${budget.id}/edit`}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Chart Modal */}
      <Modal open={chartOpen} onClose={() => setChartOpen(false)} title={`Spending vs Budget — FY ${analysisYear}`} size="lg">
        <div className="space-y-8">
          <p className="text-sm text-gray-500">
            Each bar shows actual spending as a portion of the planned budget. Categories without a set budget are shown relative to the total max spending.
          </p>

          {spendingAnalysis.map((cat) => {
            const over = cat.planned != null && cat.actual > cat.planned
            const pctDisplay = cat.pct != null ? cat.pct : null
            const pctColor = pctDisplay == null ? 'text-gray-400' : pctDisplay > 100 ? 'text-red-600' : pctDisplay >= 80 ? 'text-yellow-600' : 'text-green-600'
            const barWidth = cat.planned
              ? Math.min((cat.actual / cat.planned) * 100, 100)
              : chartMaxVal > 0 ? (cat.actual / chartMaxVal) * 100 : 0

            return (
              <div key={cat.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <cat.icon className={`h-4 w-4 ${cat.textColor}`} />
                    <span className="text-sm font-semibold text-gray-800">{cat.label}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-gray-500">
                      <strong className={over ? 'text-red-600' : 'text-gray-900'}>{formatCurrency(cat.actual)}</strong>
                      {cat.planned ? <span className="text-gray-400"> / {formatCurrency(cat.planned)}</span> : <span className="text-gray-400"> spent</span>}
                    </span>
                    {pctDisplay != null && (
                      <span className={`font-semibold ${pctColor}`}>{pctDisplay.toFixed(0)}%</span>
                    )}
                  </div>
                </div>

                {/* Bar: gray background = planned, colored fill = actual */}
                <div className="relative h-6 rounded-lg overflow-hidden bg-gray-100">
                  <div
                    className={`absolute inset-y-0 left-0 rounded-lg transition-all ${over ? 'bg-red-500' : cat.barColor}`}
                    style={{ width: `${barWidth}%` }}
                  />
                  {cat.planned && (
                    <div className="absolute inset-0 flex items-center px-3">
                      <span className="text-xs text-white font-medium drop-shadow-sm">
                        {over ? `${formatCurrency(cat.actual - cat.planned)} over budget` : `${formatCurrency(cat.planned - cat.actual)} remaining`}
                      </span>
                    </div>
                  )}
                </div>

                {!cat.planned && (
                  <p className="text-xs text-gray-400 italic">No planned budget — add one to track usage</p>
                )}
              </div>
            )
          })}

          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 border-t border-gray-100 pt-4">
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-green-500" /> &lt;80% used</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-yellow-500" /> 80–100%</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-red-500" /> Over budget</span>
          </div>
        </div>
      </Modal>

      {/* Detail Table Modal */}
      <Modal open={tableOpen} onClose={() => setTableOpen(false)} title={`Spending Details — FY ${analysisYear}`} size="xl">
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              value={tableCategory}
              onChange={(e) => setTableCategory(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              <option value="contracts">Service Contracts</option>
              <option value="maintenance">Maintenance</option>
              <option value="repairs">Repairs</option>
            </select>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search description, asset, or vendor..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <span className="text-sm text-gray-500 whitespace-nowrap">
              {tableRecords.length} record{tableRecords.length !== 1 ? 's' : ''}
            </span>
          </div>

          {tableRecords.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <DollarSign className="h-10 w-10 text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">No spending records found for this selection.</p>
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Description</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Asset</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Vendor</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Category</th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {tableRecords
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .map((record) => {
                        const catMeta = SPENDING_CATEGORIES.find((c) => c.key === record.category)
                        return (
                          <tr key={record.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(record.date)}</td>
                            <td className="px-4 py-3 text-gray-800 max-w-xs truncate">{record.description}</td>
                            <td className="px-4 py-3 text-gray-600">{record.asset_name ?? '—'}</td>
                            <td className="px-4 py-3 text-gray-600">{record.vendor ?? '—'}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${catMeta?.bgColor ?? ''} ${catMeta?.textColor ?? ''}`}>
                                {catMeta?.label ?? record.category}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-gray-900 whitespace-nowrap">
                              {formatCurrency(record.amount)}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[record.status] ?? 'bg-gray-100 text-gray-700'}`}>
                                {record.status.replace(/_/g, ' ')}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t border-gray-200">
                    <tr>
                      <td colSpan={5} className="px-4 py-3 text-sm font-semibold text-gray-700">Total</td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">
                        {formatCurrency(tableRecords.reduce((sum, r) => sum + r.amount, 0))}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
