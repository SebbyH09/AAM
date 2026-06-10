'use client'

import { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/Badge'
import Link from 'next/link'
import { Search, DollarSign } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

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

interface BudgetsClientProps {
  budgets: Budget[]
}

const BUDGET_TYPE_COLORS: Record<string, string> = {
  maintenance: 'bg-blue-100 text-blue-800',
  parts: 'bg-green-100 text-green-800',
  contracts: 'bg-purple-100 text-purple-800',
  capital: 'bg-orange-100 text-orange-800',
  total: 'bg-gray-100 text-gray-800',
}

const BUDGET_TYPES = ['maintenance', 'parts', 'contracts', 'capital', 'total']

export default function BudgetsClient({ budgets }: BudgetsClientProps) {
  const [search, setSearch] = useState('')
  const [yearFilter, setYearFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const years = useMemo(() => {
    const set = new Set(budgets.map((b) => b.fiscal_year.toString()))
    return Array.from(set).sort((a, b) => parseInt(b) - parseInt(a))
  }, [budgets])

  const filtered = useMemo(() => {
    return budgets.filter((b) => {
      const matchSearch =
        search === '' ||
        b.name.toLowerCase().includes(search.toLowerCase()) ||
        (b.department?.toLowerCase().includes(search.toLowerCase())) ||
        (b.assets?.name.toLowerCase().includes(search.toLowerCase()))
      const matchYear = yearFilter === '' || b.fiscal_year.toString() === yearFilter
      const matchType = typeFilter === '' || b.budget_type === typeFilter
      return matchSearch && matchYear && matchType
    })
  }, [budgets, search, yearFilter, typeFilter])

  return (
    <div className="space-y-4">
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
    </div>
  )
}
