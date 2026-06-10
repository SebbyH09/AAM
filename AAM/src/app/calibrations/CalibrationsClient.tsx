'use client'

import { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/Badge'
import Link from 'next/link'
import { Search, FlaskConical } from 'lucide-react'
import { formatDate, dueStatusBadge } from '@/lib/utils'

interface Asset {
  id: string
  name: string
  asset_tag: string | null
}

interface CalibrationRecord {
  id: string
  asset_id: string
  calibration_date: string
  next_due_date: string
  performed_by: string
  calibration_standard: string | null
  result: string
  certificate_number: string | null
  notes: string | null
  assets: Asset | null
}

interface CalibrationsClientProps {
  calibrations: CalibrationRecord[]
}

function resultColor(result: string): string {
  const map: Record<string, string> = {
    pass: 'bg-green-100 text-green-800',
    fail: 'bg-red-100 text-red-800',
    out_of_tolerance: 'bg-orange-100 text-orange-800',
    adjusted: 'bg-blue-100 text-blue-800',
  }
  return map[result] ?? 'bg-gray-100 text-gray-800'
}

export default function CalibrationsClient({ calibrations }: CalibrationsClientProps) {
  const [search, setSearch] = useState('')
  const [resultFilter, setResultFilter] = useState('')

  const filtered = useMemo(() => {
    return calibrations.filter((c) => {
      const matchSearch =
        search === '' ||
        c.assets?.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.certificate_number?.toLowerCase().includes(search.toLowerCase())) ||
        c.performed_by.toLowerCase().includes(search.toLowerCase())
      const matchResult = resultFilter === '' || c.result === resultFilter
      return matchSearch && matchResult
    })
  }, [calibrations, search, resultFilter])

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search asset, certificate..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={resultFilter}
            onChange={(e) => setResultFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Results</option>
            <option value="pass">Pass</option>
            <option value="fail">Fail</option>
            <option value="out_of_tolerance">Out of Tolerance</option>
            <option value="adjusted">Adjusted</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <FlaskConical className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-600">No calibration records found</p>
          <Link
            href="/calibrations/new"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Add Calibration Record
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Asset</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Calibration Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Next Due</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Performed By</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Standard</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Result</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Certificate #</th>
                  <th className="relative px-4 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filtered.map((cal) => {
                  const dueBadge = dueStatusBadge(cal.next_due_date)
                  return (
                    <tr key={cal.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{cal.assets?.name ?? '—'}</p>
                        {cal.assets?.asset_tag && (
                          <p className="text-xs text-gray-500">{cal.assets.asset_tag}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatDate(cal.calibration_date)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm text-gray-600">{formatDate(cal.next_due_date)}</span>
                          <Badge className={dueBadge.color}>{dueBadge.label}</Badge>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{cal.performed_by}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{cal.calibration_standard ?? '—'}</td>
                      <td className="px-4 py-3">
                        <Badge className={resultColor(cal.result)}>
                          {cal.result.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{cal.certificate_number ?? '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/calibrations/${cal.id}/edit`}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
