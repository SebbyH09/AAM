'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { formatDate, formatCurrency, statusColor, dueStatusBadge } from '@/lib/utils'
import Link from 'next/link'
import { Search, FileText, ChevronRight, Paperclip } from 'lucide-react'

interface Contract {
  id: string
  vendor_name: string
  contract_type: string
  start_date: string
  end_date: string
  cost: number | null
  status: string
  file_name: string | null
  file_url: string | null
  contract_number: string | null
  assets: { name: string; asset_tag: string | null } | null
}

interface ContractsClientProps {
  contracts: Contract[]
}

const STATUS_FILTERS = ['all', 'active', 'expired', 'pending']

export default function ContractsClient({ contracts }: ContractsClientProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = contracts.filter((c) => {
    const matchSearch =
      search === '' ||
      c.vendor_name.toLowerCase().includes(search.toLowerCase()) ||
      (c.contract_number?.toLowerCase().includes(search.toLowerCase())) ||
      (c.assets?.name?.toLowerCase().includes(search.toLowerCase()))
    const matchStatus = statusFilter === 'all' || c.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search contracts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                statusFilter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <FileText className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-600">No contracts found</p>
          <Link
            href="/contracts/new"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Add Contract
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Vendor / Asset</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Period</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Expiry</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Cost</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((contract) => {
                const badge = dueStatusBadge(contract.end_date)
                return (
                  <tr key={contract.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{contract.vendor_name}</p>
                          <p className="text-xs text-gray-500">
                            {contract.assets?.name ?? 'No asset linked'}
                            {contract.contract_number && ` • #${contract.contract_number}`}
                          </p>
                        </div>
                        {contract.file_name && (
                          <a href={contract.file_url ?? '#'} target="_blank" rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-600" title={contract.file_name}>
                            <Paperclip className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 capitalize">
                      {contract.contract_type.replace(/_/g, ' ')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(contract.start_date)} – {formatDate(contract.end_date)}
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={badge.color}>{badge.label}</Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{formatCurrency(contract.cost)}</td>
                    <td className="px-6 py-4">
                      <Badge className={statusColor(contract.status)}>{contract.status}</Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/contracts/${contract.id}/edit`}
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                      >
                        Edit <ChevronRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
